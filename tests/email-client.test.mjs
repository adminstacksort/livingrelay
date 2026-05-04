import assert from "node:assert/strict";
import test from "node:test";
import { sendEmail } from "../server/emailClient.js";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

test("Resend uses the configured LivingRelay sender without falling back to onboarding", async () => {
  const requests = [];
  process.env = {
    ...originalEnv,
    RESEND_API_KEY: "test-resend-key",
    RESEND_FROM_EMAIL: "LivingRelay <support@livingrelay.com>",
    TWILIO_SENDGRID_API_KEY: "",
    SENDGRID_API_KEY: ""
  };
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ message: "domain is not verified" }), { status: 403 });
  };

  const result = await sendEmail({
    to: "admin@example.com",
    subject: "New LivingRelay sales lead",
    text: "A new LivingRelay sales lead was submitted."
  });

  assert.equal(result.sent, false);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].from, "LivingRelay <support@livingrelay.com>");
});
