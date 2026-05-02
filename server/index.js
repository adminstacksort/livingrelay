import "dotenv/config";
import express from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accounts, auditLog, billingEvents, invoices, people, properties, recordAudit, saveState, vendors, workOrders } from "./data.js";
import { composeActionMessage, handleInboundCommand } from "./smsLogic.js";
import { getTwilioStatus, sendSms } from "./twilioClient.js";
import { startVendorQuoteCalls } from "./elevenLabsCalls.js";
import { runFullFlowDemo, selectDemoQuote, simulateVendorOutreach } from "./demoOutreach.js";
import { createDemoScenario, listDemoScenarios } from "./demoScenarios.js";
import { getStaleWorkOrders, nudgeStaleWorkOrders, nudgeWorkOrder } from "./staleNudges.js";
import { getLiveCalls, listenToCall, takeOverCall } from "./liveCallControl.js";
import { buildTaxCsv, buildTaxSummary, recordTaxBundleAudit } from "./taxExports.js";
import { getReadiness } from "./config.js";
import { chargeStripeDispatchFee, createStripePortalSession, createStripeSetupSession, dispatchFeeCents, stripeBillingStatus } from "./stripeBilling.js";

const app = express();
const port = Number(process.env.SERVER_PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
const siteAdminHost = process.env.SITE_ADMIN_HOST || "admin.livingrelay.com";
const siteAdminSessions = new Set();

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), (req, res) => {
  try {
    if (!verifyStripeSignature(req)) {
      res.status(400).json({ error: "invalid Stripe signature" });
      return;
    }
    const event = JSON.parse(req.body.toString("utf8"));
    handleStripeWebhookEvent(event);
    saveState();
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(distDir));

app.get("/api/health", async (req, res) => {
  const readiness = await getReadiness();
  res.json({ ok: true, service: "LivingRelay API", twilio: getTwilioStatus(), readiness });
});

app.get("/api/readiness", async (req, res) => {
  const readiness = await getReadiness();
  res.status(readiness.ok ? 200 : 503).json(readiness);
});

app.get("/api/state", (req, res) => {
  const includeSiteAdmin = isSiteAdminHost(req);
  res.json({
    accounts: includeSiteAdmin ? accounts : accounts.map(({ id, name, status, plan, stripeCustomerId, billingPayerRole, billingPayerPersonId, billingSetupStatus }) => ({
      id,
      name,
      status,
      plan,
      stripeCustomerId,
      billingPayerRole,
      billingPayerPersonId,
      billingSetupStatus: accountBillingSetupStatus({ stripeCustomerId, billingSetupStatus })
    })),
    people: includeSiteAdmin ? people : people.filter((person) => person.role !== "Site Admin"),
    properties,
    vendors,
    workOrders,
    invoices,
    billingEvents,
    auditLog,
    twilio: getTwilioStatus(),
    stripe: stripeBillingStatus(),
    demoScenarios: listDemoScenarios(),
    staleWorkOrders: getStaleWorkOrders({ thresholdHours: 12 })
  });
});

app.post("/api/onboarding/property", (req, res) => {
  const { accountName, propertyName, address = "", units = "", managerName, managerPhone, role = "Property manager", pin } = req.body;
  if (!propertyName || !managerName || !managerPhone) {
    res.status(400).json({ error: "propertyName, managerName, and managerPhone are required" });
    return;
  }

  const account = {
    id: `acct-${Date.now()}`,
    name: accountName || `${propertyName} account`,
    status: "Trial",
    plan: "$0/property + $25 only when a vendor is booked",
    billingPayerRole: role === "Owner" ? "Owner" : "Property manager",
    billingSetupStatus: "Needs card",
    createdAt: new Date().toISOString()
  };
  accounts.push(account);

  const personRole = role === "Owner" ? "Owner" : "Manager";
  const person = {
    id: `${personRole.toLowerCase()}-${Date.now()}`,
    name: managerName,
    role: personRole,
    phone: managerPhone,
    pin: pin || String(Math.floor(1000 + Math.random() * 9000)),
    propertyIds: [],
    accountIds: [account.id],
    notify: { tenantReports: true, everyUpdate: personRole === "Manager", keyUpdates: true }
  };
  people.push(person);

  const property = {
    id: `p-${Date.now()}`,
    accountId: account.id,
    name: propertyName,
    address,
    subscription: "Trial",
    plan: "$0/property + $25 only when a vendor is booked",
    units: String(units || "1").split(",").map((unit) => unit.trim()).filter(Boolean),
    adminId: person.id,
    managerId: person.id,
    ownerId: personRole === "Owner" ? person.id : null,
    billingPayerRole: role === "Owner" ? "Owner" : "Property manager",
    billingPayerPersonId: person.id,
    billingSetupStatus: "Needs card",
    approvalThreshold: 250,
    launchNotificationStatus: "Pending setup",
    rules: "All dispatches need manager review until tenants, owners, vendors, and approval rules are configured."
  };
  properties.push(property);
  person.propertyIds.push(property.id);

  saveState();
  recordAudit("self-serve", "Created property", `${managerName} created ${property.name}.`);
  res.json({ account, person, property });
});

app.use("/api/site-admin", requireSiteAdminHost);

app.post("/api/site-admin/login", (req, res) => {
  const { phone, pin, password } = req.body;
  const normalized = String(phone || "").replace(/\D/g, "");
  const siteAdmin = people.find((person) =>
    person.role === "Site Admin" &&
    person.phone.replace(/\D/g, "").endsWith(normalized.slice(-10)) &&
    person.pin === pin
  );
  if (!siteAdmin || password !== (process.env.SITE_ADMIN_PASSWORD || "owner-console")) {
    res.status(401).json({ error: "Invalid site admin credentials" });
    return;
  }
  const token = randomUUID();
  siteAdminSessions.add(token);
  recordAudit(siteAdmin.name, "Site admin login", "Internal admin console session started.");
  res.json({ userId: siteAdmin.id, token });
});

function requestHost(req) {
  const forwardedHost = String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
  return (forwardedHost || req.hostname || req.headers.host || "").split(":")[0].toLowerCase();
}

function isSiteAdminHost(req) {
  const host = requestHost(req);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  return host === siteAdminHost || (process.env.NODE_ENV !== "production" && localHosts.has(host));
}

function requireSiteAdminHost(req, res, next) {
  if (isSiteAdminHost(req)) {
    next();
    return;
  }
  res.status(404).json({ error: "Site admin console is only available at admin.livingrelay.com" });
}

function requireSiteAdminSession(req, res, next) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token && siteAdminSessions.has(token)) {
    next();
    return;
  }
  res.status(401).json({ error: "Site admin login required" });
}

app.use("/api/site-admin", requireSiteAdminSession);

app.post("/api/site-admin/accounts", (req, res) => {
  const {
    name,
    status = "Trial",
    plan = "$0/property + $25 vendor dispatch",
    stripeCustomerId = "",
    billingPayerRole = "Owner",
    billingPayerPersonId = "",
    billingSetupStatus = stripeCustomerId ? "Card on file" : "Needs card"
  } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const account = {
    id: `acct-${accounts.length + 1}`,
    name,
    status,
    plan,
    stripeCustomerId,
    billingPayerRole,
    billingPayerPersonId,
    billingSetupStatus,
    createdAt: new Date().toISOString()
  };
  accounts.push(account);
  saveState();
  recordAudit("site-admin", "Created account", `${name} account created.`);
  res.json({ account });
});

app.patch("/api/site-admin/accounts/:id", (req, res) => {
  const account = accounts.find((item) => item.id === req.params.id);
  if (!account) {
    res.status(404).json({ error: "account not found" });
    return;
  }
  const allowed = ["name", "status", "plan", "stripeCustomerId", "billingPayerRole", "billingPayerPersonId", "billingSetupStatus"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) account[key] = req.body[key];
  }
  saveState();
  recordAudit("site-admin", "Updated account", `${account.name} account settings updated.`);
  res.json({ account });
});

app.post("/api/demo/scenario", (req, res) => {
  const result = createDemoScenario(req.body.scenario);
  res.json(result);
});

app.post("/api/admin/properties", (req, res) => {
  const {
    name,
    address,
    units = "",
    adminId = "admin-1",
    ownerId = "owner-1",
    accountId = accounts[0]?.id || "acct-1",
    creatorRole = "Manager",
    billingPayerRole = "Owner"
  } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const property = {
    id: `p-${properties.length + 1}`,
    accountId,
    name,
    address: address || "",
    subscription: "Ready, no monthly charge",
    plan: "$0/property + $25 only when a vendor is booked",
    units: String(units).split(",").map((unit) => unit.trim()).filter(Boolean),
    adminId,
    managerId: adminId,
    ownerId,
    creatorRole,
    billingPayerRole,
    billingPayerPersonId: billingPayerRole === "Property manager" ? adminId : ownerId,
    billingSetupStatus: accountBillingSetupStatus(accounts.find((item) => item.id === accountId)),
    launchNotificationStatus: "Pending setup",
    approvalThreshold: 250,
    rules: "Manager is the default property operator. Contacts are saved now; tenant and owner SMS is sent only after setup is launched."
  };
  properties.push(property);
  const admin = people.find((person) => person.id === adminId);
  if (admin && !admin.propertyIds.includes(property.id)) admin.propertyIds.push(property.id);
  saveState();
  const owner = people.find((person) => person.id === ownerId);
  if (owner && !owner.propertyIds.includes(property.id)) owner.propertyIds.push(property.id);
  recordAudit("admin", "Created property", `${name} created with contacts pending launch notification.`);
  res.json({ property, billingSetupRequired: property.billingSetupStatus !== "Card on file" });
});

app.patch("/api/admin/properties/:id", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: "property not found" });
    return;
  }
  const allowed = ["name", "address", "subscription", "plan", "rules", "approvalThreshold", "adminId", "managerId", "ownerId", "billingPayerRole", "billingPayerPersonId", "billingSetupStatus", "creatorRole", "launchNotificationStatus"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) property[key] = req.body[key];
  }
  if (req.body.units !== undefined) {
    property.units = Array.isArray(req.body.units)
      ? req.body.units
      : String(req.body.units).split(",").map((unit) => unit.trim()).filter(Boolean);
  }
  saveState();
  recordAudit("admin", "Updated property", `${property.name} admin settings updated.`);
  res.json({ property });
});

app.post("/api/admin/people", (req, res) => {
  const { name, role, phone, email, pin, propertyId, accountId, unit, trade } = req.body;
  if (!name || !role || !phone || (!propertyId && role !== "Site Admin")) {
    res.status(400).json({ error: "name, role, phone, and propertyId are required" });
    return;
  }
  const person = {
    id: `${role.toLowerCase().replace(/\s+/g, "-")}-${people.length + 1}`,
    name,
    role,
    phone,
    email: email || undefined,
    pin: pin || String(Math.floor(1000 + Math.random() * 9000)),
    propertyIds: propertyId ? [propertyId] : [],
    accountIds: accountId ? [accountId] : undefined,
    unit: role === "Tenant" ? unit : undefined,
    trade: role === "Vendor" ? trade : undefined,
    notify: ["Manager", "Owner"].includes(role) ? { tenantReports: true, everyUpdate: role === "Manager", keyUpdates: true } : undefined
  };
  people.push(person);
  const property = properties.find((item) => item.id === propertyId);
  if (property && role === "Owner") property.ownerId = person.id;
  saveState();
  recordAudit("admin", "Added person", `${name} added as ${role}.`);
  res.json({ person });
});

app.post("/api/admin/work-orders", (req, res) => {
  const { propertyId, unit, tenantId, trade = "General", severity = "Normal", status = "Manager review", estimate = 0, vendorId, issue, access = "" } = req.body;
  if (!propertyId || !unit || !issue) {
    res.status(400).json({ error: "propertyId, unit, and issue are required" });
    return;
  }
  const order = {
    id: `WO-${Math.floor(3000 + Math.random() * 6000)}`,
    propertyId,
    unit,
    tenantId: tenantId || null,
    trade,
    severity,
    status,
    estimate: Number(estimate || 0),
    vendorId: vendorId || null,
    issue,
    access,
    managerApproved: false,
    ownerApproved: status !== "Owner approval",
    dispatchFee: {
      status: "Not charged",
      amount: dispatchFeeCents / 100,
      reason: "Charged only when a vendor is booked."
    },
    invoiceId: null,
    timeline: [
      {
        label: "Manager created work order",
        detail: issue,
        stamp: new Date().toISOString()
      }
    ],
    messages: []
  };
  workOrders.unshift(order);
  saveState();
  recordAudit("admin", "Created work order", `${order.id} created manually.`);
  res.json({ order });
});

app.post("/api/billing/setup-session", async (req, res) => {
  try {
    const account = accounts.find((item) => item.id === req.body.accountId) || accountForProperty(req.body.propertyId);
    const property = properties.find((item) => item.id === req.body.propertyId);
    if (!account) {
      res.status(404).json({ error: "account not found" });
      return;
    }
    updateBillingPayer({ account, property, payerRole: req.body.payerRole, payerPersonId: req.body.payerPersonId });
    account.billingSetupStatus = "Setup started";
    if (property) property.billingSetupStatus = "Setup started";
    const session = await createStripeSetupSession({
      account,
      successUrl: req.body.successUrl,
      cancelUrl: req.body.cancelUrl
    });
    saveState();
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    res.status(400).json({ error: error.message, stripe: stripeBillingStatus() });
  }
});

app.post("/api/billing/portal-session", async (req, res) => {
  try {
    const account = accounts.find((item) => item.id === req.body.accountId) || accountForProperty(req.body.propertyId);
    if (!account) {
      res.status(404).json({ error: "account not found" });
      return;
    }
    const session = await createStripePortalSession({ account, returnUrl: req.body.returnUrl });
    res.json({ url: session.url });
  } catch (error) {
    res.status(400).json({ error: error.message, stripe: stripeBillingStatus() });
  }
});

app.post("/api/work-orders/:id/book-vendor", async (req, res) => {
  const order = workOrders.find((item) => item.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: "work order not found" });
    return;
  }
  const property = properties.find((item) => item.id === order.propertyId);
  const account = accountForProperty(order.propertyId);
  const vendor = vendors.find((item) => item.id === (req.body.vendorId || order.vendorId));
  if (req.body.vendorId) order.vendorId = req.body.vendorId;
  order.status = "Vendor scheduled";
  order.timeline.push({
    label: "Vendor booked",
    detail: `${vendor?.name || "Vendor"} was booked. LivingRelay coordination fee applies now.`,
    stamp: new Date().toISOString()
  });
  const billingEvent = await recordDispatchBillingEvent({ account, property, order, actor: req.body.actor || "manager" });
  saveState();
  res.json({ order, billingEvent });
});

app.post("/api/admin/vendors", (req, res) => {
  const { name, trade, phone, preferred = true } = req.body;
  if (!name || !trade || !phone) {
    res.status(400).json({ error: "name, trade, and phone are required" });
    return;
  }
  const vendor = { id: `v-${vendors.length + 1}`, name, trade, phone, preferred };
  vendors.push(vendor);
  saveState();
  recordAudit("admin", "Added vendor", `${name} added for ${trade}.`);
  res.json({ vendor });
});

app.patch("/api/people/:id/notify", (req, res) => {
  const person = people.find((item) => item.id === req.params.id);
  if (!person) {
    res.status(404).json({ error: "person not found" });
    return;
  }
  person.notify = { ...(person.notify || {}), ...req.body };
  saveState();
  recordAudit(person.name, "Updated notification settings", JSON.stringify(person.notify));
  res.json({ person });
});

app.post("/api/work-orders/:id/invoices", (req, res) => {
  const order = workOrders.find((item) => item.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: "work order not found" });
    return;
  }
  const vendor = vendors.find((item) => item.id === order.vendorId);
  const property = properties.find((item) => item.id === order.propertyId);
  const contacts = getInvoiceRecipient(property);
  const invoice = {
    id: `inv-${invoices.length + 1}`,
    propertyId: order.propertyId,
    orderId: order.id,
    vendor: vendor?.name || "Vendor",
    amount: Number(req.body.amount || order.estimate || 0),
    status: "Unpaid",
    paymentStatus: "Unpaid",
    paymentRail: "Vendor direct",
    recipientName: contacts.name,
    recipientPhone: contacts.phone,
    recipientEmail: contacts.email,
    deliveryStatus: contacts.email ? "Ready to email property manager" : "Ready to text property manager",
    taxYear: req.body.taxYear || "2026",
    receivedAt: new Date().toLocaleDateString(),
    note: req.body.note || "Vendor invoice is paid outside LivingRelay. Track payment status here only."
  };
  invoices.unshift(invoice);
  order.invoiceId = invoice.id;
  order.status = "Invoice received";
  order.timeline.push({
    label: "Vendor invoice logged",
    detail: `${invoice.vendor} invoice routed to ${contacts.name} for off-platform payment tracking.`,
    stamp: new Date().toISOString()
  });
  saveState();
  recordAudit("manager", "Logged vendor invoice", `${invoice.id} for ${order.id}; payment remains outside LivingRelay.`);
  res.json({ invoice, order });
});

app.get("/api/properties/:id/stale-work-orders", (req, res) => {
  res.json({
    thresholdHours: Number(req.query.thresholdHours || 12),
    staleWorkOrders: getStaleWorkOrders({
      propertyId: req.params.id,
      thresholdHours: req.query.thresholdHours || 12
    })
  });
});

app.post("/api/properties/:id/stale-nudges", async (req, res) => {
  try {
    const result = await nudgeStaleWorkOrders({
      propertyId: req.params.id,
      thresholdHours: req.body.thresholdHours || 12,
      send: req.body.send === true,
      actor: req.body.actor || "manager"
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/work-orders/:id/nudge", async (req, res) => {
  try {
    const result = await nudgeWorkOrder(req.params.id, {
      send: req.body.send === true,
      actor: req.body.actor || "manager"
    });
    if (result.error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/work-orders/:id/demo-outreach", (req, res) => {
  const result = simulateVendorOutreach(req.params.id);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/work-orders/:id/select-quote", (req, res) => {
  const result = selectDemoQuote(req.params.id, req.body.quoteId);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.get("/api/work-orders/:id/live-calls", (req, res) => {
  const result = getLiveCalls(req.params.id);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/work-orders/:id/live-calls/:callId/listen", (req, res) => {
  const result = listenToCall(req.params.id, req.params.callId, req.body.actorId);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/work-orders/:id/live-calls/:callId/takeover", (req, res) => {
  const result = takeOverCall(req.params.id, req.params.callId, req.body.actorId);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/work-orders/:id/full-flow-demo", (req, res) => {
  const result = runFullFlowDemo(req.params.id);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.patch("/api/invoices/:id", (req, res) => {
  const invoice = invoices.find((item) => item.id === req.params.id);
  if (!invoice) {
    res.status(404).json({ error: "invoice not found" });
    return;
  }
  Object.assign(invoice, req.body);
  saveState();
  recordAudit("owner", "Updated invoice", `${invoice.id} set to ${invoice.status}.`);
  res.json({ invoice });
});

function accountForProperty(propertyId) {
  const property = properties.find((item) => item.id === propertyId);
  return accounts.find((item) => item.id === property?.accountId);
}

function getInvoiceRecipient(property) {
  const manager = people.find((person) => person.id === property?.managerId) || people.find((person) => person.id === property?.adminId);
  const owner = people.find((person) => person.id === property?.ownerId);
  const person = manager || owner || {};
  return {
    name: person.name || "Property manager",
    phone: person.phone || "",
    email: person.email || ""
  };
}

function updateBillingPayer({ account, property, payerRole, payerPersonId }) {
  if (payerRole) {
    account.billingPayerRole = payerRole;
    if (property) property.billingPayerRole = payerRole;
  }
  if (payerPersonId) {
    account.billingPayerPersonId = payerPersonId;
    if (property) property.billingPayerPersonId = payerPersonId;
  }
}

function accountBillingSetupStatus(account) {
  if (!account) return "Needs card";
  return account.billingSetupStatus || (account.stripeCustomerId ? "Card on file" : "Needs card");
}

function verifyStripeSignature(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const signature = String(req.headers["stripe-signature"] || "");
  const timestamp = signature.match(/t=([^,]+)/)?.[1];
  const signed = signature.match(/v1=([^,]+)/)?.[1];
  if (!timestamp || !signed) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${req.body.toString("utf8")}`).digest("hex");
  return safeEqualHex(signed, expected);
}

function safeEqualHex(left, right) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function handleStripeWebhookEvent(event) {
  if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
    const invoice = event.data?.object || {};
    const billingEvent = billingEvents.find((item) => item.stripeInvoiceId === invoice.id);
    if (!billingEvent) return;
    const paid = event.type === "invoice.payment_succeeded";
    billingEvent.status = paid ? "Paid" : "Payment failed";
    billingEvent.stripeInvoiceUrl = invoice.hosted_invoice_url || billingEvent.stripeInvoiceUrl;
    billingEvent.note = paid ? "Stripe collected the dispatch coordination fee." : "Stripe could not collect the dispatch coordination fee.";
    const order = workOrders.find((item) => item.id === billingEvent.orderId);
    if (order) {
      order.dispatchFee = {
        ...(order.dispatchFee || {}),
        status: billingEvent.status,
        amount: billingEvent.amount,
        billingEventId: billingEvent.id,
        stripeInvoiceId: invoice.id
      };
    }
    recordAudit("stripe", paid ? "Dispatch fee paid" : "Dispatch fee payment failed", `${billingEvent.orderId}: ${billingEvent.status}.`);
  }
  if (event.type === "checkout.session.completed" || event.type === "setup_intent.succeeded") {
    const object = event.data?.object || {};
    const accountId = object.metadata?.accountId;
    const customerId = object.customer;
    const account = accounts.find((item) => item.id === accountId || item.stripeCustomerId === customerId);
    if (account) {
      account.billingSetupStatus = "Card on file";
      if (customerId) account.stripeCustomerId = customerId;
      properties
        .filter((property) => property.accountId === account.id)
        .forEach((property) => {
          property.billingSetupStatus = "Card on file";
        });
    }
    recordAudit("stripe", "Billing setup completed", account?.name || customerId || "Customer payment method saved.");
  }
}

async function recordDispatchBillingEvent({ account, property, order, actor }) {
  const existing = billingEvents.find((event) => event.orderId === order.id && event.type === "dispatch_fee");
  if (existing) return existing;
  const payerRole = property?.billingPayerRole || account?.billingPayerRole || "Owner";
  const billingEvent = {
    id: `bill-${billingEvents.length + 1}`,
    type: "dispatch_fee",
    accountId: account?.id,
    propertyId: property?.id,
    orderId: order.id,
    amount: dispatchFeeCents / 100,
    payerRole,
    status: "Pending",
    note: "$25 coordination fee for intake and vendor outreach once a vendor is booked.",
    createdAt: new Date().toISOString()
  };
  try {
    const stripeInvoice = await chargeStripeDispatchFee({ account, property, order });
    billingEvent.status = "Submitted to Stripe";
    billingEvent.stripeInvoiceId = stripeInvoice.id;
    billingEvent.stripeInvoiceUrl = stripeInvoice.hosted_invoice_url;
    order.dispatchFee = {
      status: "Submitted to Stripe",
      amount: dispatchFeeCents / 100,
      billingEventId: billingEvent.id,
      stripeInvoiceId: stripeInvoice.id
    };
  } catch (error) {
    billingEvent.status = "Needs billing setup";
    billingEvent.note = error.message;
    order.dispatchFee = {
      status: "Needs billing setup",
      amount: dispatchFeeCents / 100,
      billingEventId: billingEvent.id,
      reason: error.message
    };
  }
  billingEvents.unshift(billingEvent);
  recordAudit(actor, "Recorded dispatch fee", `${order.id} ${billingEvent.status}: ${billingEvent.note}`);
  return billingEvent;
}

app.post("/api/properties/:id/tax-bundle", (req, res) => {
  const year = req.body.year || "2026";
  const summary = recordTaxBundleAudit(req.params.id, year);
  res.json({ ...summary, count: summary.invoices.length });
});

app.get("/api/properties/:id/tax-summary", (req, res) => {
  res.json(buildTaxSummary(req.params.id, req.query.year || "2026"));
});

app.get("/api/properties/:id/tax-spreadsheet.csv", (req, res) => {
  const year = req.query.year || "2026";
  const csv = buildTaxCsv(req.params.id, year);
  res.header("content-type", "text/csv");
  res.attachment(`livingrelay-${req.params.id}-${year}-expenses.csv`);
  res.send(csv);
});

app.post("/api/messages/send", async (req, res) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      res.status(400).json({ error: "to and body are required" });
      return;
    }
    const result = await sendSms({ to, body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/twilio/inbound", async (req, res) => {
  try {
    const from = req.body.From;
    const body = req.body.Body || "";
    const mediaItems = extractTwilioMedia(req.body);
    const outcome = await handleInboundCommand({ from, body, mediaItems });

    for (const action of outcome.actions) {
      if (action.type === "call_vendor_quotes") {
        const quoteResult = await startVendorQuoteCalls(action.orderId);
        if (!quoteResult.started && quoteResult.reason) {
          console.log(`[Vendor quote calls skipped] ${quoteResult.reason}`);
        }
        continue;
      }
      const outbound = composeActionMessage(action);
      if (outbound) {
        try {
          await sendSms(outbound);
        } catch (error) {
          console.log(`[SMS skipped] ${error.message}`);
        }
      }
    }
    saveState();

    res.type("text/xml").send(`
      <Response>
        <Message>${escapeXml(outcome.response)}</Message>
      </Response>
    `.trim());
  } catch (error) {
    res.type("text/xml").status(500).send(`
      <Response>
        <Message>LivingRelay hit an error processing this message.</Message>
      </Response>
    `.trim());
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(distDir, "index.html"));
});

function extractTwilioMedia(body) {
  const count = Number(body.NumMedia || 0);
  return Array.from({ length: count }).map((_, index) => ({
    url: body[`MediaUrl${index}`],
    contentType: body[`MediaContentType${index}`],
    receivedAt: new Date().toISOString()
  })).filter((item) => item.url);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const server = app.listen(port, () => {
  console.log(`LivingRelay API running on http://127.0.0.1:${port}`);
});
server.ref();
const keepAlive = setInterval(() => {}, 2147483647);
server.on("close", () => clearInterval(keepAlive));
