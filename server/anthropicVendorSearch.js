import { getGooglePlacesApiKey } from "./config.js";

const DEFAULT_VENDOR_SEARCH_LIMIT = 5;

export async function findVendorOptions({ property, order, configuredVendors }) {
  const configured = configuredVendorOptions(order, configuredVendors);
  const context = { property, order, configuredVendors: configured, limit: DEFAULT_VENDOR_SEARCH_LIMIT };
  const errors = [];

  const providers = [
    ["anthropic", searchWithAnthropic],
    ["openai", searchWithOpenAI],
    ["google_ai", searchWithGoogleAI],
    ["google_business_profile", searchWithGoogleBusinessProfile],
    ["open_web_search", searchWithOpenWebSearch]
  ];

  for (const [provider, search] of providers) {
    try {
      const options = normalizeVendorOptions(await search(context), provider, order).slice(0, DEFAULT_VENDOR_SEARCH_LIMIT);
      if (options.length) return options;
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
    }
  }

  return configured.map((option) => ({
    ...option,
    reason: errors.length ? `${option.reason} Vendor discovery fallback: ${errors.join(" | ")}` : option.reason
  }));
}

async function searchWithAnthropic(context) {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_VENDOR_SEARCH_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 1400,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 4,
          user_location: approximateUserLocation(context.property)
        }
      ],
      messages: [{ role: "user", content: vendorSearchPrompt(context, "Use web search results to identify real, local businesses.") }]
    })
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `Anthropic vendor search failed: ${response.status}`);
  const text = (data.content || []).filter((part) => part.type === "text").map((part) => part.text).join("\n").trim();
  return parseVendorOptions(text);
}

async function searchWithOpenAI(context) {
  if (!process.env.OPENAI_API_KEY) return [];
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VENDOR_SEARCH_MODEL || "gpt-5.2",
      tools: [{ type: "web_search_preview" }],
      input: vendorSearchPrompt(context, "Use web search to identify real, local businesses and rank the best fit.")
    })
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI vendor search failed: ${response.status}`);
  return parseVendorOptions(data.output_text || responseOutputText(data));
}

async function searchWithGoogleAI(context) {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return [];
  const model = process.env.GOOGLE_VENDOR_SEARCH_MODEL || "gemini-2.5-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: vendorSearchPrompt(context, "Rank the best real local businesses. Prefer candidates with verifiable phone numbers and sources.") }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `Google AI vendor search failed: ${response.status}`);
  const text = (data.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n");
  return parseVendorOptions(text);
}

async function searchWithGoogleBusinessProfile(context) {
  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) return [];
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.types,places.primaryType,places.rating,places.userRatingCount,places.businessStatus"
    },
    body: JSON.stringify({
      textQuery: [tradeSearchTerm(context.order.trade), context.order.issue, context.property?.address ? `near ${context.property.address}` : ""].filter(Boolean).join(" "),
      maxResultCount: context.limit || DEFAULT_VENDOR_SEARCH_LIMIT,
      regionCode: "US"
    })
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error?.message || `Google Places vendor search failed: ${response.status}`);
  return (data.places || []).map((place) => ({
    name: place.displayName?.text || "",
    trade: inferTradeFromGoogleTypes(place.types || [], context.order.trade || "General"),
    phone: normalizePhone(place.nationalPhoneNumber || place.internationalPhoneNumber || ""),
    estimate: estimateForTrade(context.order.trade),
    availability: "Call to confirm",
    reason: googlePlaceReason(place),
    source: "Google Business Profile",
    websiteUri: place.websiteUri || "",
    address: place.formattedAddress || "",
    placeId: place.id || ""
  }));
}

async function searchWithOpenWebSearch(context) {
  const endpoint = process.env.OPEN_WEB_SEARCH_API_URL || process.env.WEB_SEARCH_API_URL || "";
  if (!endpoint) return [];
  const apiKey = process.env.OPEN_WEB_SEARCH_API_KEY || process.env.WEB_SEARCH_API_KEY || "";
  const url = new URL(endpoint);
  url.searchParams.set(process.env.OPEN_WEB_SEARCH_QUERY_PARAM || "q", [tradeSearchTerm(context.order.trade), context.order.issue, context.property?.address].filter(Boolean).join(" "));
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}`, "x-api-key": apiKey } : {})
    }
  });
  const data = await safeJson(response);
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `Open web search failed: ${response.status}`);
  return extractWebSearchResults(data).map((result) => ({
    name: cleanBusinessName(result.title || result.name || ""),
    trade: context.order.trade || "General",
    phone: normalizePhone(extractPhone(`${result.title || ""} ${result.snippet || ""} ${result.description || ""}`)),
    estimate: estimateForTrade(context.order.trade),
    availability: "Call to confirm",
    reason: result.snippet || result.description || "Open web search result.",
    source: result.url || result.link || "Open web search"
  }));
}

function vendorSearchPrompt({ property, order, configuredVendors, limit }, instruction) {
  return `Find and rank ${limit || DEFAULT_VENDOR_SEARCH_LIMIT} real local vendors for this rental maintenance issue.

${instruction}

Property:
${property?.name || ""}
${property?.address || ""}

Issue:
Unit ${order?.unit || ""}: ${order?.issue || ""}
Trade: ${order?.trade || ""}
Urgency: ${order?.severity || ""}
Tenant access: ${order?.access || order?.tenantAvailability?.accessNotes || "Needs confirmation"}

Configured vendors:
${configuredVendors.map((vendor) => `- ${vendor.name}, ${vendor.trade}, ${vendor.phone || "no phone"}, ${vendor.source}`).join("\n") || "- none"}

Choose vendors based on fit for the exact issue, distance/service area, business legitimacy, phone availability, likely speed, and any configured preference. Do not invent businesses or phone numbers. If a phone number is not verifiable, omit the phone and explain the source.

Return strict JSON only:
{
  "options": [
    {
      "name": "business name",
      "trade": "trade",
      "phone": "+1...",
      "estimate": "$low-$high or Call to confirm",
      "availability": "plain English",
      "reason": "why this is the best fit",
      "source": "website/search/business profile source"
    }
  ]
}`;
}

function configuredVendorOptions(order, configuredVendors) {
  return configuredVendors
    .filter((vendor) => vendor.trade === order.trade)
    .map((vendor) => ({
      name: vendor.name,
      trade: vendor.trade,
      phone: vendor.phone,
      estimate: estimateForTrade(order.trade),
      availability: "Needs confirmation",
      reason: "Configured vendor for this property; not web-verified in this run.",
      source: "Configured vendor list"
    }))
    .slice(0, DEFAULT_VENDOR_SEARCH_LIMIT);
}

function normalizeVendorOptions(options = [], provider, order) {
  const byKey = new Map();
  for (const option of options || []) {
    const name = String(option.name || "").trim();
    if (!name) continue;
    const phone = normalizePhone(option.phone || "");
    const key = phone || name.toLowerCase();
    if (!key) continue;
    byKey.set(key, {
      name,
      trade: option.trade || order.trade || "General",
      phone,
      estimate: option.estimate || estimateForTrade(order.trade),
      availability: option.availability || "Call to confirm",
      reason: option.reason || `Selected by ${provider}.`,
      source: option.source || provider,
      websiteUri: option.websiteUri || "",
      address: option.address || "",
      placeId: option.placeId || "",
      discoveryProvider: provider
    });
  }
  return [...byKey.values()];
}

function parseVendorOptions(text = "") {
  const parsed = parseJsonObject(text);
  return Array.isArray(parsed) ? parsed : parsed?.options || [];
}

function parseJsonObject(text = "") {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function responseOutputText(data = {}) {
  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("\n");
}

function approximateUserLocation(property = {}) {
  const address = String(property?.address || "");
  const cityState = address.match(/,\s*([^,]+),\s*([A-Z]{2})\b/);
  return {
    type: "approximate",
    city: cityState?.[1]?.trim() || "Los Angeles",
    region: cityState?.[2]?.trim() || "California",
    country: "US",
    timezone: "America/Los_Angeles"
  };
}

function tradeSearchTerm(trade = "General") {
  const terms = {
    Plumbing: "plumber",
    HVAC: "HVAC repair",
    Electrical: "electrician",
    Appliance: "appliance repair",
    Painting: "painter",
    Roofing: "roofer",
    Landscaping: "landscaper",
    Cleaning: "cleaning service",
    General: "handyman"
  };
  return terms[trade] || `${trade} repair`;
}

function estimateForTrade(trade = "General") {
  if (trade === "Plumbing") return "$225-$450";
  if (trade === "HVAC") return "$150-$600";
  if (trade === "Electrical") return "$175-$500";
  if (trade === "Appliance") return "$125-$350";
  return "$125-$350";
}

function inferTradeFromGoogleTypes(types = [], fallback = "General") {
  const text = types.join(" ").toLowerCase();
  if (text.includes("plumber")) return "Plumbing";
  if (text.includes("hvac") || text.includes("air_conditioning") || text.includes("heating")) return "HVAC";
  if (text.includes("electrician")) return "Electrical";
  if (text.includes("roof")) return "Roofing";
  if (text.includes("painter")) return "Painting";
  if (text.includes("landscap")) return "Landscaping";
  if (text.includes("clean")) return "Cleaning";
  if (text.includes("appliance")) return "Appliance";
  return fallback || "General";
}

function googlePlaceReason(place = {}) {
  const rating = place.rating ? `${place.rating} stars` : "";
  const count = place.userRatingCount ? `${place.userRatingCount} reviews` : "";
  const status = place.businessStatus ? `status ${place.businessStatus}` : "";
  return ["Google Business Profile match", rating, count, status].filter(Boolean).join("; ");
}

function extractWebSearchResults(data = {}) {
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.webPages?.value)) return data.webPages.value;
  if (Array.isArray(data.organic_results)) return data.organic_results;
  return [];
}

function normalizePhone(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return String(value || "").startsWith("+") ? String(value) : `+${digits}`;
}

function extractPhone(text = "") {
  return (String(text).match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/) || [])[0] || "";
}

function cleanBusinessName(title = "") {
  return String(title).split("|")[0].split("-")[0].trim();
}
