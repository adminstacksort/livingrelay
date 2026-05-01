import { event, recordAudit, saveState, vendors, workOrders } from "./data.js";

const demoResponses = [
  { availability: "Today 2-5 PM", quote: "$285 callout + parts", confidence: "High", outcome: "Available" },
  { availability: "Tomorrow 9-11 AM", quote: "$225-$375", confidence: "Medium", outcome: "Available" },
  { availability: "Can review photos first", quote: "$150 diagnostic", confidence: "Medium", outcome: "Needs photos" },
  { availability: "No availability until next week", quote: "No quote", confidence: "Low", outcome: "Declined" },
  { availability: "Emergency slot in 90 minutes", quote: "$425 emergency rate", confidence: "High", outcome: "Available" }
];

export function simulateVendorOutreach(orderId) {
  const order = workOrders.find((item) => item.id === orderId);
  if (!order) return { error: "work order not found" };

  const options = order.vendorOptions?.length
    ? order.vendorOptions
    : vendors.filter((vendor) => vendor.trade === order.trade).map((vendor) => ({
      name: vendor.name,
      phone: vendor.phone,
      estimate: `$${order.estimate}`,
      availability: "Needs confirmation",
      reason: "Configured vendor"
    }));

  const outcomes = options.slice(0, 5).map((option, index) => ({
    id: `quote-${order.id}-${index + 1}`,
    vendorName: option.name,
    phone: option.phone,
    originalEstimate: option.estimate,
    source: option.source || "Demo mode",
    ...demoResponses[index % demoResponses.length],
    notes: buildNote(option, demoResponses[index % demoResponses.length])
  }));

  order.demoOutreach = {
    status: "Completed",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    outcomes
  };
  order.status = "Vendor quotes received";
  order.timeline.push(event("Demo vendor outreach completed", `${outcomes.length} simulated vendor outcomes returned.`));
  saveState();
  recordAudit("demo", "Simulated vendor outreach", `${order.id}: ${outcomes.length} outcomes.`);
  return { order, outcomes };
}

export function selectDemoQuote(orderId, quoteId) {
  const order = workOrders.find((item) => item.id === orderId);
  const quote = order?.demoOutreach?.outcomes?.find((item) => item.id === quoteId);
  if (!order || !quote) return { error: "quote not found" };

  const existingVendor = vendors.find((vendor) => vendor.phone === quote.phone);
  if (existingVendor) {
    order.vendorId = existingVendor.id;
  } else {
    const vendor = {
      id: `v-${vendors.length + 1}`,
      name: quote.vendorName,
      trade: order.trade,
      phone: quote.phone,
      preferred: false
    };
    vendors.push(vendor);
    order.vendorId = vendor.id;
  }

  order.selectedQuoteId = quote.id;
  order.status = "Vendor selected";
  order.timeline.push(event("Manager selected demo quote", `${quote.vendorName}: ${quote.quote}, ${quote.availability}.`));
  saveState();
  recordAudit("manager", "Selected vendor quote", `${order.id}: ${quote.vendorName}.`);
  return { order, quote };
}

export function runFullFlowDemo(orderId) {
  const outreach = simulateVendorOutreach(orderId);
  if (outreach.error) return outreach;

  const firstAvailable = outreach.outcomes.find((quote) => quote.outcome === "Available") || outreach.outcomes[0];
  const selected = selectDemoQuote(orderId, firstAvailable.id);
  if (selected.error) return selected;

  const order = selected.order;
  order.managerApproved = true;
  order.ownerApproved = true;
  order.status = "Demo completed";
  order.demoFlow = [
    { persona: "Tenant", action: "Texted issue", detail: order.issue },
    { persona: "LivingRelay", action: "Parsed and triaged", detail: `${order.severity} ${order.trade}, estimate $${order.estimate}` },
    { persona: "Admin / manager", action: "Received options", detail: `${outreach.outcomes.length} vendors reviewed` },
    { persona: "Owner", action: "Approved spend", detail: `Approved estimated repair for Unit ${order.unit}` },
    { persona: "Vendor", action: "Provided quote", detail: `${firstAvailable.vendorName}: ${firstAvailable.quote}, ${firstAvailable.availability}` },
    { persona: "Admin / manager", action: "Selected vendor", detail: firstAvailable.vendorName },
    { persona: "Tenant", action: "Received update", detail: `Vendor selected; scheduling next` },
    { persona: "Owner", action: "Invoice ready", detail: "Invoice stored for off-platform payment and tax bundle" }
  ];
  order.timeline.push(event("Full demo flow completed", "Tenant, manager, owner, vendor, invoice, and audit path simulated."));
  saveState();
  recordAudit("demo", "Ran full flow demo", order.id);
  return { order, demoFlow: order.demoFlow };
}

function buildNote(option, response) {
  if (response.outcome === "Declined") return `${option.name} cannot take this job soon enough.`;
  if (response.outcome === "Needs photos") return `${option.name} requested photos before confirming dispatch.`;
  return `${option.name} can likely take the job. Manager should confirm before dispatch.`;
}
