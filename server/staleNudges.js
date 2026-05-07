import { event, message, people, properties, recordAudit, saveState, vendors, workOrders } from "./data.js";
import { sendSms } from "./smsClient.js";

const CLOSED_STATUSES = new Set(["Closed", "Demo completed", "Owner denied"]);
const DEFAULT_STALE_HOURS = 12;

export function getStaleWorkOrders({ propertyId, thresholdHours = DEFAULT_STALE_HOURS } = {}) {
  const cutoff = Date.now() - Number(thresholdHours) * 60 * 60 * 1000;
  return workOrders
    .filter((order) => (!propertyId || order.propertyId === propertyId) && !CLOSED_STATUSES.has(order.status))
    .map((order) => ({ order, stale: getStaleInfo(order, cutoff) }))
    .filter(({ stale }) => stale.isStale)
    .map(({ order, stale }) => ({
      id: order.id,
      propertyId: order.propertyId,
      unit: order.unit,
      status: order.status,
      trade: order.trade,
      severity: order.severity,
      issue: order.issue,
      hoursIdle: stale.hoursIdle,
      nextAction: nextActionForOrder(order).label,
      recipientRole: nextActionForOrder(order).recipientRole,
      lastActivityAt: stale.lastActivityAt
    }));
}

export async function nudgeWorkOrder(orderId, { send = false, actor = "system" } = {}) {
  const order = workOrders.find((item) => item.id === orderId);
  if (!order) return { error: "work order not found" };
  if (CLOSED_STATUSES.has(order.status)) return { error: "work order is already closed" };

  const nudge = buildNudge(order);
  order.nudges = order.nudges || [];
  order.nudges.unshift({
    recipientRole: nudge.recipientRole,
    recipientName: nudge.toPerson?.name || nudge.toName,
    to: nudge.to,
    body: nudge.body,
    sent: false,
    stamp: new Date().toISOString()
  });
  order.timeline.push(event("Stale item nudged", `${nudge.recipientRole}: ${nudge.shortReason}`));
  order.messages.push(message("relay", nudge.body));

  let smsResult = { sent: false, skipped: true };
  if (send && nudge.to) {
    smsResult = await sendSms({ to: nudge.to, body: nudge.body });
    order.nudges[0].sent = smsResult.sent === true;
    order.nudges[0].sid = smsResult.sid;
    order.nudges[0].error = smsResult.error;
  }

  saveState();
  recordAudit(actor, send ? "Sent stale work order nudge" : "Prepared stale work order nudge", `${order.id}: ${nudge.recipientRole}.`);
  return { order, nudge: order.nudges[0], sms: smsResult };
}

export async function nudgeStaleWorkOrders({ propertyId, thresholdHours = DEFAULT_STALE_HOURS, send = false, actor = "system" } = {}) {
  const staleOrders = getStaleWorkOrders({ propertyId, thresholdHours });
  const results = [];
  for (const staleOrder of staleOrders) {
    results.push(await nudgeWorkOrder(staleOrder.id, { send, actor }));
  }
  return {
    thresholdHours: Number(thresholdHours),
    count: results.length,
    results
  };
}

function getStaleInfo(order, cutoff) {
  const stamps = [...(order.timeline || []), ...(order.messages || []), ...(order.nudges || [])]
    .map((item) => Date.parse(item.stamp))
    .filter((stamp) => Number.isFinite(stamp));
  const lastActivity = stamps.length ? Math.max(...stamps) : 0;
  const lastActivityAt = lastActivity ? new Date(lastActivity).toISOString() : null;
  return {
    isStale: !lastActivity || lastActivity < cutoff,
    hoursIdle: lastActivity ? Math.max(0, Math.floor((Date.now() - lastActivity) / (60 * 60 * 1000))) : null,
    lastActivityAt
  };
}

function buildNudge(order) {
  const property = properties.find((item) => item.id === order.propertyId);
  const tenant = people.find((person) => person.id === order.tenantId);
  const manager = people.find((person) => person.id === property?.managerId) || people.find((person) => person.id === property?.adminId);
  const owner = people.find((person) => person.id === property?.ownerId);
  const vendor = vendors.find((item) => item.id === order.vendorId);
  const action = nextActionForOrder(order);
  const personByRole = {
    Manager: manager,
    Owner: owner,
    Tenant: tenant
  };
  const toPerson = personByRole[action.recipientRole];
  const to = toPerson?.phone || vendor?.phone;
  const toName = toPerson?.name || vendor?.name || action.recipientRole;

  return {
    ...action,
    to,
    toName,
    toPerson,
    body: `LivingRelay nudge: ${order.id} is still open at ${property?.name || "the property"}, Unit ${order.unit}. ${action.body} Reply STATUS ${order.id}, CLOSE ${order.id}, or add an update.`
  };
}

function nextActionForOrder(order) {
  const status = order.status.toLowerCase();
  if (status.includes("owner approval") || status.includes("needs owner")) {
    return {
      recipientRole: "Owner",
      label: "Owner approval needed",
      shortReason: "Waiting on owner approval",
      body: `Approval is still needed for the ${order.trade.toLowerCase()} repair. Estimate $${order.estimate}.`
    };
  }
  if (status.includes("vendor") || status.includes("scheduled")) {
    return {
      recipientRole: "Manager",
      label: "Vendor follow-up needed",
      shortReason: "Waiting on vendor/scheduling closeout",
      body: "Vendor coordination has not been closed out yet. Confirm schedule, invoice, or completion."
    };
  }
  if (status.includes("invoice")) {
    return {
      recipientRole: "Owner",
      label: "Invoice/payment closeout needed",
      shortReason: "Waiting on invoice or payment closeout",
      body: "Invoice follow-up is still open. Mark paid off platform when it is settled."
    };
  }
  return {
    recipientRole: "Manager",
    label: "Manager review needed",
    shortReason: "Waiting on manager review",
    body: `Manager review is still open for this ${order.severity.toLowerCase()} ${order.trade.toLowerCase()} issue.`
  };
}
