import "dotenv/config";
import express from "express";
import { invoices, people, properties, vendors, workOrders } from "./data.js";
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
  res.json({ people, properties, vendors, workOrders, invoices, twilio: getTwilioStatus() });
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
        await sendSms(outbound);
      }
    }

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
