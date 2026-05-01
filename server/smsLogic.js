import { event, invoices, message, people, properties, recordAudit, saveState, vendors, workOrders } from "./data.js";
import { findVendorOptions } from "./anthropicVendorSearch.js";

export function normalizePhone(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (String(value).startsWith("+")) return value;
  return `+${digits}`;
}

export function classifyIssue(text = "") {
  const body = text.toLowerCase();
  const trade = body.includes("water") || body.includes("sink") || body.includes("toilet") || body.includes("leak")
    ? "Plumbing"
    : body.includes("heat") || body.includes("ac") || body.includes("thermostat")
      ? "HVAC"
      : body.includes("spark") || body.includes("outlet") || body.includes("power")
        ? "Electrical"
        : "General";
  const urgent = ["leak", "active water", "gas", "spark", "no heat", "no lock", "flood"].some((word) => body.includes(word));
  return {
    trade,
    severity: urgent ? "Urgent" : "Normal",
    estimate: trade === "Plumbing" ? 325 : trade === "HVAC" ? 425 : trade === "Electrical" ? 185 : 145
  };
}

export function findPersonByPhone(phone) {
  const normalized = normalizePhone(phone);
  return people.find((person) => normalizePhone(person.phone) === normalized);
}

export function getPropertyForPerson(person) {
  return properties.find((property) => person?.propertyIds?.includes(property.id)) || properties[0];
}

export function getPrimaryContacts(property) {
  return {
    manager: people.find((person) => person.id === property.managerId) || people.find((person) => person.id === property.adminId) || people.find((person) => person.role === "Manager"),
    owner: people.find((person) => person.id === property.ownerId),
    admin: people.find((person) => person.id === property.adminId)
  };
}

function wantsNotification(person, topic) {
  if (!person) return false;
  if (topic === "tenant_report") return person.notify?.tenantReports !== false;
  if (topic === "every_update") return person.notify?.everyUpdate === true;
  if (topic === "key_update") return person.notify?.keyUpdates !== false;
  return true;
}

function notificationActionsForProperty(property, topic, orderId) {
  const contacts = getPrimaryContacts(property);
  const seen = new Set();
  const candidates = [
    { person: contacts.manager, type: "notify_manager" },
    { person: contacts.owner, type: "notify_owner_tenant_report" },
    { person: contacts.admin, type: "notify_admin_tenant_report" }
  ];

  return candidates
    .filter(({ person }) => {
      if (!person || seen.has(person.id) || !wantsNotification(person, topic)) return false;
      seen.add(person.id);
      return true;
    })
    .map(({ type }) => ({ type, orderId }));
}

export async function createWorkOrderFromTenant({ tenant, body }) {
  const property = getPropertyForPerson(tenant);
  const triage = classifyIssue(body);
  const vendor = vendors.find((item) => item.trade === triage.trade) || vendors[0];
  const needsOwner = tenant.unit === "3B" && triage.estimate > 150;
  const id = `WO-${Math.floor(3000 + Math.random() * 6000)}`;
  const order = {
    id,
    propertyId: property.id,
    unit: tenant.unit || property.units[0],
    tenantId: tenant.id,
    trade: triage.trade,
    severity: triage.severity,
    status: "Manager review",
    estimate: triage.estimate,
    vendorId: vendor.id,
    issue: body,
    access: "Needs follow-up",
    managerApproved: false,
    ownerApproved: !needsOwner,
    invoiceId: null,
    timeline: [
      event("Tenant SMS received", body),
      event("AI triaged request", `${triage.severity} ${triage.trade}; suggested ${vendor.name}.`)
    ],
    messages: [
      message("tenant", body),
      message("relay", `Thanks ${tenant.name.split(" ")[0]}. LivingRelay classified this as ${triage.trade}. A manager is reviewing now.`)
    ]
  };
  order.vendorOptions = await findVendorOptions({ property, order, configuredVendors: vendors });
  order.timeline.push(event("AI found vendor options", `${order.vendorOptions.length} local options prepared for manager review.`));
  workOrders.unshift(order);
  return order;
}

export function latestOpenOrderForPerson(person, body = "") {
  const explicitId = body.toUpperCase().match(/WO-\d+/)?.[0];
  if (explicitId) {
    const explicit = workOrders.find((order) => order.id === explicitId);
    if (explicit) return explicit;
  }
  if (!person) return null;
  if (person.role === "Tenant") {
    return workOrders.find((order) => order.tenantId === person.id && order.status !== "Closed");
  }
  if (person.role === "Vendor") {
    const vendor = vendors.find((item) => item.personId === person.id || normalizePhone(item.phone) === normalizePhone(person.phone));
    return workOrders.find((order) => order.vendorId === vendor?.id && order.status !== "Closed");
  }
  const property = getPropertyForPerson(person);
  return workOrders.find((order) => order.propertyId === property.id && order.status !== "Closed");
}

export async function handleInboundCommand({ from, body }) {
  const person = findPersonByPhone(from);
  if (!person) {
    return {
      response: "LivingRelay could not match this phone number. Ask the property manager to add your number first.",
      actions: []
    };
  }

  const normalizedBody = body.trim();
  const command = normalizedBody.toUpperCase();
  const order = latestOpenOrderForPerson(person, normalizedBody);

  if (command === "HELP") {
    return {
      response: "LivingRelay commands: STATUS, STATUS WO-1234, APPROVE WO-1234, DENY WO-1234, VENDOR WO-1234 1, PAID WO-1234, CLOSE WO-1234.",
      actions: []
    };
  }

  if (person.role === "Tenant") {
    const created = await createWorkOrderFromTenant({ tenant: person, body: normalizedBody });
    return {
      response: `Thanks ${person.name.split(" ")[0]}. We opened ${created.id} for Unit ${created.unit}. A manager is reviewing it now.`,
      actions: [
        ...notificationActionsForProperty(getPropertyForPerson(person), "tenant_report", created.id),
        { type: "call_vendor_quotes", orderId: created.id }
      ]
    };
  }

  if (!order) {
    return { response: "LivingRelay does not see an open work order for you right now.", actions: [] };
  }

  order.messages.push(message(person.role.toLowerCase(), normalizedBody));

  if (command.startsWith("STATUS")) {
    return {
      response: `${order.id}: ${order.status}. ${order.trade} at Unit ${order.unit}. Estimate $${order.estimate}.`,
      actions: []
    };
  }

  if (person.role === "Manager" || person.role === "Admin") {
    if (command.startsWith("APPROVE")) {
      order.managerApproved = true;
      order.status = order.ownerApproved ? "Vendor coordination" : "Owner approval";
      order.timeline.push(event("Manager approved by SMS", `${person.name} approved ${order.id}.`));
      return {
        response: order.ownerApproved
          ? `${order.id} approved. Reply VENDOR to send the job to the preferred vendor.`
          : `${order.id} approved. Owner approval is required next.`,
        actions: order.ownerApproved ? [] : [{ type: "notify_owner_approval", orderId: order.id }]
      };
    }
    if (command.startsWith("VENDOR")) {
      const selectedIndex = Number(command.match(/(?:VENDOR)(?:\s+WO-\d+)?\s*([1-5])/)?.[1]);
      if (selectedIndex && order.vendorOptions?.[selectedIndex - 1]) {
        const selected = order.vendorOptions[selectedIndex - 1];
        const existingVendor = vendors.find((vendor) => vendor.phone === selected.phone);
        if (!existingVendor) {
          vendors.push({
            id: `v-${vendors.length + 1}`,
            name: selected.name,
            trade: selected.trade || order.trade,
            phone: selected.phone,
            preferred: false
          });
          order.vendorId = `v-${vendors.length}`;
        } else {
          order.vendorId = existingVendor.id;
        }
        order.timeline.push(event("Manager selected vendor by SMS", `${person.name} selected ${selected.name}.`));
      }
      order.status = "Vendor coordination";
      order.timeline.push(event("Vendor dispatch requested by SMS", `${person.name} requested vendor coordination.`));
      saveState();
      return { response: `${order.id} queued for vendor outreach.`, actions: [{ type: "notify_vendor", orderId: order.id }] };
    }
    if (command.startsWith("CLOSE")) {
      order.status = "Closed";
      order.timeline.push(event("Closed by SMS", `${person.name} closed ${order.id}.`));
      recordAudit(person.name, "Closed work order", order.id);
      return { response: `${order.id} is closed.`, actions: [{ type: "notify_tenant_closed", orderId: order.id }] };
    }
  }

  if (person.role === "Owner") {
    if (command.startsWith("APPROVE")) {
      order.ownerApproved = true;
      order.status = "Vendor coordination";
      order.timeline.push(event("Owner approved by SMS", `${person.name} approved ${order.id}.`));
      return { response: `${order.id} approved. Manager has been notified.`, actions: [{ type: "notify_manager_owner_approved", orderId: order.id }] };
    }
    if (command.startsWith("DENY")) {
      order.status = "Owner denied";
      order.timeline.push(event("Owner denied by SMS", `${person.name} denied ${order.id}.`));
      return { response: `${order.id} marked denied. Manager has been notified.`, actions: [{ type: "notify_manager_owner_denied", orderId: order.id }] };
    }
    if (command.startsWith("PAID")) {
      order.timeline.push(event("Owner marked paid by SMS", `${person.name} marked the invoice paid off platform.`));
      const invoice = invoices.find((item) => item.id === order.invoiceId);
      if (invoice) invoice.status = "Paid off platform";
      saveState();
      return { response: `${order.id} invoice marked paid off platform.`, actions: [] };
    }
  }

  if (person.role === "Vendor") {
    if (command === "ACCEPT") {
      order.status = "Vendor scheduled";
      order.timeline.push(event("Vendor accepted by SMS", `${person.name} accepted ${order.id}.`));
      return { response: `${order.id} accepted. Please reply with ETA when ready.`, actions: [{ type: "notify_manager_vendor_accepted", orderId: order.id }] };
    }
    if (command === "DECLINE") {
      order.status = "Vendor declined";
      order.timeline.push(event("Vendor declined by SMS", `${person.name} declined ${order.id}.`));
      return { response: `${order.id} declined. Manager has been notified.`, actions: [{ type: "notify_manager_vendor_declined", orderId: order.id }] };
    }
    order.timeline.push(event("Vendor message", normalizedBody));
    return { response: `Got it. We added your update to ${order.id}.`, actions: [{ type: "notify_tenant_status", orderId: order.id }] };
  }

  order.timeline.push(event("SMS note", normalizedBody));
  return { response: `Your message was added to ${order.id}.`, actions: [] };
}

export function composeActionMessage(action) {
  const order = workOrders.find((item) => item.id === action.orderId);
  if (!order) return null;
  const property = properties.find((item) => item.id === order.propertyId);
  const contacts = getPrimaryContacts(property);
  const tenant = people.find((person) => person.id === order.tenantId);
  const vendor = vendors.find((item) => item.id === order.vendorId);

  const messages = {
    notify_manager: {
      to: contacts.manager.phone,
      body: `${order.id}: ${order.severity} ${order.trade} issue in Unit ${order.unit}. ${order.issue}\n\nVendor options:\n${formatVendorOptions(order)}\n\nReview: ${reviewLink(order)}\nReply APPROVE ${order.id} or VENDOR ${order.id} 1-5.`
    },
    notify_owner_tenant_report: {
      to: contacts.owner.phone,
      body: `${order.id}: tenant reported a ${order.severity.toLowerCase()} ${order.trade.toLowerCase()} issue at ${property.name}, Unit ${order.unit}. Estimate ${order.estimate}. No approval needed yet unless manager requests it.`
    },
    notify_admin_tenant_report: {
      to: contacts.admin.phone,
      body: `${order.id}: new tenant report at ${property.name}, Unit ${order.unit}. ${order.severity} ${order.trade}. Manager review started.`
    },
    notify_owner_approval: {
      to: contacts.owner.phone,
      body: `${order.id}: approve ${order.trade} repair for Unit ${order.unit}? Estimate $${order.estimate}. Reply APPROVE or DENY.`
    },
    notify_vendor: {
      to: vendor.phone,
      body: `${order.id}: ${order.trade} job at ${property.name}, Unit ${order.unit}. Issue: ${order.issue}. Reply ACCEPT or DECLINE.`
    },
    notify_tenant_closed: {
      to: tenant.phone,
      body: `${order.id} has been closed. Reply with any issue if this is not resolved.`
    },
    notify_manager_owner_approved: {
      to: contacts.manager.phone,
      body: `${order.id}: owner approved. Reply VENDOR to contact ${vendor.name}.`
    },
    notify_manager_owner_denied: {
      to: contacts.manager.phone,
      body: `${order.id}: owner denied the repair.`
    },
    notify_manager_vendor_accepted: {
      to: contacts.manager.phone,
      body: `${order.id}: ${vendor.name} accepted the job.`
    },
    notify_manager_vendor_declined: {
      to: contacts.manager.phone,
      body: `${order.id}: ${vendor.name} declined. Choose another vendor.`
    },
    notify_tenant_status: {
      to: tenant.phone,
      body: `${order.id}: vendor posted an update. Manager is reviewing.`
    }
  };

  return messages[action.type] || null;
}

function formatVendorOptions(order) {
  const options = order.vendorOptions?.length
    ? order.vendorOptions
    : vendors.filter((vendor) => vendor.trade === order.trade).map((vendor) => ({
      name: vendor.name,
      phone: vendor.phone,
      estimate: `$${order.estimate}`,
      availability: "Needs confirmation"
    }));

  return options
    .slice(0, 5)
    .map((option, index) => `${index + 1}. ${option.name} ${option.phone} ${option.estimate} ${option.availability}`)
    .join("\n");
}

function reviewLink(order) {
  const base = process.env.APP_PUBLIC_URL || "http://127.0.0.1:5173";
  return `${base}/?review=${encodeURIComponent(order.id)}`;
}
