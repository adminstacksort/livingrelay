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

Prioritize San Francisco if it is in the target list. Otherwise focus on the requested city. Look for public rental-business contacts from apartment rental sites, property management directories, leasing pages, and small multifamily or single-family rental operators.

Compliance rules:
- Only collect intentionally public business/rental-operation contact info.
- Do not collect private homeowner details unless clearly published as part of a rental/business listing.
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

Return at most ${limit} leads.`;
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
