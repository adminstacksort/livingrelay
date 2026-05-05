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
