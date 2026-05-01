const defaultOptions = [
  { name: "Carlos Plumbing", trade: "Plumbing", phone: "+13105550104", estimate: "$225-$375", availability: "Same day", reason: "Preferred vendor already configured for this property." },
  { name: "Westside Rapid Plumbing", trade: "Plumbing", phone: "+13105550188", estimate: "$250-$450", availability: "Today or tomorrow", reason: "Good fit for active leaks and sink repairs." },
  { name: "Apex Appliance & Repair", trade: "Appliance", phone: "+16265550148", estimate: "$150-$300", availability: "Next business day", reason: "Useful if the issue is appliance-adjacent." },
  { name: "Spark Right Electric", trade: "Electrical", phone: "+13105550119", estimate: "$175-$350", availability: "Tomorrow", reason: "Preferred electrical fallback if triage changes." },
  { name: "Handy General Repairs", trade: "General", phone: "+18185550164", estimate: "$125-$275", availability: "Tomorrow afternoon", reason: "General maintenance fallback." }
];

export async function findVendorOptions({ property, order, configuredVendors }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return mockVendorOptions(order, configuredVendors);
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 1400,
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 4,
            user_location: {
              type: "approximate",
              city: "Los Angeles",
              region: "California",
              country: "US",
              timezone: "America/Los_Angeles"
            }
          }
        ],
        messages: [
          {
            role: "user",
            content: `Find 5 local vendor options for this rental maintenance issue.

Property:
${property.name}
${property.address}

Issue:
Unit ${order.unit}: ${order.issue}
Trade: ${order.trade}
Urgency: ${order.severity}

Configured vendors:
${configuredVendors.map((vendor) => `- ${vendor.name}, ${vendor.trade}, ${vendor.phone}`).join("\n")}

Return strict JSON only with this shape:
{
  "options": [
    {
      "name": "vendor name",
      "trade": "trade",
      "phone": "+1...",
      "estimate": "$low-$high",
      "availability": "plain English",
      "reason": "short reason",
      "source": "website/search source if known"
    }
  ]
}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic vendor search failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    const parsed = parseJsonObject(text);
    const options = parsed?.options?.filter((option) => option.name && option.phone)?.slice(0, 5);
    return options?.length ? options : mockVendorOptions(order, configuredVendors);
  } catch (error) {
    return mockVendorOptions(order, configuredVendors).map((option) => ({
      ...option,
      reason: `${option.reason} Anthropic fallback: ${error.message}`
    }));
  }
}

function mockVendorOptions(order, configuredVendors) {
  const matching = configuredVendors
    .filter((vendor) => vendor.trade === order.trade)
    .map((vendor) => ({
      name: vendor.name,
      trade: vendor.trade,
      phone: vendor.phone,
      estimate: order.trade === "Plumbing" ? "$225-$375" : "$150-$350",
      availability: "Needs confirmation",
      reason: "Configured vendor for this property.",
      source: "LivingRelay vendor list"
    }));

  const fallbacks = defaultOptions
    .filter((option) => option.trade === order.trade || option.trade === "General" || order.trade === "General")
    .map((option) => ({ ...option, source: "Demo fallback list" }));

  const byPhone = new Map([...matching, ...fallbacks].map((option) => [option.phone, option]));
  return [...byPhone.values()].slice(0, 5);
}

function parseJsonObject(text = "") {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
}
