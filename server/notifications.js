import http2 from "node:http2";
import { createSign, randomUUID } from "node:crypto";
import { notifications, people, properties, recordAudit, saveState, vendors, workOrders } from "./data.js";
import { sendEmail } from "./emailClient.js";

const notificationEvents = {
  tenant_report: {
    label: "Tenant logged request",
    topic: "tenant_report",
    roles: ["Manager", "Owner"],
    title: ({ order }) => `${order.id} tenant request`,
    body: ({ order, property, tenant }) => `${tenant?.name || "Tenant"} reported ${order.trade} at ${property?.name || "the property"}: ${order.issue}`
  },
  vendor_contacted: {
    label: "Vendors being contacted",
    topic: "key_update",
    roles: ["Manager", "Owner"],
    title: ({ order }) => `${order.id} vendor outreach started`,
    body: ({ order, property }) => `LivingRelay is contacting ${order.trade} vendors for ${property?.name || order.unit}.`
  },
  vendor_booked: {
    label: "Vendor booked",
    topic: "key_update",
    roles: ["Manager", "Owner", "Tenant", "Vendor"],
    title: ({ order }) => `${order.id} vendor booked`,
    body: ({ order }) => `${order.finalBooking?.vendorName || "Vendor"} is booked for ${order.finalBooking?.serviceWindow || order.serviceWindow || "the requested service window"}.`
  },
  issue_resolved: {
    label: "Issue resolved",
    topic: "key_update",
    roles: ["Manager", "Owner", "Tenant"],
    title: ({ order }) => `${order.id} resolved`,
    body: ({ order, property }) => `${order.trade} at ${property?.name || order.unit} has been marked resolved.`
  },
  owner_paid: {
    label: "Owner paid",
    topic: "billing_update",
    roles: ["Manager"],
    title: ({ order }) => `${order?.id || "Invoice"} payment updated`,
    body: ({ order, invoice, billingEvent }) => `${invoice?.vendor || order?.finalBooking?.vendorName || "Owner"} payment is ${invoice?.paymentStatus || billingEvent?.status || "paid"}.`
  },
  owner_approval: {
    label: "Owner approval needed",
    topic: "key_update",
    roles: ["Owner"],
    title: ({ order }) => `${order.id} needs approval`,
    body: ({ order, property }) => `${order.trade} at ${property?.name || order.unit} needs owner approval. Estimate: $${Number(order.estimate || 0).toLocaleString()}.`
  },
  billing_required: {
    label: "Billing setup needed",
    topic: "billing_update",
    roles: ["Manager", "Owner"],
    title: ({ order }) => `${order.id} needs billing setup`,
    body: ({ property }) => `Add a payment method for ${property?.name || "this property"} before vendor dispatch fees can be collected.`
  }
};

const defaultEventsByRole = {
  Manager: {
    tenant_report: true,
    vendor_contacted: true,
    vendor_booked: true,
    issue_resolved: true,
    owner_paid: true,
    owner_approval: false,
    billing_required: true
  },
  Owner: {
    tenant_report: true,
    vendor_contacted: false,
    vendor_booked: true,
    issue_resolved: true,
    owner_paid: false,
    owner_approval: true,
    billing_required: true
  },
  Tenant: {
    tenant_report: false,
    vendor_contacted: false,
    vendor_booked: true,
    issue_resolved: true,
    owner_paid: false,
    owner_approval: false,
    billing_required: false
  },
  Vendor: {
    tenant_report: false,
    vendor_contacted: false,
    vendor_booked: true,
    issue_resolved: false,
    owner_paid: false,
    owner_approval: false,
    billing_required: false
  }
};

export function notificationCatalog() {
  return Object.entries(notificationEvents).map(([key, event]) => ({
    key,
    label: event.label,
    roles: event.roles
  }));
}

export function defaultNotifyForRole(role, existing = {}) {
  const events = { ...(defaultEventsByRole[role] || {}) };
  if (existing.tenantReports !== undefined) events.tenant_report = existing.tenantReports !== false;
  if (existing.keyUpdates !== undefined) {
    for (const key of ["vendor_booked", "issue_resolved", "owner_approval", "billing_required"]) {
      if (events[key] !== undefined) events[key] = existing.keyUpdates !== false;
    }
  }
  if (existing.everyUpdate !== undefined && events.vendor_contacted !== undefined) {
    events.vendor_contacted = existing.everyUpdate === true;
  }
  return {
    channels: {
      email: existing.channels?.email ?? existing.email ?? true,
      push: existing.channels?.push ?? existing.push ?? true
    },
    events: {
      ...events,
      ...(existing.events || {})
    },
    tenantReports: existing.tenantReports ?? events.tenant_report,
    everyUpdate: existing.everyUpdate ?? role === "Manager",
    keyUpdates: existing.keyUpdates ?? ["Manager", "Owner"].includes(role),
    pushDevices: Array.isArray(existing.pushDevices) ? existing.pushDevices : []
  };
}

export function mergeNotifySettings(person, patch = {}) {
  const base = defaultNotifyForRole(person.role, person.notify || {});
  const next = {
    ...base,
    ...(patch.notify || {})
  };
  const directEventPatch = Object.fromEntries(Object.keys(notificationEvents)
    .filter((key) => patch[key] !== undefined)
    .map((key) => [key, patch[key] === true]));
  next.channels = {
    ...base.channels,
    ...(patch.channels || patch.notify?.channels || {}),
    ...(patch.emailNotifications !== undefined ? { email: patch.emailNotifications === true } : {}),
    ...(patch.pushNotifications !== undefined ? { push: patch.pushNotifications === true } : {})
  };
  next.events = {
    ...base.events,
    ...(patch.events || patch.notify?.events || {}),
    ...directEventPatch
  };
  for (const legacyKey of ["tenantReports", "everyUpdate", "keyUpdates"]) {
    if (patch[legacyKey] !== undefined) next[legacyKey] = patch[legacyKey] === true;
  }
  next.pushDevices = Array.isArray(patch.pushDevices) ? patch.pushDevices : base.pushDevices;
  return next;
}

export async function dispatchNotification(eventKey, context = {}) {
  const event = notificationEvents[eventKey];
  if (!event) return { eventKey, sent: 0, results: [] };
  const order = context.order || workOrders.find((item) => item.id === context.orderId);
  const property = context.property || properties.find((item) => item.id === (order?.propertyId || context.propertyId));
  const tenant = context.tenant || people.find((person) => person.id === order?.tenantId);
  const vendor = context.vendor || vendors.find((item) => item.id === order?.vendorId);
  const title = event.title({ ...context, order, property, tenant, vendor });
  const body = event.body({ ...context, order, property, tenant, vendor });
  const recipients = recipientsForEvent({ event, order, property, tenant, vendor });
  const results = [];

  for (const person of recipients) {
    const notify = defaultNotifyForRole(person.role, person.notify || {});
    if (notify.events?.[eventKey] === false || !event.roles.includes(person.role)) continue;
    if (notify.channels.email !== false && person.email) {
      results.push(await sendEmailNotification({ person, eventKey, title, body, order }));
    }
    if (notify.channels.push !== false) {
      for (const device of notify.pushDevices || []) {
        results.push(await sendPushNotification({ person, device, eventKey, title, body, order }));
      }
    }
  }

  const delivery = {
    id: `ntf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    eventKey,
    orderId: order?.id || "",
    propertyId: property?.id || "",
    title,
    body,
    recipients: recipients.map((person) => ({ id: person.id, role: person.role })),
    results,
    createdAt: new Date().toISOString()
  };
  notifications.unshift(delivery);
  notifications.splice(50);
  saveState();
  return { eventKey, sent: results.filter((result) => result.sent).length, results, delivery };
}

export function registerPushDevice(person, device = {}) {
  const token = String(device.token || "").trim();
  const platform = String(device.platform || "ios").toLowerCase();
  if (!token || !["ios", "android"].includes(platform)) {
    return { error: "token and platform ios/android are required" };
  }
  const notify = defaultNotifyForRole(person.role, person.notify || {});
  const devices = (notify.pushDevices || []).filter((item) => item.token !== token);
  devices.push({
    id: device.id || randomUUID(),
    token,
    platform,
    environment: device.environment || process.env.APNS_ENVIRONMENT || "production",
    appBundleId: device.appBundleId || process.env.APNS_BUNDLE_ID || "",
    label: device.label || "",
    enabled: device.enabled !== false,
    registeredAt: new Date().toISOString()
  });
  person.notify = { ...notify, pushDevices: devices };
  saveState();
  recordAudit(person.name, "Registered push device", `${platform} notifications enabled.`);
  return { person, device: devices.at(-1) };
}

function recipientsForEvent({ event, order, property, tenant, vendor }) {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const ids = new Set([
    property?.managerId,
    property?.adminId,
    property?.ownerId,
    order?.tenantId,
    vendor?.personId
  ].filter(Boolean));
  return Array.from(ids)
    .map((id) => peopleById.get(id))
    .filter((person) => person && event.roles.includes(person.role));
}

async function sendEmailNotification({ person, eventKey, title, body, order }) {
  const result = await sendEmail({
    to: person.email,
    subject: title,
    text: `${body}\n\n${order?.id ? `Work order: ${order.id}` : "LivingRelay"}`
  });
  return deliveryResult({
    person,
    channel: "email",
    eventKey,
    sent: result.sent,
    reason: result.reason || result.id || "sent"
  });
}

async function sendPushNotification({ person, device, eventKey, title, body, order }) {
  if (device.enabled === false) return deliveryResult({ person, channel: "push", eventKey, sent: false, reason: "device_disabled" });
  if (device.platform === "android") {
    return deliveryResult({ person, channel: "push", eventKey, sent: false, reason: "android_fcm_not_configured" });
  }
  const apns = getApnsConfig(device);
  if (!apns.configured) return deliveryResult({ person, channel: "push", eventKey, sent: false, reason: `apns_not_configured:${apns.missing.join(",")}` });
  try {
    const result = await sendApns({ ...apns, token: device.token, title, body, orderId: order?.id || "", eventKey });
    return deliveryResult({ person, channel: "push", eventKey, sent: result.sent, reason: result.reason || result.apnsId || "sent" });
  } catch (error) {
    return deliveryResult({ person, channel: "push", eventKey, sent: false, reason: error.message });
  }
}

function getApnsConfig(device = {}) {
  const config = {
    keyId: process.env.APNS_KEY_ID || "",
    teamId: process.env.APNS_TEAM_ID || "",
    bundleId: device.appBundleId || process.env.APNS_BUNDLE_ID || "",
    privateKey: (process.env.APNS_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    environment: device.environment || process.env.APNS_ENVIRONMENT || "production"
  };
  const missing = Object.entries(config).filter(([key, value]) => key !== "environment" && !value).map(([key]) => key);
  return { ...config, missing, configured: missing.length === 0 };
}

function createApnsJwt({ keyId, teamId, privateKey }) {
  const header = base64Url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64Url(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }));
  const signer = createSign("SHA256");
  signer.update(`${header}.${claims}`);
  signer.end();
  return `${header}.${claims}.${base64Url(signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }))}`;
}

function sendApns({ keyId, teamId, bundleId, privateKey, environment, token, title, body, orderId, eventKey }) {
  const host = environment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  const client = http2.connect(`https://${host}`);
  const jwt = createApnsJwt({ keyId, teamId, privateKey });
  const payload = JSON.stringify({
    aps: {
      alert: { title, body },
      sound: "default"
    },
    orderId,
    eventKey
  });
  return new Promise((resolve, reject) => {
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10"
    });
    let responseBody = "";
    let status = 0;
    let apnsId = "";
    req.setEncoding("utf8");
    req.on("response", (headers) => {
      status = Number(headers[":status"] || 0);
      apnsId = headers["apns-id"] || "";
    });
    req.on("data", (chunk) => {
      responseBody += chunk;
    });
    req.on("end", () => {
      client.close();
      if (status >= 200 && status < 300) resolve({ sent: true, apnsId });
      else resolve({ sent: false, reason: responseBody || `apns_failed_${status}` });
    });
    req.on("error", (error) => {
      client.close();
      reject(error);
    });
    req.end(payload);
  });
}

function deliveryResult({ person, channel, eventKey, sent, reason }) {
  return {
    personId: person.id,
    role: person.role,
    channel,
    eventKey,
    sent,
    reason,
    at: new Date().toISOString()
  };
}

function base64Url(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
