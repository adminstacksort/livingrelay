import { randomBytes } from "node:crypto";
import { sendSms } from "./twilioClient.js";

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
    code,
    attempts: 0,
    expiresAt: Date.now() + challengeTtlMs
  };
  challenges.set(challengeId, challenge);

  const sms = await sendSms({
    to: normalizedPhone,
    body: `Your LivingRelay verification code is ${code}. It expires in 10 minutes.`
  });
  if (!sms.sent && process.env.NODE_ENV === "production") {
    challenges.delete(challengeId);
    const error = new Error("Could not send verification code. Try again later.");
    error.statusCode = 502;
    throw error;
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
  if (String(code || "").trim() !== challenge.code) {
    const error = new Error("Incorrect verification code.");
    error.statusCode = 401;
    throw error;
  }

  challenges.delete(challengeId);
  const token = randomToken(24);
  const verified = {
    token,
    phone: challenge.phone,
    purpose,
    subjectId,
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
  return process.env.NODE_ENV !== "production";
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
