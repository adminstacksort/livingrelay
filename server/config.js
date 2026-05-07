import { getPostgresStatus, getRuntimeEnvironment, getStateId } from "./postgresState.js";
import { getSmsStatus } from "./smsClient.js";
import { getTwilioStatus } from "./twilioClient.js";
import { getEmailStatus } from "./emailClient.js";
import { getOtpVoiceStatus } from "./elevenLabsCalls.js";
import { getPushStatus } from "./notifications.js";
import { platformSettings } from "./data.js";

const productionRequired = [
  "APP_PUBLIC_URL",
  "DATABASE_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "SESSION_SECRET"
];

const localRequired = [
  "APP_PUBLIC_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "SESSION_SECRET"
];

export function getGooglePlacesApiKey() {
  return process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY || "";
}

export async function getReadiness() {
  const environment = getRuntimeEnvironment();
  const strictReadiness = ["production", "staging"].includes(environment);
  const required = strictReadiness ? productionRequired : localRequired;
  const missing = required.filter((key) => !process.env[key]);
  const googlePlacesConfigured = Boolean(getGooglePlacesApiKey());
  if (!googlePlacesConfigured) missing.push("GOOGLE_PLACES_API_KEY");
  const database = await getPostgresStatus();
  const twilio = getTwilioStatus();
  const sms = getSmsStatus();
  if (!sms.configured) {
    const smsMissing = sms.provider === "aws_sns" ? sms.aws.missing : sms.twilio.missing;
    missing.push(...smsMissing.filter((key) => !missing.includes(key)));
  }
  const phoneVerificationProvider = process.env.PHONE_VERIFICATION_PROVIDER || (process.env.NODE_ENV === "production" ? "voice" : "sms");
  const voiceOtp = getOtpVoiceStatus();
  if (strictReadiness && phoneVerificationProvider === "voice" && !voiceOtp.configured) {
    missing.push(...voiceOtp.missing.filter((key) => !missing.includes(key)));
  }
  const email = getEmailStatus();
  if (strictReadiness && !email.configured) missing.push(...email.missing.filter((key) => !missing.includes(key)));
  const push = getPushStatus();
  const vendorCallsEnabled = process.env.ENABLE_VENDOR_CALLS === "true";
  const elevenLabsMissing = vendorCallsEnabled
    ? [
      ...["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_AGENT_PHONE_NUMBER_ID"].filter((key) => !process.env[key]),
      ...(process.env.NODE_ENV === "production" && !process.env.ELEVENLABS_WEBHOOK_SECRET ? ["ELEVENLABS_WEBHOOK_SECRET"] : [])
    ]
    : [];

  return {
    ok: missing.length === 0
      && (strictReadiness ? database.ok : true)
      && sms.configured
      && (strictReadiness && phoneVerificationProvider === "voice" ? voiceOtp.configured : true)
      && (strictReadiness ? email.configured : true)
      && elevenLabsMissing.length === 0,
    environment,
    nodeEnv: process.env.NODE_ENV || "development",
    stateId: getStateId(),
    appUrl: process.env.APP_PUBLIC_URL || "http://127.0.0.1:5173",
    missing,
    database,
    twilio,
    sms,
    phoneVerification: {
      provider: phoneVerificationProvider,
      voiceOtp
    },
    ai: {
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
    },
    places: {
      googleConfigured: googlePlacesConfigured
    },
    notifications: {
      emailConfigured: email.configured,
      emailProvider: email.provider,
      emailFrom: email.from,
      emailMissing: email.missing,
      iosPushConfigured: push.ios.configured,
      iosPushMissing: push.ios.missing,
      androidPushConfigured: push.android.configured,
      androidPushMissing: push.android.missing
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
