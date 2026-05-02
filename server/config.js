import { getPostgresStatus } from "./postgresState.js";
import { getTwilioStatus } from "./twilioClient.js";

const productionRequired = [
  "APP_PUBLIC_URL",
  "DATABASE_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_NUMBER",
  "ANTHROPIC_API_KEY",
  "SESSION_SECRET"
];

export async function getReadiness() {
  const missing = productionRequired.filter((key) => !process.env[key]);
  const database = await getPostgresStatus();
  const twilio = getTwilioStatus();
  const vendorCallsEnabled = process.env.ENABLE_VENDOR_CALLS === "true";
  const elevenLabsMissing = vendorCallsEnabled
    ? ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_AGENT_PHONE_NUMBER_ID"].filter((key) => !process.env[key])
    : [];

  return {
    ok: missing.length === 0 && database.ok && twilio.configured && elevenLabsMissing.length === 0,
    environment: process.env.NODE_ENV || "development",
    appUrl: process.env.APP_PUBLIC_URL || "http://127.0.0.1:5173",
    missing,
    database,
    twilio,
    ai: {
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
    },
    vendorCalls: {
      enabled: vendorCallsEnabled,
      missing: elevenLabsMissing
    }
  };
}
