import { event, people, properties, recordAudit, saveState, workOrders } from "./data.js";
import { createMediaRelayToken } from "./mediaRelay.js";
import { callManagerForListenIn, redirectLiveCall } from "./twilioClient.js";

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
    callKey: call.callKey || null,
    status: call.success ? "Live" : "Failed",
    mode: call.success ? "AI handling" : "Needs manager",
    canMonitor: call.success === true,
    canTakeOver: call.success === true,
    listenInAvailable: call.provider === "twilio_register",
    joinUrl: call.provider === "twilio_register" ? buildManagerJoinUrl(order.id, `call-${order.id}-${index + 1}`) : null,
    monitorUrl: buildMonitorUrl(call),
    browserListenUrl: call.provider === "twilio_register" ? buildBrowserListenUrl(order.id, call.callKey || `call-${order.id}-${index + 1}`) : null,
    mediaStreamUrl: call.mediaStreamUrl || null,
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
  const actor = people.find((person) => person.id === actorId) || people.find((person) => person.role === "Manager");

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

export async function dialManagerIntoCall(orderId, callId, actorId) {
  const { order, call } = findCall(orderId, callId);
  if (!order || !call) return { error: "call not found" };
  const actor = people.find((person) => person.id === actorId) || people.find((person) => person.role === "Manager");
  if (!actor?.phone) return { error: "manager phone not found" };
  if (!call.listenInAvailable) {
    call.mode = "Listen-in unavailable";
    call.listener = {
      name: actor?.name || "Manager",
      phone: actor?.phone || null,
      requestedAt: new Date().toISOString(),
      note: "This call was not started through Twilio register-call."
    };
    saveState();
    return { order, call, error: "listen-in requires Twilio-owned register-call mode" };
  }
  const baseUrl = process.env.APP_PUBLIC_URL || "http://127.0.0.1:8787";
  const join = await callManagerForListenIn({
    to: actor.phone,
    twimlUrl: `${baseUrl}/api/twilio/manager-listen?orderId=${encodeURIComponent(orderId)}&callId=${encodeURIComponent(callId)}`,
    statusCallback: `${baseUrl}/api/twilio/voice-status?orderId=${encodeURIComponent(orderId)}&callId=${encodeURIComponent(callId)}&manager=1`
  });
  call.mode = "Manager join dialed";
  call.listener = {
    name: actor.name,
    phone: actor.phone,
    joinedCallSid: join.sid,
    requestedAt: new Date().toISOString(),
    note: "Manager was dialed for listen-in/coordinator join."
  };
  order.timeline.push(event("Manager listen-in dialed", `${actor.name} was called to join ${call.vendorName}.`));
  saveState();
  recordAudit(actor.name, "Dialed manager into vendor call", `${order.id}: ${call.vendorName}.`);
  return { order, call, join };
}

export async function takeOverCall(orderId, callId, actorId) {
  const { order, call } = findCall(orderId, callId);
  if (!order || !call) return { error: "call not found" };
  const actor = people.find((person) => person.id === actorId) || people.find((person) => person.role === "Manager");
  if (!actor?.phone) return { error: "manager phone not found" };
  if (!call.listenInAvailable || !call.callSid) {
    call.mode = "Takeover unavailable";
    call.takeover = {
      name: actor.name,
      phone: actor.phone,
      requestedAt: new Date().toISOString(),
      method: "Unavailable",
      note: "Human takeover requires a Twilio-owned live call."
    };
    saveState();
    return { order, call, error: "takeover requires Twilio-owned live call" };
  }

  const baseUrl = process.env.APP_PUBLIC_URL || "http://127.0.0.1:8787";
  const conferenceName = takeoverConferenceName(orderId, callId);
  const vendorTwimlUrl = `${baseUrl}/api/twilio/takeover-conference?orderId=${encodeURIComponent(orderId)}&callId=${encodeURIComponent(callId)}&role=vendor&conference=${encodeURIComponent(conferenceName)}`;
  const managerTwimlUrl = `${baseUrl}/api/twilio/takeover-conference?orderId=${encodeURIComponent(orderId)}&callId=${encodeURIComponent(callId)}&role=manager&conference=${encodeURIComponent(conferenceName)}`;

  call.mode = "Human takeover connecting";
  call.status = "Takeover connecting";
  call.takeover = {
    name: actor.name,
    phone: actor.phone,
    requestedAt: new Date().toISOString(),
    method: "Twilio conference takeover",
    conferenceName
  };
  saveState();

  const redirected = await redirectLiveCall({
    callSid: call.callSid,
    twimlUrl: vendorTwimlUrl
  });
  const managerJoin = await callManagerForListenIn({
    to: actor.phone,
    twimlUrl: managerTwimlUrl,
    statusCallback: `${baseUrl}/api/twilio/voice-status?orderId=${encodeURIComponent(orderId)}&callId=${encodeURIComponent(callId)}&manager=1&takeover=1`
  });

  call.mode = "Human takeover active";
  call.status = "Manager takeover";
  call.takeover = {
    ...call.takeover,
    vendorRedirectedCallSid: redirected.sid,
    vendorRedirectStatus: redirected.status,
    managerCallSid: managerJoin.sid,
    managerCallStatus: managerJoin.status,
    connectedAt: new Date().toISOString()
  };
  call.transcript = [
    ...(call.transcript || []),
    { speaker: "LivingRelay", text: `${call.takeover.name} is taking over this call.`, stamp: new Date().toISOString() }
  ];
  order.timeline.push(event("Human takeover started", `${call.takeover.name} was dialed into a live conference with ${call.vendorName}.`));
  saveState();
  recordAudit(call.takeover.name, "Started vendor call takeover", `${order.id}: ${call.vendorName}.`);
  return { order, call, redirected, managerJoin };
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

function buildManagerJoinUrl(orderId, callId) {
  const baseUrl = process.env.APP_PUBLIC_URL || "http://127.0.0.1:8787";
  return `${baseUrl}/api/twilio/manager-listen?orderId=${encodeURIComponent(orderId)}&callId=${encodeURIComponent(callId)}`;
}

function buildBrowserListenUrl(orderId, callKey) {
  const baseUrl = process.env.APP_PUBLIC_URL || "http://127.0.0.1:8787";
  const wsBase = baseUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
  const token = createMediaRelayToken({ orderId, callKey, role: "listener" });
  return `${wsBase}/api/media/listen?orderId=${encodeURIComponent(orderId)}&callKey=${encodeURIComponent(callKey)}&token=${encodeURIComponent(token)}`;
}

function takeoverConferenceName(orderId, callId) {
  return `livingrelay-${orderId}-${callId}`.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 128);
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
