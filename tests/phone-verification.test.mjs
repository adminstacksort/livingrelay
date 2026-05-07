import assert from "node:assert/strict";
import test from "node:test";
import { createPhoneChallenge, verifyPhoneChallenge } from "../server/phoneVerification.js";

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

test("phone verification accepts pasted six-digit codes with separators", async () => {
  process.env = {
    ...originalEnv,
    NODE_ENV: "development",
    TWILIO_ACCOUNT_SID: "",
    TWILIO_AUTH_TOKEN: "",
    TWILIO_MESSAGING_NUMBER: "",
    TWILIO_MESSAGING_SERVICE_SID: "",
    PHONE_VERIFICATION_DEV_CODE: "true"
  };

  const challenge = await createPhoneChallenge({
    phone: "(310) 555-0104",
    purpose: "onboarding"
  });

  const result = verifyPhoneChallenge({
    challengeId: challenge.challengeId,
    code: `${challenge.devCode.slice(0, 3)}-${challenge.devCode.slice(3)}`,
    purpose: "onboarding"
  });

  assert.equal(result.phone, "+13105550104");
  assert.equal(typeof result.token, "string");
  assert.ok(result.token.length > 20);
});

test("production phone verification fails closed when Twilio is not configured", async () => {
  process.env = {
    ...originalEnv,
    NODE_ENV: "production",
    TWILIO_ACCOUNT_SID: "",
    TWILIO_AUTH_TOKEN: "",
    TWILIO_MESSAGING_NUMBER: "",
    TWILIO_MESSAGING_SERVICE_SID: ""
  };

  await assert.rejects(
    () => createPhoneChallenge({ phone: "(310) 555-0104", purpose: "onboarding" }),
    /Could not send verification code/
  );
});

test("production phone verification places a voice OTP call when voice provider is configured", async () => {
  process.env = {
    ...originalEnv,
    NODE_ENV: "production",
    PHONE_VERIFICATION_PROVIDER: "voice",
    TWILIO_ACCOUNT_SID: "AC123",
    TWILIO_AUTH_TOKEN: "secret",
    TWILIO_VOICE_NUMBER: "+13105550104",
    APP_PUBLIC_URL: "https://livingrelay.com",
    ELEVENLABS_API_KEY: "eleven-secret",
    PHONE_VERIFICATION_VOICE_DRY_RUN: "true"
  };

  const challenge = await createPhoneChallenge({ phone: "(310) 555-0104", purpose: "onboarding" });

  assert.equal(challenge.sms.provider, "elevenlabs_voice_otp");
  assert.equal(challenge.sms.delivery, "phone_call");
  assert.equal(challenge.sms.status, "dry_run");
});

test("production SMS verification can use AWS fallback when Twilio Verify is unavailable", async () => {
  process.env = {
    ...originalEnv,
    NODE_ENV: "production",
    PHONE_VERIFICATION_PROVIDER: "sms",
    TWILIO_ACCOUNT_SID: "AC123",
    TWILIO_AUTH_TOKEN: "secret",
    TWILIO_MESSAGING_NUMBER: "+13105550104",
    TWILIO_MESSAGING_SERVICE_SID: "MG123",
    TWILIO_VERIFY_SERVICE_SID: "",
    SMS_FALLBACK_PROVIDER: "aws_sns",
    AWS_SMS_REGION: "us-east-1",
    AWS_SMS_DRY_RUN: "true"
  };

  const challenge = await createPhoneChallenge({ phone: "(310) 555-0104", purpose: "onboarding" });

  assert.equal(challenge.sms.provider, "aws_sns");
  assert.equal(challenge.sms.status, "dry_run");
  assert.match(challenge.sms.body, /Your LivingRelay verification code is \d{6}/);
});

test("development phone verification fails closed unless dev-code fallback is explicit", async () => {
  process.env = {
    ...originalEnv,
    NODE_ENV: "development",
    TWILIO_ACCOUNT_SID: "",
    TWILIO_AUTH_TOKEN: "",
    TWILIO_MESSAGING_NUMBER: "",
    TWILIO_MESSAGING_SERVICE_SID: "",
    PHONE_VERIFICATION_DEV_CODE: ""
  };

  await assert.rejects(
    () => createPhoneChallenge({ phone: "(310) 555-0104", purpose: "onboarding" }),
    /Could not send verification code/
  );
});
