import { event, people, properties, recordAudit, saveState, workOrders } from "./data.js";
import { createMediaRelayToken } from "./mediaRelay.js";
import { callManagerForListenIn, redirectLiveCall } from "./twilioClient.js";
import { upsertCallAttempt } from "./vendorWorkflow.js";
import { WebSocket } from "ws";

const transcriptMonitors = new Map();
const TWILIO_TERMINAL_STATUSES = new Set(["completed", "busy", "failed", "no-answer", "canceled", "cancelled"]);

export function getLiveCalls(orderId) {
  const order = workOrders.find((item) => item.id === orderId);
  if (!order) return { error: "work order not found" };
  return { orderId, calls: order.vendorCalls || [] };
}

export function isTerminalTwilioCallStatus(status = "") {
  return TWILIO_TERMINAL_STATUSES.has(String(status || "").toLowerCase());
}

export function displayStatusForTwilioCallStatus(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "completed") return "Completed";
  if (normalized === "busy") return "Busy";
  if (normalized === "no-answer") return "No answer";
  if (normalized === "canceled" || normalized === "cancelled") return "Canceled";
  if (normalized === "failed") return "Failed";
  return status || "Completed";
}

export function callNeedsHangupOutcome(call = {}) {
  if (!call) return false;
  const terminal = isTerminalTwilioCallStatus(call.twilioStatus);
  if (!terminal || String(call.twilioStatus || "").toLowerCase() !== "completed") return false;
  if (call.outcomeCaptured || call.selectedOutcomeId) return false;
  const vendorText = (call.transcript || [])
    .filter((line) => !/ai agent|livingrelay/i.test(line.speaker || ""))
    .map((line) => line.text || "")
    .join(" ");
  const summary = `${call.summary || ""} ${vendorText}`.toLowerCase();
  return !/(quote|charge|fee|\$|available|availability|arrival|tomorrow|today|schedule|book|dispatch|come out|diagnostic)/.test(summary);
}

export function applyTwilioVoiceStatusToCall(call, status = "", { now = new Date().toISOString() } = {}) {
  if (!call) return call;
  call.twilioStatus = status || call.twilioStatus;
  call.lastTwilioStatusAt = now;
  if (isTerminalTwilioCallStatus(status)) {
    call.status = displayStatusForTwilioCallStatus(status);
    call.mode = call.takeover ? "Call ended after takeover" : "AI completed";
    call.completedAt = call.completedAt || now;
    if (callNeedsHangupOutcome(call)) {
      call.status = "Hung up";
      call.mode = "Needs next vendor";
      call.summary = "Vendor ended the call before pricing or arrival timing was captured.";
    }
  }
  return call;
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
  for (const call of callResults) {
    startTranscriptMonitorForCall(order, call);
  }
  return order.vendorCalls;
}

export function startTranscriptMonitorForCall(order, call = {}) {
  const conversationId = call.conversation_id || call.conversationId;
  if (!order || !conversationId || !process.env.ELEVENLABS_API_KEY) return { started: false, reason: "missing_conversation_or_key" };
  if (transcriptMonitors.has(conversationId)) return { started: false, reason: "already_monitoring" };
  const url = `wss://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}/monitor`;
  const ws = new WebSocket(url, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }
  });
  transcriptMonitors.set(conversationId, ws);
  const callRef = {
    ...call,
    conversationId,
    vendorName: call.vendorName || call.vendor || "Vendor",
    phone: call.phone || ""
  };
  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }
    const line = transcriptLineFromMonitorEvent(message);
    if (!line) return;
    appendTranscriptLineToOrder(order, callRef, line);
  });
  ws.on("open", () => {
    appendCallNote(order, callRef, "Transcript monitor connected.");
  });
  ws.on("error", (error) => {
    appendCallNote(order, callRef, `Transcript monitor unavailable: ${error.message}`);
  });
  ws.on("close", () => {
    transcriptMonitors.delete(conversationId);
    appendCallNote(order, callRef, "Transcript monitor closed.");
  });
  return { started: true, conversationId };
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

function transcriptLineFromMonitorEvent(message = {}) {
  if (message.type === "user_transcript") {
    const text = message.user_transcription_event?.user_transcript;
    if (!text) return null;
    return { speaker: "Vendor", text, stamp: new Date().toISOString() };
  }
  if (message.type === "agent_response") {
    const text = message.agent_response_event?.agent_response;
    if (!text) return null;
    return { speaker: "AI agent", text, stamp: new Date().toISOString() };
  }
  if (message.type === "agent_response_correction") {
    const text = message.agent_response_correction_event?.corrected_agent_response;
    if (!text) return null;
    return { speaker: "AI agent", text, stamp: new Date().toISOString() };
  }
  return null;
}

function appendTranscriptLineToOrder(order, call, line) {
  const session = findOrCreateCallSession(order, call);
  session.transcript = appendTranscriptLine(session.transcript || [], line);
  session.lastTranscriptAt = new Date().toISOString();
  session.summary = `Latest: ${line.text}`;
  const attempt = upsertCallAttempt(order, call, {
    status: "answered",
    conversationId: call.conversationId,
    callSid: call.callSid || call.call_sid,
    callKey: call.callKey
  });
  attempt.transcript = appendTranscriptLine(attempt.transcript || [], line);
  attempt.answeredAt = attempt.answeredAt || new Date().toISOString();
  saveState();
}

function appendCallNote(order, call, note) {
  const session = findOrCreateCallSession(order, call);
  session.monitorStatus = note;
  session.lastTranscriptAt = new Date().toISOString();
  saveState();
}

function findOrCreateCallSession(order, call) {
  order.vendorCalls = order.vendorCalls || [];
  const existing = order.vendorCalls.find((item) =>
    (call.conversationId && item.conversationId === call.conversationId) ||
    (call.callSid && item.callSid === call.callSid) ||
    (call.callKey && item.callKey === call.callKey) ||
    (call.phone && item.phone === call.phone)
  );
  if (existing) return existing;
  const session = {
    id: `call-${order.id}-${order.vendorCalls.length + 1}`,
    vendorName: call.vendorName || call.vendor || "Vendor",
    phone: call.phone || "",
    callKey: call.callKey || null,
    status: "Live",
    mode: "AI handling",
    canMonitor: true,
    canTakeOver: true,
    listenInAvailable: false,
    monitorUrl: call.conversationId ? `wss://api.elevenlabs.io/v1/convai/conversations/${call.conversationId}/monitor` : null,
    browserListenUrl: null,
    conversationId: call.conversationId || null,
    callSid: call.callSid || call.call_sid || null,
    startedAt: new Date().toISOString(),
    lastTranscriptAt: new Date().toISOString(),
    summary: "Transcript monitor started.",
    transcript: []
  };
  order.vendorCalls.unshift(session);
  return session;
}

function appendTranscriptLine(transcript = [], line) {
  const prior = transcript[transcript.length - 1];
  if (prior && prior.speaker === line.speaker && prior.text === line.text) return transcript;
  return [...transcript, line].slice(-80);
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
    { speaker: "AI agent", text: `Hi, we have ${order.issue || `${order.trade.toLowerCase()} issue`} at ${property?.address || "the property"}. Is this something you all can fix, and if so, how much do you charge and when could you come and help?`, stamp: new Date().toISOString() },
    { speaker: vendorName, text: call.quote ? `Likely ${call.quote}; ${call.availability}.` : "Let me check availability and pricing.", stamp: new Date().toISOString() },
    { speaker: "AI agent", text: "Thanks. We are comparing options and will call back if the manager wants to schedule.", stamp: new Date().toISOString() }
  ];
}
