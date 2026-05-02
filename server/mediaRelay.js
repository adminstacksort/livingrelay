import { WebSocketServer } from "ws";
import { createHmac, timingSafeEqual } from "node:crypto";
import { event, saveState, workOrders } from "./data.js";

const rooms = new Map();

export function attachMediaRelay(server) {
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith("/api/media/")) return;
    socket.on("error", () => {});
    if (!verifyMediaRelayToken(url)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    try {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req, url);
      });
    } catch {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req, url) => {
    const role = url.pathname.endsWith("/twilio") ? "twilio" : "listener";
    const roomKey = roomKeyFrom(url);
    const room = ensureRoom(roomKey);
    if (role === "twilio") attachTwilioSource(ws, room, url);
    else attachBrowserListener(ws, room, url);
  });
}

export function getMediaRelayRoom(orderId, callIdOrKey) {
  const room = rooms.get(`${orderId}:${callIdOrKey}`);
  return {
    connected: Boolean(room?.twilio),
    listeners: room?.listeners?.size || 0,
    streamSid: room?.streamSid || null,
    callSid: room?.callSid || null,
    lastMediaAt: room?.lastMediaAt || null
  };
}

export function createMediaRelayToken({ orderId = "", callKey = "", role = "listener" } = {}) {
  const secret = mediaRelaySecret();
  if (!secret) return "";
  return createHmac("sha256", secret)
    .update(`${orderId}:${callKey}:${role}`)
    .digest("hex");
}

function attachTwilioSource(ws, room, url) {
  room.twilio = ws;
  room.orderId = url.searchParams.get("orderId") || room.orderId;
  room.callKey = url.searchParams.get("callKey") || url.searchParams.get("callId") || room.callKey;
  markTimeline(room.orderId, "Twilio media stream connected", `Live audio stream opened for ${room.callKey || "vendor call"}.`);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.event === "start") {
      room.streamSid = msg.start?.streamSid;
      room.callSid = msg.start?.callSid;
      room.startedAt = new Date().toISOString();
      broadcast(room, { type: "start", streamSid: room.streamSid, callSid: room.callSid, startedAt: room.startedAt });
      return;
    }
    if (msg.event === "media") {
      room.lastMediaAt = new Date().toISOString();
      broadcast(room, {
        type: "media",
        track: msg.media?.track,
        payload: msg.media?.payload,
        timestamp: msg.media?.timestamp,
        receivedAt: room.lastMediaAt
      });
      return;
    }
    if (msg.event === "stop") {
      broadcast(room, { type: "stop", stoppedAt: new Date().toISOString() });
      room.twilio = null;
      markTimeline(room.orderId, "Twilio media stream ended", `Live audio stream closed for ${room.callKey || "vendor call"}.`);
    }
  });

  ws.on("close", () => {
    if (room.twilio === ws) room.twilio = null;
    broadcast(room, { type: "source_closed", closedAt: new Date().toISOString() });
  });
}

function attachBrowserListener(ws, room, url) {
  room.listeners.add(ws);
  ws.send(JSON.stringify({
    type: "ready",
    connected: Boolean(room.twilio),
    listeners: room.listeners.size,
    streamSid: room.streamSid || null,
    callSid: room.callSid || null
  }));
  markTimeline(url.searchParams.get("orderId"), "Manager audio listener connected", "Browser listen-in session opened.");
  ws.on("close", () => {
    room.listeners.delete(ws);
  });
}

function broadcast(room, payload) {
  const text = JSON.stringify(payload);
  for (const listener of room.listeners) {
    if (listener.readyState === listener.OPEN) listener.send(text);
  }
}

function ensureRoom(key) {
  if (!rooms.has(key)) {
    rooms.set(key, { key, listeners: new Set(), twilio: null });
  }
  return rooms.get(key);
}

function roomKeyFrom(url) {
  return `${url.searchParams.get("orderId") || "unknown"}:${url.searchParams.get("callId") || url.searchParams.get("callKey") || "unknown"}`;
}

function verifyMediaRelayToken(url) {
  const secret = mediaRelaySecret();
  if (!secret) return process.env.NODE_ENV !== "production";
  const orderId = url.searchParams.get("orderId") || "";
  const callKey = url.searchParams.get("callKey") || url.searchParams.get("callId") || "";
  const role = url.pathname.endsWith("/twilio") ? "twilio" : "listener";
  const token = url.searchParams.get("token") || "";
  const expected = createMediaRelayToken({ orderId, callKey, role });
  return safeEqual(token, expected);
}

function mediaRelaySecret() {
  return process.env.MEDIA_RELAY_SECRET || process.env.SESSION_SECRET || process.env.TWILIO_AUTH_TOKEN || "";
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function markTimeline(orderId, label, detail) {
  const order = workOrders.find((item) => item.id === orderId);
  if (!order) return;
  order.timeline.push(event(label, detail));
  saveState();
}
