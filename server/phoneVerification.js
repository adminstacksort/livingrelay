import { randomBytes } from "node:crypto";
import { checkPhoneVerificationSms, getSmsMessageStatus, startPhoneVerificationSms, sendSms } from "./twilioClient.js";

const challengeTtlMs = 10 * 60 * 1000;
const tokenTtlMs = 30 * 60 * 1000;
const maxAttempts = 5;
const challenges = new Map();
const verifiedTokens = new Map();

export function normalizePhone(phone = "") {
  const value = String(phone).trim();
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

export function phoneMatches(left, right) {
  const normalizedLeft = normalizePhone(left);
  const normalizedRight = normalizePhone(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight || normalizedLeft.endsWith(normalizedRight.slice(-10)) || normalizedRight.endsWith(normalizedLeft.slice(-10));
}

export async function createPhoneChallenge({ phone, purpose, subjectId = "" }) {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 10) {
    const error = new Error("Enter a valid phone number before requesting a verification code.");
    error.statusCode = 400;
    throw error;
  }

  pruneExpired();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const challengeId = randomToken(16);
  const challenge = {
    id: challengeId,
    phone: normalizedPhone,
    purpose,
    subjectId,
    provider: useTwilioVerify() ? "twilio_verify" : "livingrelay_sms",
    code,
    attempts: 0,
    expiresAt: Date.now() + challengeTtlMs
  };
  challenges.set(challengeId, challenge);

  let sms;
  try {
    sms = challenge.provider === "twilio_verify"
      ? await startPhoneVerificationSms({ to: normalizedPhone })
      : await startLivingRelaySmsVerification({ to: normalizedPhone, code });
  } catch (error) {
    challenges.delete(challengeId);
    const wrapped = new Error(error.message ? `Could not send verification code: ${error.message}` : "Could not send verification code. Try again later.");
    wrapped.statusCode = 502;
    throw wrapped;
  }
  if (!sms.sent && !allowDevCodeFallback(sms)) {
    challenges.delete(challengeId);
    const error = new Error(sms.error ? `Could not send verification code: ${sms.error}` : "Could not send verification code. Try again later.");
    error.statusCode = 502;
    throw error;
  }
  if (challenge.provider === "livingrelay_sms" && sms.sent && sms.sid) {
    const delivery = await waitForVerificationSmsStatus(sms.sid);
    sms.deliveryStatus = delivery.status;
    sms.errorCode = delivery.errorCode || sms.errorCode;
    sms.errorMessage = delivery.errorMessage || sms.errorMessage;
    if (["failed", "undelivered"].includes(String(delivery.status || "").toLowerCase())) {
      challenges.delete(challengeId);
      const error = new Error(twilioVerificationFailureDetail(delivery));
      error.statusCode = 502;
      throw error;
    }
  }

  return {
    challengeId,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    sms,
    devCode: exposeDevCode(sms) ? code : undefined
  };
}

export function verifyPhoneChallenge({ challengeId, code, purpose, subjectId = "" }) {
  pruneExpired();
  const verificationCode = normalizeVerificationCode(code);
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.purpose !== purpose || challenge.subjectId !== subjectId) {
    const error = new Error("Verification code expired. Request a new code.");
    error.statusCode = 400;
    throw error;
  }
  if (Date.now() > challenge.expiresAt) {
    challenges.delete(challengeId);
    const error = new Error("Verification code expired. Request a new code.");
    error.statusCode = 400;
    throw error;
  }
  challenge.attempts += 1;
  if (challenge.attempts > maxAttempts) {
    challenges.delete(challengeId);
    const error = new Error("Too many attempts. Request a new code.");
    error.statusCode = 429;
    throw error;
  }
  if (verificationCode.length !== 6) {
    const error = new Error("Incorrect verification code.");
    error.statusCode = 401;
    throw error;
  }
  if (challenge.provider === "twilio_verify") return verifyTwilioChallenge({ challenge, verificationCode });
  if (verificationCode !== challenge.code) {
    const error = new Error("Incorrect verification code.");
    error.statusCode = 401;
    throw error;
  }

  return approveChallenge(challenge);
}

async function verifyTwilioChallenge({ challenge, verificationCode }) {
  let result;
  try {
    result = await checkPhoneVerificationSms({ to: challenge.phone, code: verificationCode });
  } catch (error) {
    const wrapped = new Error(error.message ? `Could not verify that code: ${error.message}` : "Could not verify that code.");
    wrapped.statusCode = 502;
    throw wrapped;
  }
  if (!result.approved) {
    const error = new Error("Incorrect verification code.");
    error.statusCode = 401;
    throw error;
  }
  return approveChallenge(challenge);
}

function approveChallenge(challenge) {
  challenges.delete(challenge.id);
  const token = randomToken(24);
  const verified = {
    token,
    phone: challenge.phone,
    purpose: challenge.purpose,
    subjectId: challenge.subjectId,
    expiresAt: Date.now() + tokenTtlMs
  };
  verifiedTokens.set(token, verified);
  return {
    phone: verified.phone,
    token,
    expiresAt: new Date(verified.expiresAt).toISOString()
  };
}

export function consumeVerifiedPhoneToken({ token, phone, purpose, subjectId = "" }) {
  pruneExpired();
  const verified = verifiedTokens.get(token);
  if (!verified || verified.purpose !== purpose || verified.subjectId !== subjectId || !phoneMatches(verified.phone, phone)) {
    const error = new Error("Phone verification is required before continuing.");
    error.statusCode = 401;
    throw error;
  }
  verifiedTokens.delete(token);
  return verified;
}

function exposeDevCode(sms) {
  return allowDevCodeFallback(sms);
}

function allowDevCodeFallback(sms) {
  return process.env.NODE_ENV !== "production"
    && process.env.PHONE_VERIFICATION_DEV_CODE === "true"
    && !sms.sent;
}

async function startLivingRelaySmsVerification({ to, code }) {
  return sendSms({
    to,
    body: `Your LivingRelay verification code is ${code}. It expires in 10 minutes.`
  });
}

function useTwilioVerify() {
  return Boolean(process.env.TWILIO_VERIFY_SERVICE_SID);
}

async function waitForVerificationSmsStatus(messageSid) {
  let latest = { sid: messageSid, status: "queued" };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
    latest = await getSmsMessageStatus(messageSid);
    const status = String(latest.status || "").toLowerCase();
    if (["delivered", "sent", "failed", "undelivered"].includes(status)) break;
  }
  return latest;
}

function twilioVerificationFailureDetail(status = {}) {
  if (Number(status.errorCode) === 30034) {
    return "Could not send verification code: Twilio blocked this SMS because the US A2P 10DLC campaign is not approved or not fully associated yet.";
  }
  return ["Could not send verification code", status.errorCode ? `Twilio ${status.errorCode}` : "", status.errorMessage || status.status || ""].filter(Boolean).join(": ");
}

function normalizeVerificationCode(code = "") {
  return String(code).replace(/\D/g, "").slice(0, 6);
}

function randomToken(bytes) {
  return randomBytes(bytes).toString("base64url");
}

function pruneExpired() {
  const now = Date.now();
  for (const [id, challenge] of challenges) {
    if (challenge.expiresAt <= now) challenges.delete(id);
  }
  for (const [token, verified] of verifiedTokens) {
    if (verified.expiresAt <= now) verifiedTokens.delete(token);
  }
}
