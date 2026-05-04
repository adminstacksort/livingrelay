const targetMarkets = ["San Francisco", "Oakland", "San Jose", "Los Angeles", "San Diego"];

export async function generateProspectingLeads({
  market = "San Francisco",
  limit = 12,
  existingLeads = []
} = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for automated prospecting.");
  }
  const selectedMarket = normalizeMarket(market);
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 3000,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 8,
          user_location: {
            type: "approximate",
            city: selectedMarket === "All" ? "San Francisco" : selectedMarket,
            region: "California",
            country: "US",
            timezone: "America/Los_Angeles"
          }
        }
      ],
      messages: [
        {
          role: "user",
          content: prospectingPrompt({ market: selectedMarket, limit, existingLeads })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Prospecting research failed: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content
    ?.filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
  const parsed = parseJsonObject(text);
  const leads = Array.isArray(parsed?.leads) ? parsed.leads : [];
  return {
    market: selectedMarket,
    searchedAt: new Date().toISOString(),
    sourceCount: Number(parsed?.sourceCount || 0),
    leads: leads
      .filter((lead) => lead?.name && (lead.email || lead.phone || lead.website || lead.listingUrl))
      .slice(0, limit)
  };
}

export async function* generateProspectingLeadBatches({
  market = "San Francisco",
  limit = 12,
  existingLeads = [],
  batchSize = 4
} = {}) {
  const selectedMarket = normalizeMarket(market);
  const safeLimit = Math.max(1, Math.min(Number(limit || 12), 25));
  const batches = Math.ceil(safeLimit / batchSize);
  const seen = [...existingLeads];
  for (let index = 0; index < batches; index += 1) {
    const remaining = safeLimit - index * batchSize;
    const batchLimit = Math.min(batchSize, remaining);
    yield { type: "progress", message: `Searching ${selectedMarket}, batch ${index + 1}/${batches}...`, batch: index + 1, batches };
    const research = await generateProspectingLeads({
      market: selectedMarket,
      limit: batchLimit,
      existingLeads: seen
    });
    seen.push(...research.leads);
    yield {
      type: "batch",
      market: research.market,
      searchedAt: research.searchedAt,
      sourceCount: research.sourceCount,
      leads: research.leads,
      batch: index + 1,
      batches
    };
    if (research.leads.length === 0) break;
  }
}

function prospectingPrompt({ market, limit, existingLeads }) {
  const markets = market === "All" ? targetMarkets : [market];
  const existing = existingLeads.slice(0, 80).map((lead) => ({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    website: lead.website,
    listingUrl: lead.listingUrl,
    market: lead.market
  }));
  return `Find qualified LivingRelay prospecting leads.

Product fit:
LivingRelay helps small rental owners, property managers, and apartment operators handle tenant maintenance intake, triage, owner approvals, vendor coordination, updates, invoices, and repair records.

Target markets:
${markets.map((item) => `- ${item}`).join("\n")}

Prioritize San Francisco if it is in the target list. Otherwise focus on the requested city. Look beyond property management company directories: include small/solo operators, owner-managed rentals, by-owner rental listings, small multifamily owners, ADU/in-law unit operators, duplex/triplex/fourplex owners, and independent landlords when their rental-operation contact details are intentionally public.

Batch mix:
- Do not return only property management companies unless no other qualified public leads are available.
- Strong preference: aim for at least ~70% of the batch to be "Small owner" or "Small landlord" leads when public sources support it.
- Prioritize *individual landlord / owner-operator* leads that include intentionally public rental-operation contact info (email/phone) directly on a listing, leasing page, business profile, or rental-operation directory.
- Favor solo/by-owner situations with clear maintenance coordination pain: direct owner phone/email, multiple units, small apartment building, duplex/triplex/fourplex, out-of-area owner context, recurring tenant contact point, or public listing language about repairs/maintenance.
- Use "Apartment rental" for building/leasing-office leads that are not clearly third-party management companies.
- Use "Property manager" only for firms or teams primarily advertising third-party management services.

Lead context requirements:
- sourceName must name the exact site, directory, company page, or listing where the lead was found.
- rentalAddress and unitCount should capture any public portfolio detail: building address, neighborhood, property type, managed units, managed buildings, or portfolio size.
- fit must explain the likely LivingRelay use case, such as tenant maintenance intake, vendor coordination, owner approvals, repair records, invoice routing, or multi-property support.
- notes must include short provenance: what the public source said about the properties they manage, maintenance/vendor responsibilities, and why the lead looks useful.
- Do not leave fit or notes generic. If public portfolio details are missing, say what was publicly confirmed instead.
- Avoid directory-only leads that do not expose any direct public rental-operation contact method (email/phone/website). If the only public info is “contact form” without any other identifier, deprioritize it.

Compliance rules:
- Only collect intentionally public business/rental-operation contact info.
- Do not collect private homeowner details unless clearly published as part of a rental/business listing.
- For small owner/by-owner leads, only use contact info published on a rental listing, leasing page, apartment site, business profile, or rental-operation directory. Do not infer or scrape personal residential contact details.
- Skip tenant-only contacts, no-solicitation pages, do-not-contact listings, and leads without a public source URL.
- Every lead must include website or listingUrl.
- Prefer quality over volume.

Avoid duplicates similar to these existing leads:
${JSON.stringify(existing, null, 2)}

Return strict JSON only:
{
  "sourceCount": 0,
  "leads": [
    {
      "name": "Business or rental operator name",
      "segment": "Property manager | Apartment rental | Small landlord | Small owner",
      "priority": "High | Medium | Low",
      "status": "Ready to contact",
      "fit": "Why this lead is likely to need LivingRelay",
      "contactName": "public contact name if available",
      "contactRole": "role if available",
      "email": "public email if available",
      "phone": "public phone if available",
      "website": "public website URL if available",
      "listingUrl": "source listing URL if available",
      "sourceName": "site or directory name",
      "rentalAddress": "public rental/property address if available",
      "market": "one of: ${targetMarkets.join(", ")}",
      "unitCount": "public unit/portfolio size if available",
      "notes": "short provenance note with exact source context"
    }
  ]
}

Return exactly ${limit} leads if enough qualified leads are available.`;
}

function normalizeMarket(value = "San Francisco") {
  const text = String(value || "").trim();
  if (!text || text === "All") return text || "San Francisco";
  const match = targetMarkets.find((market) => market.toLowerCase() === text.toLowerCase());
  return match || "San Francisco";
}

function parseJsonObject(text = "") {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}
