import { event, invoices, people, properties, recordAudit, saveState, vendors, workOrders } from "./data.js";

export const vendorCallQuestions = [
  "Are you available for this job, and what is your earliest arrival window?",
  "What callout, diagnostic, emergency, after-hours, or minimum labor fee applies?",
  "Can you offer any property-manager, repeat-customer, or multi-unit discount?",
  "What warranty do you provide on labor and parts?",
  "Do you need tenant photos, access instructions, parking, gate code, or shutoff details before dispatch?",
  "Unless the property manager gives different instructions, can you send the invoice to the property manager, owner, and LivingRelay recordkeeping inbox?"
];

export const defaultRetryPolicy = {
  maxAttemptsPerVendor: 3,
  retryNoAnswerAfterMinutes: 10,
  holdTimeoutMinutes: 5,
  retryStatuses: ["no-answer", "busy", "failed", "canceled"],
  holdPhrases: ["on hold", "please hold", "hold music", "all representatives are busy", "your call is important"]
};

export function defaultDispatchSettings() {
  return {
    vendorOutreachMode: "manager_approval",
    autoOutreachAfterTenantConfirmed: false,
    emergencyOutreachMode: "manager_approval",
    maxVendorsToCall: 5,
    requireTenantAvailabilityBeforeBooking: true,
    productionVendorCallsEnabled: true,
    retryPolicy: defaultRetryPolicy,
    inboundInvoiceEmail: process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com",
    systemInvoiceRecipientName: "LivingRelay records",
    invoiceRecipientPolicy: "manager_owner_system",
    invoiceDeliveryInstructions: "",
    vendorPreferences: {
      Plumbing: [],
      HVAC: [],
      Electrical: [],
      Painting: [],
      General: []
    }
  };
}

export function mergeDispatchSettings(settings = {}) {
  return { ...defaultDispatchSettings(), ...settings };
}

export function classifyServiceWindow({ severity = "Normal", issue = "", access = "" }) {
  const text = `${severity} ${issue} ${access}`.toLowerCase();
  if (["gas", "smoke", "fire", "flood", "active water", "sparking", "no lock", "emergency", "asap", "urgent"].some((word) => text.includes(word))) {
    return "ASAP / emergency";
  }
  if (["next week", "this week", "sometime", "not urgent", "flexible", "when convenient"].some((word) => text.includes(word))) {
    return "Flexible within next week";
  }
  return severity === "Urgent" ? "ASAP / emergency" : "Next available";
}

export function tenantPresenceLikelyRelevant({ issue = "", trade = "", severity = "Normal" } = {}) {
  const text = `${trade} ${severity} ${issue}`.toLowerCase();
  if (["plumbing", "hvac", "electrical"].some((word) => text.includes(word))) return true;
  return [
    "appliance",
    "broken",
    "ceiling",
    "door",
    "drain",
    "faucet",
    "garage",
    "heat",
    "inside",
    "leak",
    "lock",
    "outlet",
    "pipe",
    "repair person",
    "service person",
    "sink",
    "shower",
    "technician",
    "thermostat",
    "toilet",
    "vendor",
    "water",
    "window"
  ].some((word) => text.includes(word));
}

export function buildTenantAvailability({ access = "", severity = "Normal", issue = "" }) {
  const serviceWindow = classifyServiceWindow({ severity, issue, access });
  const presenceRelevant = tenantPresenceLikelyRelevant({ issue, severity });
  return {
    serviceWindow,
    preferredWindows: extractAvailabilityWindows(access),
    accessNotes: access || "Needs tenant availability follow-up",
    presenceRelevant,
    permissionToEnter: /(?:ok|okay|permission|can enter|enter|lockbox|key)/i.test(access),
    needsFollowUp: !access || (presenceRelevant && !extractAvailabilityWindows(access).length && !/(?:permission|can enter|lockbox|key|text before entry|enter)/i.test(access)) || /needs follow-up|unknown|tbd/i.test(access),
    updatedAt: new Date().toISOString()
  };
}

export function ensureWorkOrderDispatchFields(order) {
  if (!order) return order;
  order.tenantAvailability = order.tenantAvailability || buildTenantAvailability(order);
  order.serviceWindow = order.serviceWindow || order.tenantAvailability.serviceWindow || classifyServiceWindow(order);
  order.dispatchStage = order.dispatchStage || stageForOrder(order);
  order.vendorOutreach = order.vendorOutreach || {
    status: "Not started",
    mode: "Manual",
    questions: vendorCallQuestions,
    attempts: [],
    outcomes: []
  };
  order.vendorOutreach.attempts = order.vendorOutreach.attempts || [];
  order.completionPackage = order.completionPackage || {
    status: "Not requested",
    photos: [],
    notes: "",
    invoiceDelivery: "Not received"
  };
  return order;
}

export function shouldAutoStartVendorOutreach(order, property) {
  const settings = mergeDispatchSettings(property?.dispatchSettings);
  if (settings.vendorOutreachMode !== "automatic_after_confirmed") return false;
  if (order.serviceWindow === "ASAP / emergency" && settings.emergencyOutreachMode !== "automatic") return false;
  if (settings.requireTenantAvailabilityBeforeBooking && order.tenantAvailability?.needsFollowUp) return false;
  return order.managerApproved !== false && order.ownerApproved !== false;
}

export function prepareVendorOutreach(orderId, { mode = "AI calls", actor = "manager", provider = "ElevenLabs" } = {}) {
  const order = ensureWorkOrderDispatchFields(workOrders.find((item) => item.id === orderId));
  if (!order) return { error: "work order not found" };
  const property = properties.find((item) => item.id === order.propertyId);
  const settings = mergeDispatchSettings(property?.dispatchSettings);
  const invoiceDelivery = buildInvoiceDeliveryInstructions(property, settings);
  const options = getVendorOptions(order, settings.maxVendorsToCall);
  order.vendorOutreach = {
    ...(order.vendorOutreach || {}),
    status: "Preparing",
    mode,
    provider,
    startedAt: new Date().toISOString(),
    questions: vendorCallQuestions,
    candidates: options.map((vendor) => ({
      name: vendor.name,
      phone: vendor.phone,
      trade: vendor.trade || order.trade,
      source: vendor.source || (vendor.preferred ? "Preferred vendor" : "Vendor option")
    })),
    outcomes: order.vendorOutreach?.outcomes || [],
    inboundInvoiceEmail: settings.inboundInvoiceEmail,
    invoiceRecipients: invoiceDelivery.recipients,
    invoiceDeliveryInstructions: invoiceDelivery.instructions
  };
  order.timeline.push(event("Vendor outreach prepared", `${options.length} vendor candidate(s) queued by ${actor}.`));
  saveState();
  return { order, property, settings, options };
}

export function buildInvoiceDeliveryInstructions(property, settings = mergeDispatchSettings(property?.dispatchSettings)) {
  const merged = mergeDispatchSettings(settings);
  const contacts = invoiceRecipientContacts(property, merged);
  const recipients = [
    contacts.manager,
    contacts.owner,
    contacts.system
  ].filter((recipient) => recipient?.email || recipient?.phone);
  return {
    recipients,
    instructions: merged.invoiceDeliveryInstructions || `Unless otherwise instructed, send the vendor invoice to ${formatInvoiceRecipients(recipients)}. Payment is handled directly with the property manager/owner outside LivingRelay; LivingRelay only tracks invoice delivery and paid status.`
  };
}

export function recordVendorCallResults(orderId, callResults = [], { actor = "ElevenLabs" } = {}) {
  const order = ensureWorkOrderDispatchFields(workOrders.find((item) => item.id === orderId));
  if (!order) return { error: "work order not found" };
  const outcomes = mergeOutcomes(
    order.vendorOutreach?.outcomes || [],
    callResults.map((call, index) => normalizeVendorOutcome(order, call, index))
  );
  for (const call of callResults) {
    upsertCallAttempt(order, call, {
      status: call.status || (call.success ? "completed" : "failed"),
      transcript: call.transcript,
      outcome: call.summary || call.notes || call.error || "",
      conversationId: call.conversation_id || call.conversationId,
      callSid: call.callSid || call.call_sid,
      completedAt: new Date().toISOString()
    });
  }
  order.vendorOutreach = {
    ...(order.vendorOutreach || {}),
    status: outcomes.some((outcome) => outcome.status === "Available") ? "Vendor options returned" : "Needs manager review",
    completedAt: new Date().toISOString(),
    outcomes,
    questions: vendorCallQuestions
  };
  order.timeline.push(event("Vendor outreach results captured", `${outcomes.length} vendor outcome(s) saved from ${actor}.`));
  saveState();
  return { order, outcomes };
}

export function createCallAttempt(order, vendor, details = {}) {
  ensureWorkOrderDispatchFields(order);
  const priorCount = order.vendorOutreach.attempts.filter((attempt) => sameVendorAttempt(attempt, vendor)).length;
  const attempt = {
    id: details.id || `attempt-${order.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    vendorName: vendor.name || vendor.vendorName || "Vendor",
    phone: vendor.phone,
    status: details.status || "initiated",
    attemptNumber: priorCount + 1,
    provider: details.provider || "unknown",
    callSid: details.callSid || null,
    conversationId: details.conversationId || null,
    callKey: details.callKey || null,
    startedAt: details.startedAt || new Date().toISOString(),
    answeredAt: details.answeredAt || null,
    completedAt: details.completedAt || null,
    transcript: details.transcript || [],
    outcome: details.outcome || "",
    retry: details.retry || null,
    hold: details.hold || null
  };
  order.vendorOutreach.attempts.unshift(attempt);
  return attempt;
}

export function upsertCallAttempt(order, vendorOrCall, patch = {}) {
  ensureWorkOrderDispatchFields(order);
  const attempt = findAttempt(order, vendorOrCall) || createCallAttempt(order, vendorOrCall, {
    provider: vendorOrCall.provider,
    callSid: vendorOrCall.callSid || vendorOrCall.call_sid,
    conversationId: vendorOrCall.conversation_id || vendorOrCall.conversationId,
    callKey: vendorOrCall.callKey
  });
  Object.assign(attempt, patch);
  if (patch.transcript) attempt.transcript = normalizeTranscript(patch.transcript);
  if (patch.status) attempt.status = patch.status;
  if (patch.outcome) attempt.outcome = patch.outcome;
  const hold = detectHold({
    transcript: attempt.transcript,
    summary: attempt.outcome,
    status: attempt.status
  });
  if (hold.detected) {
    attempt.hold = hold;
    attempt.status = "hold_timeout";
  }
  const retry = retryDecision(order, attempt);
  attempt.retry = retry;
  return attempt;
}

export function retryDecision(order, attempt) {
  const property = properties.find((item) => item.id === order.propertyId);
  const settings = mergeDispatchSettings(property?.dispatchSettings);
  const policy = { ...defaultRetryPolicy, ...(settings.retryPolicy || {}) };
  const retryable = policy.retryStatuses.includes(String(attempt.status || "").toLowerCase()) || attempt.status === "hold_timeout";
  if (!retryable) return { needed: false, reason: "status_not_retryable" };
  if (attempt.attemptNumber >= policy.maxAttemptsPerVendor) return { needed: false, reason: "max_attempts_reached" };
  const delayMinutes = attempt.status === "hold_timeout" ? 1 : policy.retryNoAnswerAfterMinutes;
  return {
    needed: true,
    reason: attempt.status === "hold_timeout" ? "hold_timeout" : "no_answer_or_failed",
    afterMinutes: delayMinutes,
    retryAfter: new Date(Date.now() + delayMinutes * 60 * 1000).toISOString()
  };
}

export function createDemoVendorOutreach(orderId, { actor = "manager" } = {}) {
  const prepared = prepareVendorOutreach(orderId, { mode: "Demo AI calls", actor, provider: "Demo" });
  if (prepared.error) return prepared;
  const { order, options } = prepared;
  const invoiceDelivery = buildInvoiceDeliveryInstructions(prepared.property, prepared.settings);
  const windows = order.serviceWindow === "ASAP / emergency"
    ? ["Emergency slot in 90 minutes", "Today 2-5 PM", "Tomorrow 8-10 AM"]
    : ["Tomorrow 9-11 AM", "Thursday 1-4 PM", "Flexible next week"];
  const calls = options.map((vendor, index) => ({
    vendor: vendor.name,
    phone: vendor.phone,
    success: true,
    quote: index === 0 ? "$285 callout + parts" : index === 1 ? "$225-$375" : "$150 diagnostic",
    availability: windows[index % windows.length],
    discount: index === 1 ? "10% property-manager discount on labor" : "No discount confirmed",
    warranty: index === 0 ? "30-day labor warranty; manufacturer parts warranty" : "Ask before booking",
    invoiceEmail: invoiceDelivery.instructions,
    invoiceRecipients: invoiceDelivery.recipients,
    needsPhotos: index === 2,
    status: index === 2 ? "Needs photos" : "Available"
  }));
  return recordVendorCallResults(order.id, calls, { actor: "Demo vendor outreach" });
}

export function selectVendorOutcome(orderId, outcomeId, { actor = "manager" } = {}) {
  const order = ensureWorkOrderDispatchFields(workOrders.find((item) => item.id === orderId));
  if (!order) return { error: "work order not found" };
  const outcome = order.vendorOutreach?.outcomes?.find((item) => item.id === outcomeId);
  if (!outcome) return { error: "vendor outcome not found" };
  order.vendorOutreach.outcomes = order.vendorOutreach.outcomes.map((item) => ({ ...item, selected: item.id === outcomeId }));
  order.vendorOutreach.selectedOutcomeId = outcomeId;
  order.vendorOutreach.status = "Vendor selected";
  const existingVendor = vendors.find((vendor) => vendor.phone === outcome.phone);
  if (existingVendor) {
    order.vendorId = existingVendor.id;
  } else {
    const vendor = {
      id: `v-${vendors.length + 1}`,
      name: outcome.vendorName,
      trade: order.trade,
      phone: outcome.phone,
      preferred: false,
      metadata: { source: "Vendor outreach" }
    };
    vendors.push(vendor);
    order.vendorId = vendor.id;
  }
  order.status = "Vendor coordination";
  order.dispatchStage = "tenant_timing_confirmation";
  order.timeline.push(event("Vendor outcome selected", `${actor} selected ${outcome.vendorName}: ${outcome.availability}.`));
  saveState();
  recordAudit(actor, "Selected vendor outreach outcome", `${order.id}: ${outcome.vendorName}.`);
  return { order, outcome };
}

export function recordVendorCompletion(orderId, payload = {}) {
  const order = ensureWorkOrderDispatchFields(workOrders.find((item) => item.id === orderId));
  if (!order) return { error: "work order not found" };
  const photos = [...(order.completionPackage?.photos || []), ...(payload.photos || payload.mediaItems || [])];
  order.completionPackage = {
    ...(order.completionPackage || {}),
    status: payload.status || "Received",
    notes: payload.notes || order.completionPackage?.notes || "",
    photos,
    warranty: payload.warranty || order.completionPackage?.warranty || "",
    invoiceDelivery: payload.invoiceDelivery || (payload.invoiceAmount ? "Invoice logged" : order.completionPackage?.invoiceDelivery || "Not received"),
    completedAt: payload.completedAt || new Date().toISOString()
  };
  if (payload.invoiceAmount) {
    createInvoiceFromCompletion(order, payload);
  }
  order.status = payload.closeWorkOrder ? "Closed" : "Completion review";
  order.dispatchStage = payload.closeWorkOrder ? "closed" : "completion_review";
  order.timeline.push(event("Vendor completion package received", `${photos.length} photo(s), invoice: ${order.completionPackage.invoiceDelivery}.`));
  saveState();
  return { order, completionPackage: order.completionPackage };
}

function getVendorOptions(order, limit = 5) {
  const property = properties.find((item) => item.id === order.propertyId);
  const settings = mergeDispatchSettings(property?.dispatchSettings);
  const options = order.vendorOptions?.length
    ? order.vendorOptions
    : vendors.filter((vendor) => vendor.trade === order.trade);
  return prioritizeVendors(options, settings.vendorPreferences?.[order.trade] || []).slice(0, limit || 5);
}

export function prioritizeVendors(options = [], preferredNamesOrPhones = []) {
  const preferences = preferredNamesOrPhones.map((item) => String(item).toLowerCase().trim()).filter(Boolean);
  return [...options].sort((left, right) => scoreVendor(right, preferences) - scoreVendor(left, preferences));
}

export function mergeOutcomes(existing = [], incoming = []) {
  const byKey = new Map();
  for (const outcome of [...existing, ...incoming]) {
    const key = outcome.conversationId || outcome.callSid || outcome.phone || outcome.id;
    byKey.set(key, { ...(byKey.get(key) || {}), ...outcome });
  }
  return Array.from(byKey.values());
}

export function stageForOrder(order) {
  if (order.status === "Closed") return "closed";
  if (order.completionPackage?.status === "Received") return "completion_review";
  if (order.status === "Vendor scheduled") return "vendor_booked";
  if (order.vendorOutreach?.selectedOutcomeId) return "tenant_timing_confirmation";
  if (order.vendorOutreach?.outcomes?.length) return "manager_recommendation";
  if (order.vendorOutreach?.status && order.vendorOutreach.status !== "Not started") return "vendor_calls";
  if (order.status === "Owner approval") return "owner_approval";
  if (order.status === "Manager review") return "manager_approval";
  if (order.status === "Tenant troubleshooting") return "tenant_self_fix_check";
  return "tenant_intake";
}

function scoreVendor(vendor, preferences) {
  const haystack = `${vendor.name || ""} ${vendor.phone || ""}`.toLowerCase();
  let score = vendor.preferred ? 10 : 0;
  const index = preferences.findIndex((preference) => haystack.includes(preference));
  if (index >= 0) score += 100 - index;
  return score;
}

function normalizeVendorOutcome(order, call, index) {
  const status = call.status || call.outcome || (call.success ? "Available" : "Failed");
  return {
    id: call.id || `outcome-${order.id}-${index + 1}`,
    vendorName: call.vendorName || call.vendor || `Vendor ${index + 1}`,
    phone: call.phone,
    status,
    quote: call.quote || call.estimate || (call.success ? "Quote not captured" : "No quote"),
    availability: call.availability || "Needs confirmation",
    discount: call.discount || "Not asked/captured",
    warranty: call.warranty || "Not asked/captured",
    invoiceEmail: call.invoiceEmail || call.invoiceDeliveryInstructions || call.inboundInvoiceEmail || process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com",
    invoiceRecipients: call.invoiceRecipients || [],
    needsPhotos: Boolean(call.needsPhotos || /photo/i.test(call.summary || call.error || "")),
    notes: call.notes || call.summary || call.error || "",
    selected: false,
    source: call.conversation_id || call.conversationId ? "ElevenLabs" : "Manual/demo",
    conversationId: call.conversation_id || call.conversationId || null,
    callSid: call.callSid || call.call_sid || null,
    transcript: normalizeTranscript(call.transcript || [])
  };
}

function findAttempt(order, vendorOrCall) {
  const callSid = vendorOrCall.callSid || vendorOrCall.call_sid;
  const conversationId = vendorOrCall.conversation_id || vendorOrCall.conversationId;
  const callKey = vendorOrCall.callKey;
  return order.vendorOutreach?.attempts?.find((attempt) =>
    (callSid && attempt.callSid === callSid) ||
    (conversationId && attempt.conversationId === conversationId) ||
    (callKey && attempt.callKey === callKey) ||
    (vendorOrCall.phone && attempt.phone === vendorOrCall.phone && ["initiated", "ringing", "answered"].includes(attempt.status))
  );
}

function sameVendorAttempt(attempt, vendor) {
  return attempt.phone === vendor.phone || attempt.vendorName === vendor.name || attempt.vendorName === vendor.vendorName;
}

function normalizeTranscript(transcript = []) {
  if (!Array.isArray(transcript)) return [];
  return transcript.map((turn) => ({
    speaker: turn.speaker || turn.role || turn.user || "unknown",
    text: turn.text || turn.message || turn.transcript || "",
    time: turn.time || turn.created_at || turn.timestamp || null
  })).filter((turn) => turn.text);
}

function detectHold({ transcript = [], summary = "", status = "" }) {
  const text = `${summary} ${status} ${transcript.map((turn) => turn.text).join(" ")}`.toLowerCase();
  const phrase = defaultRetryPolicy.holdPhrases.find((item) => text.includes(item));
  return {
    detected: Boolean(phrase),
    phrase: phrase || null,
    timeoutMinutes: defaultRetryPolicy.holdTimeoutMinutes,
    detectedAt: phrase ? new Date().toISOString() : null
  };
}

function invoiceRecipientContacts(property, settings) {
  const manager = people.find((person) => person.id === property?.managerId) || people.find((person) => person.id === property?.adminId);
  const owner = people.find((person) => person.id === property?.ownerId);
  return {
    manager: manager ? { role: "Property manager", name: manager.name, email: manager.email || "", phone: manager.phone || "" } : null,
    owner: owner ? { role: "Owner", name: owner.name, email: owner.email || "", phone: owner.phone || "" } : null,
    system: {
      role: "LivingRelay records",
      name: settings.systemInvoiceRecipientName || "LivingRelay records",
      email: settings.inboundInvoiceEmail || process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com",
      phone: ""
    }
  };
}

function formatInvoiceRecipients(recipients) {
  return recipients
    .map((recipient) => `${recipient.role}: ${recipient.email || recipient.phone}`)
    .join("; ");
}

function extractAvailabilityWindows(access = "") {
  const value = String(access || "").trim();
  if (!value) return [];
  const sentence = value.split(/[.!?]/).find((part) => /after|before|between|anytime|today|tomorrow|week|am|pm|\d/.test(part.toLowerCase()));
  return [sentence?.trim() || value].filter(Boolean);
}

function createInvoiceFromCompletion(order, payload) {
  if (order.invoiceId && invoices.some((invoice) => invoice.id === order.invoiceId)) return;
  const vendor = vendors.find((item) => item.id === order.vendorId);
  const property = properties.find((item) => item.id === order.propertyId);
  const invoiceDelivery = buildInvoiceDeliveryInstructions(property);
  const manager = invoiceDelivery.recipients.find((recipient) => recipient.role === "Property manager");
  const invoice = {
    id: `inv-${invoices.length + 1}`,
    propertyId: order.propertyId,
    orderId: order.id,
    vendor: payload.vendorName || vendor?.name || "Vendor",
    amount: Number(payload.invoiceAmount || 0),
    status: "Unpaid",
    paymentStatus: "Unpaid",
    paymentRail: "Vendor direct",
    recipientName: manager?.name || "Property manager",
    recipientPhone: manager?.phone || "",
    recipientEmail: manager?.email || "",
    recipients: invoiceDelivery.recipients,
    deliveryStatus: payload.invoiceDelivery || "Received through vendor completion",
    taxYear: payload.taxYear || "2026",
    receivedAt: new Date().toLocaleDateString(),
    note: payload.invoiceNote || `Vendor completion package included invoice for off-platform payment tracking. Requested invoice recipients: ${formatInvoiceRecipients(invoiceDelivery.recipients)}.`
  };
  invoices.unshift(invoice);
  order.invoiceId = invoice.id;
}
