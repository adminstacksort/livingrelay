import "dotenv/config";
import express from "express";
import { auditLog, invoices, people, properties, recordAudit, saveState, vendors, workOrders } from "./data.js";
import { composeActionMessage, handleInboundCommand } from "./smsLogic.js";
import { getTwilioStatus, sendSms } from "./twilioClient.js";
import { startVendorQuoteCalls } from "./elevenLabsCalls.js";

const app = express();
const port = Number(process.env.SERVER_PORT || 8787);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "LivingRelay API", twilio: getTwilioStatus() });
});

app.get("/api/state", (req, res) => {
  res.json({ people, properties, vendors, workOrders, invoices, auditLog, twilio: getTwilioStatus() });
});

app.post("/api/admin/properties", (req, res) => {
  const { name, address, units = "", adminId = "admin-1", ownerId = "owner-1" } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const property = {
    id: `p-${properties.length + 1}`,
    name,
    address: address || "",
    subscription: "Trial needs payment",
    plan: "Payment required before tenant SMS goes live",
    units: String(units).split(",").map((unit) => unit.trim()).filter(Boolean),
    adminId,
    managerId: adminId,
    ownerId,
    approvalThreshold: 250,
    rules: "Admin is the default manager. Configure vendor and approval rules before live dispatch."
  };
  properties.push(property);
  const admin = people.find((person) => person.id === adminId);
  if (admin && !admin.propertyIds.includes(property.id)) admin.propertyIds.push(property.id);
  saveState();
  recordAudit("admin", "Created property", `${name} created with admin as default manager.`);
  res.json({ property });
});

app.post("/api/admin/people", (req, res) => {
  const { name, role, phone, pin, propertyId, unit, trade } = req.body;
  if (!name || !role || !phone || !propertyId) {
    res.status(400).json({ error: "name, role, phone, and propertyId are required" });
    return;
  }
  const person = {
    id: `${role.toLowerCase()}-${people.length + 1}`,
    name,
    role,
    phone,
    pin: pin || String(Math.floor(1000 + Math.random() * 9000)),
    propertyIds: [propertyId],
    unit: role === "Tenant" ? unit : undefined,
    trade: role === "Vendor" ? trade : undefined,
    notify: ["Admin", "Owner"].includes(role) ? { tenantReports: true, everyUpdate: role === "Admin", keyUpdates: true } : undefined
  };
  people.push(person);
  const property = properties.find((item) => item.id === propertyId);
  if (property && role === "Owner") property.ownerId = person.id;
  saveState();
  recordAudit("admin", "Added person", `${name} added as ${role}.`);
  res.json({ person });
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
  const invoice = {
    id: `inv-${invoices.length + 1}`,
    propertyId: order.propertyId,
    orderId: order.id,
    vendor: vendor?.name || "Vendor",
    amount: Number(req.body.amount || order.estimate || 0),
    status: "Sent to owner",
    taxYear: req.body.taxYear || "2026",
    receivedAt: new Date().toLocaleDateString(),
    note: req.body.note || "Payment remains off platform."
  };
  invoices.unshift(invoice);
  order.invoiceId = invoice.id;
  order.status = "Invoice received";
  saveState();
  recordAudit("manager", "Created invoice", `${invoice.id} for ${order.id}.`);
  res.json({ invoice, order });
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

app.post("/api/properties/:id/tax-bundle", (req, res) => {
  const year = req.body.year || "2026";
  const bundle = invoices.filter((invoice) => invoice.propertyId === req.params.id && invoice.taxYear === year);
  recordAudit("owner", "Generated tax bundle", `${bundle.length} invoices for ${year}.`);
  res.json({ year, count: bundle.length, invoices: bundle });
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
    const outcome = await handleInboundCommand({ from, body });

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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

app.listen(port, () => {
  console.log(`LivingRelay API running on http://127.0.0.1:${port}`);
});
