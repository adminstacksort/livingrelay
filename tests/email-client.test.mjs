import assert from "node:assert/strict";
import test from "node:test";
import { emailSuppressions } from "../server/data.js";
import { getEmailStatus, recordSesNotification, sendEmail } from "../server/emailClient.js";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

test.beforeEach(() => {
  emailSuppressions.splice(0);
});

test.afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
  emailSuppressions.splice(0);
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

test("SES can be selected without disabling existing fallback providers", () => {
  process.env = {
    ...originalEnv,
    EMAIL_PROVIDER: "ses",
    AWS_SES_REGION: "us-east-1",
    AWS_SES_FROM_EMAIL: "LivingRelay <support@livingrelay.com>",
    AWS_ACCESS_KEY_ID: "test-access-key",
    AWS_SECRET_ACCESS_KEY: "test-secret-key",
    RESEND_API_KEY: "test-resend-key"
  };

  const status = getEmailStatus();

  assert.equal(status.configured, true);
  assert.equal(status.provider, "ses");
  assert.equal(status.from, "LivingRelay <support@livingrelay.com>");
});

test("SES sends include the approved sender and AWS signature headers", async () => {
  const requests = [];
  process.env = {
    ...originalEnv,
    EMAIL_PROVIDER: "ses",
    AWS_SES_REGION: "us-east-1",
    AWS_SES_FROM_EMAIL: "LivingRelay <support@livingrelay.com>",
    AWS_ACCESS_KEY_ID: "test-access-key",
    AWS_SECRET_ACCESS_KEY: "test-secret-key",
    SES_MAX_SEND_RATE_PER_SECOND: "1000"
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ MessageId: "ses-message-1" }), { status: 200 });
  };

  const result = await sendEmail({
    to: "admin@example.com",
    subject: "New LivingRelay sales lead",
    text: "A new LivingRelay sales lead was submitted."
  });

  assert.equal(result.sent, true);
  assert.equal(result.id, "ses-message-1");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://ses.us-east-1.amazonaws.com/v2/email/outbound-emails");
  assert.equal(requests[0].body.FromEmailAddress, "LivingRelay <support@livingrelay.com>");
  assert.ok(requests[0].options.headers.Authorization.startsWith("AWS4-HMAC-SHA256"));
});

test("SES readiness reports missing credentials and sender", () => {
  process.env = {
    ...originalEnv,
    EMAIL_PROVIDER: "ses",
    AWS_SES_REGION: "us-east-1",
    AWS_SES_FROM_EMAIL: "",
    SES_FROM_EMAIL: "",
    NOTIFICATIONS_FROM_EMAIL: "",
    AWS_ACCESS_KEY_ID: "",
    AWS_SECRET_ACCESS_KEY: "",
    AWS_CONTAINER_CREDENTIALS_RELATIVE_URI: "",
    AWS_CONTAINER_CREDENTIALS_FULL_URI: ""
  };

  const status = getEmailStatus();

  assert.equal(status.configured, false);
  assert.equal(status.provider, "ses");
  assert.deepEqual(status.missing, [
    "AWS_SES_FROM_EMAIL or SES_FROM_EMAIL or NOTIFICATIONS_FROM_EMAIL",
    "AWS credentials or ECS task role credentials"
  ]);
});

test("SES bounce notifications suppress future sends to bounced recipients", async () => {
  process.env = {
    ...originalEnv,
    EMAIL_CLIENT_DISABLE_STATE_SAVE: "true",
    RESEND_API_KEY: "test-resend-key",
    RESEND_FROM_EMAIL: "LivingRelay <support@livingrelay.com>"
  };
  recordSesNotification({
    eventType: "Bounce",
    mail: { messageId: "ses-message-1" },
    bounce: {
      bouncedRecipients: [{ emailAddress: "Admin@Example.com" }]
    }
  });
  globalThis.fetch = async () => {
    throw new Error("suppressed email should not call provider");
  };

  const result = await sendEmail({
    to: "admin@example.com",
    subject: "New LivingRelay sales lead",
    text: "A new LivingRelay sales lead was submitted."
  });

  assert.equal(result.sent, false);
  assert.equal(result.reason, "email_suppressed:bounce");
});
