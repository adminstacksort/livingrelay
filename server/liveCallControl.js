import { event, people, properties, recordAudit, saveState, workOrders } from "./data.js";

export function getLiveCalls(orderId) {
  const order = workOrders.find((item) => item.id === orderId);
  if (!order) return { error: "work order not found" };
  return { orderId, calls: order.vendorCalls || [] };
}

export function createVendorCallSessions(order, outcomes = []) {
  const property = properties.find((item) => item.id === order.propertyId);
  order.vendorCalls = outcomes.slice(0, 5).map((outcome, index) => ({
    id: `call-${order.id}-${index + 1}`,
    vendorName: outcome.vendorName || outcome.vendor || `Vendor ${index + 1}`,
    phone: outcome.phone,
    status: index === 0 ? "Live" : index === 1 ? "Ringing" : "Queued",
    mode: "AI handling",
    canMonitor: true,
    canTakeOver: true,
    monitorUrl: buildMonitorUrl(outcome),
    conversationId: outcome.conversation_id || outcome.conversationId || null,
    callSid: outcome.callSid || outcome.call_sid || null,
    startedAt: new Date().toISOString(),
    lastTranscriptAt: new Date().toISOString(),
    summary: buildCallSummary(order, outcome),
    transcript: buildDemoTranscript(order, property, outcome)
  }));
  saveState();
  return order.vendorCalls;
}

export function attachOutboundCallSessions(order, callResults = []) {
  order.vendorCalls = callResults.map((call, index) => ({
    id: `call-${order.id}-${index + 1}`,
    vendorName: call.vendor,
    phone: call.phone,
    status: call.success ? "Live" : "Failed",
    mode: call.success ? "AI handling" : "Needs manager",
    canMonitor: call.success === true,
    canTakeOver: call.success === true,
    monitorUrl: buildMonitorUrl(call),
    conversationId: call.conversation_id || call.conversationId || null,
    callSid: call.callSid || call.call_sid || null,
    startedAt: new Date().toISOString(),
    lastTranscriptAt: new Date().toISOString(),
    summary: call.success ? "ElevenLabs outbound call started." : call.error,
    transcript: call.success ? buildDemoTranscript(order, null, call) : []
  }));
  saveState();
  return order.vendorCalls;
}

export function listenToCall(orderId, callId, actorId) {
  const { order, call } = findCall(orderId, callId);
  if (!order || !call) return { error: "call not found" };
  const actor = people.find((person) => person.id === actorId) || people.find((person) => person.role === "Admin");

  call.mode = "Manager listening";
  call.listener = {
    name: actor?.name || "Manager",
    phone: actor?.phone || null,
    joinedAt: new Date().toISOString()
  };
  order.timeline.push(event("Manager listening to vendor call", `${call.listener.name} joined ${call.vendorName}.`));
  saveState();
  recordAudit(call.listener.name, "Started listening to vendor call", `${order.id}: ${call.vendorName}.`);
  return { order, call, monitorUrl: call.monitorUrl };
}

export function takeOverCall(orderId, callId, actorId) {
  const { order, call } = findCall(orderId, callId);
  if (!order || !call) return { error: "call not found" };
  const actor = people.find((person) => person.id === actorId) || people.find((person) => person.role === "Admin");

  call.mode = "Human takeover requested";
  call.status = "Transfer requested";
  call.takeover = {
    name: actor?.name || "Manager",
    phone: actor?.phone || null,
    requestedAt: new Date().toISOString(),
    method: call.conversationId ? "ElevenLabs monitor command or transfer_to_number" : "Demo transfer"
  };
  call.transcript = [
    ...(call.transcript || []),
    { speaker: "LivingRelay", text: `${call.takeover.name} is taking over this call.`, stamp: new Date().toISOString() }
  ];
  order.timeline.push(event("Human takeover requested", `${call.takeover.name} requested takeover for ${call.vendorName}.`));
  saveState();
  recordAudit(call.takeover.name, "Requested vendor call takeover", `${order.id}: ${call.vendorName}.`);
  return { order, call };
}

function findCall(orderId, callId) {
  const order = workOrders.find((item) => item.id === orderId);
  const call = order?.vendorCalls?.find((item) => item.id === callId);
  return { order, call };
}

function buildMonitorUrl(call) {
  const conversationId = call.conversation_id || call.conversationId;
  if (!conversationId) return null;
  return `wss://api.elevenlabs.io/v1/convai/conversations/${conversationId}/monitor`;
}

function buildCallSummary(order, outcome) {
  if (outcome.outcome === "Declined") return `${outcome.vendorName} does not have useful availability.`;
  if (outcome.outcome === "Needs photos") return `${outcome.vendorName} wants photos before committing.`;
  return `${outcome.vendorName} is discussing availability and quote for ${order.id}.`;
}

function buildDemoTranscript(order, property, call) {
  const vendorName = call.vendorName || call.vendor || "Vendor";
  return [
    { speaker: "AI agent", text: `Hi, this is LivingRelay calling about ${order.trade.toLowerCase()} work order ${order.id} at ${property?.name || "the property"}.`, stamp: new Date().toISOString() },
    { speaker: vendorName, text: "I can help. What is the issue and access window?", stamp: new Date().toISOString() },
    { speaker: "AI agent", text: `${order.issue} Access notes: ${order.access || "needs confirmation"}.`, stamp: new Date().toISOString() },
    { speaker: vendorName, text: call.quote ? `Likely ${call.quote}; ${call.availability}.` : "Let me check availability and pricing.", stamp: new Date().toISOString() }
  ];
}
