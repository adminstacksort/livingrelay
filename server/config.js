import { getPostgresStatus, getRuntimeEnvironment, getStateId } from "./postgresState.js";
import { getTwilioStatus } from "./twilioClient.js";
import { platformSettings } from "./data.js";

const productionRequired = [
  "APP_PUBLIC_URL",
  "DATABASE_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_NUMBER",
  "ANTHROPIC_API_KEY",
  "SESSION_SECRET"
];

export function getGooglePlacesApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY || "";
}

export async function getReadiness() {
  const missing = productionRequired.filter((key) => !process.env[key]);
  const googlePlacesConfigured = Boolean(getGooglePlacesApiKey());
  if (!googlePlacesConfigured) missing.push("GOOGLE_PLACES_API_KEY");
  const database = await getPostgresStatus();
  const twilio = getTwilioStatus();
  const vendorCallsEnabled = process.env.ENABLE_VENDOR_CALLS === "true";
  const elevenLabsMissing = vendorCallsEnabled
    ? [
      ...["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_AGENT_PHONE_NUMBER_ID"].filter((key) => !process.env[key]),
      ...(process.env.NODE_ENV === "production" && !process.env.ELEVENLABS_WEBHOOK_SECRET ? ["ELEVENLABS_WEBHOOK_SECRET"] : [])
    ]
    : [];

  return {
    ok: missing.length === 0 && database.ok && twilio.configured && elevenLabsMissing.length === 0,
    environment: getRuntimeEnvironment(),
    nodeEnv: process.env.NODE_ENV || "development",
    stateId: getStateId(),
    appUrl: process.env.APP_PUBLIC_URL || "http://127.0.0.1:5173",
    missing,
    database,
    twilio,
    ai: {
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
    },
    places: {
      googleConfigured: googlePlacesConfigured
    },
    vendorCalls: {
      enabled: vendorCallsEnabled,
      missing: elevenLabsMissing,
      testMode: platformSettings.vendorCallTestMode !== false || process.env.VENDOR_CALL_TEST_MODE === "true",
      productionEnabled: platformSettings.productionVendorCallsEnabled !== false,
      testNumberConfigured: Boolean(platformSettings.vendorCallTestNumber || process.env.VENDOR_CALL_TEST_NUMBER)
    }
  };
}
