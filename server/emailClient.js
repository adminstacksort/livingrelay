import { createHash, createHmac } from "node:crypto";
import { emailSuppressions, recordAudit, saveState } from "./data.js";

const sendGridApiKeys = ["TWILIO_SENDGRID_API_KEY", "SENDGRID_API_KEY"];
const sesProviders = new Set(["ses", "aws_ses", "amazon_ses"]);
let sesSendQueue = Promise.resolve();
let lastSesSendAt = 0;

export function getEmailStatus() {
  const providerPreference = String(process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  const sesFrom = getSesFromEmail();
  if (sesProviders.has(providerPreference) || (sesFrom && !process.env.RESEND_API_KEY && !findSendGridApiKey())) {
    const ses = getSesConfig();
    return {
      configured: ses.configured,
      provider: "ses",
      apiKey: null,
      from: ses.from,
      region: ses.region,
      missing: ses.missing,
      suppressions: emailSuppressions.length
    };
  }

  if (process.env.RESEND_API_KEY) {
    return {
      configured: true,
      provider: "resend",
      apiKey: "RESEND_API_KEY",
      from: getFromEmail(),
      missing: [],
      suppressions: emailSuppressions.length
    };
  }

  const apiKeyName = findSendGridApiKey();
  return {
    configured: Boolean(apiKeyName),
    provider: apiKeyName ? "twilio_sendgrid" : "ses_or_resend_or_twilio_sendgrid",
    apiKey: apiKeyName || null,
    from: getFromEmail(),
    missing: apiKeyName ? [] : ["EMAIL_PROVIDER=ses with AWS_SES_FROM_EMAIL, or RESEND_API_KEY, or TWILIO_SENDGRID_API_KEY, or SENDGRID_API_KEY"],
    suppressions: emailSuppressions.length
  };
}

export async function sendEmail({ to, subject, text, from }) {
  const recipient = normalizeEmail(to);
  if (!recipient) return { sent: false, reason: "invalid_recipient_email" };
  const suppression = findSuppression(recipient);
  if (suppression) return { sent: false, reason: `email_suppressed:${suppression.reason}` };

  const status = getEmailStatus();
  if (!status.configured) {
    return { sent: false, reason: `email_not_configured:${status.provider}` };
  }

  if (status.provider === "ses") {
    return sendSesEmail({ to: recipient, subject, text, from: from || status.from });
  }

  if (status.provider === "resend") {
    return sendResendEmail({ apiKey: process.env.RESEND_API_KEY, to: recipient, subject, text, from: from || status.from });
  }

  return sendSendGridEmail({ apiKey: process.env[status.apiKey], to: recipient, subject, text, from: from || status.from });
}

export function recordSesNotification(payload = {}) {
  const notification = parseSesNotification(payload);
  if (!notification.type) return { recorded: false, reason: "not_ses_feedback" };
  const now = new Date().toISOString();
  const added = [];
  for (const email of notification.recipients) {
    const normalized = normalizeEmail(email);
    if (!normalized) continue;
    const existing = findSuppression(normalized);
    if (existing) {
      existing.reason = notification.type;
      existing.provider = "ses";
      existing.updatedAt = now;
      existing.messageId = notification.messageId || existing.messageId || "";
    } else {
      emailSuppressions.unshift({
        email: normalized,
        reason: notification.type,
        provider: "ses",
        messageId: notification.messageId || "",
        createdAt: now,
        updatedAt: now
      });
      added.push(normalized);
    }
  }
  emailSuppressions.splice(500);
  if (process.env.EMAIL_CLIENT_DISABLE_STATE_SAVE !== "true") {
    recordAudit("Amazon SES", `Recorded ${notification.type}`, `${notification.recipients.length} recipient(s) from SES notification.`);
    saveState();
  }
  return { recorded: true, type: notification.type, recipients: notification.recipients.length, added: added.length };
}

async function sendSesEmail({ to, subject, text, from }) {
  const config = getSesConfig();
  if (!config.configured) return { sent: false, reason: `ses_not_configured:${config.missing.join(",")}` };
  try {
    return await throttleSesSend(async () => {
      const credentials = await getAwsCredentials();
      const body = JSON.stringify({
        FromEmailAddress: from || config.from,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject || "LivingRelay", Charset: "UTF-8" },
            Body: { Text: { Data: text || "", Charset: "UTF-8" } }
          }
        }
      });
      const response = await signedAwsFetch({
        service: "ses",
        region: config.region,
        method: "POST",
        path: "/v2/email/outbound-emails",
        body,
        credentials,
        headers: { "content-type": "application/json" }
      });
      const responseText = await response.text();
      const data = parseJsonResponse(responseText);
      if (!response.ok) {
        return { sent: false, reason: data.message || data.Message || data.__type || `email_failed_${response.status}` };
      }
      return { sent: true, id: data.MessageId || data.messageId || "sent" };
    });
  } catch (error) {
    return { sent: false, reason: error.message };
  }
}

async function sendResendEmail({ apiKey, to, subject, text, from }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: from || getFromEmail(),
      to: [to],
      subject,
      text
    })
  });

  const data = parseJsonResponse(await response.text());
  if (!response.ok) {
    return {
      sent: false,
      reason: data.message || data.error || `email_failed_${response.status}`
    };
  }

  return {
    sent: true,
    id: data.id || "sent"
  };
}

async function sendSendGridEmail({ apiKey, to, subject, text, from }) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: parseFromEmail(from),
      subject,
      content: [{ type: "text/plain", value: text }]
    })
  });

  const responseText = await response.text();
  if (!response.ok) {
    const reason = parseSendGridError(responseText) || `email_failed_${response.status}`;
    return { sent: false, reason };
  }

  return {
    sent: true,
    id: response.headers.get("x-message-id") || "sent"
  };
}

function getSesConfig() {
  const region = process.env.AWS_SES_REGION || process.env.AWS_REGION || "us-east-1";
  const from = getSesFromEmail() || process.env.NOTIFICATIONS_FROM_EMAIL || "";
  const hasCredentials = Boolean(
    process.env.AWS_ACCESS_KEY_ID
    || process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
    || process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI
  );
  const missing = [
    !region ? "AWS_SES_REGION or AWS_REGION" : "",
    !from ? "AWS_SES_FROM_EMAIL or SES_FROM_EMAIL or NOTIFICATIONS_FROM_EMAIL" : "",
    !hasCredentials ? "AWS credentials or ECS task role credentials" : ""
  ].filter(Boolean);
  return { configured: missing.length === 0, region, from, missing };
}

async function throttleSesSend(task) {
  const rate = Math.max(1, Number(process.env.SES_MAX_SEND_RATE_PER_SECOND || 14));
  const minimumDelayMs = Math.ceil(1000 / rate);
  const run = sesSendQueue
    .catch(() => {})
    .then(async () => {
      const waitMs = Math.max(0, minimumDelayMs - (Date.now() - lastSesSendAt));
      if (waitMs) await sleep(waitMs);
      lastSesSendAt = Date.now();
      return task();
    });
  sesSendQueue = run.then(() => {}, () => {});
  return run;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL
    || process.env.TWILIO_SENDGRID_FROM_EMAIL
    || process.env.SENDGRID_FROM_EMAIL
    || process.env.NOTIFICATIONS_FROM_EMAIL
    || process.env.AWS_SES_FROM_EMAIL
    || process.env.SES_FROM_EMAIL
    || "LivingRelay <support@livingrelay.com>";
}

function getSesFromEmail() {
  return process.env.AWS_SES_FROM_EMAIL || process.env.SES_FROM_EMAIL || "";
}

function findSendGridApiKey() {
  return sendGridApiKeys.find((key) => process.env[key]);
}

function parseFromEmail(value = "") {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim() || "LivingRelay", email: match[2].trim() };
  }
  return { email: trimmed || "support@livingrelay.com", name: "LivingRelay" };
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

function findSuppression(email) {
  return emailSuppressions.find((item) => normalizeEmail(item.email) === email);
}

function parseSesNotification(payload = {}) {
  const eventType = String(payload.eventType || payload.notificationType || "").toLowerCase();
  if (eventType === "bounce") {
    return {
      type: "bounce",
      messageId: payload.mail?.messageId || "",
      recipients: (payload.bounce?.bouncedRecipients || []).map((item) => item.emailAddress).filter(Boolean)
    };
  }
  if (eventType === "complaint") {
    return {
      type: "complaint",
      messageId: payload.mail?.messageId || "",
      recipients: (payload.complaint?.complainedRecipients || []).map((item) => item.emailAddress).filter(Boolean)
    };
  }
  return { type: "", recipients: [] };
}

async function getAwsCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN || ""
    };
  }

  const relativeUri = process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI;
  const fullUri = process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI;
  if (!relativeUri && !fullUri) throw new Error("AWS credentials are not available");
  const url = fullUri || `http://169.254.170.2${relativeUri}`;
  const headers = {};
  if (process.env.AWS_CONTAINER_AUTHORIZATION_TOKEN) {
    headers.Authorization = process.env.AWS_CONTAINER_AUTHORIZATION_TOKEN;
  }
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`AWS credential lookup failed: ${response.status}`);
  const data = await response.json();
  return {
    accessKeyId: data.AccessKeyId,
    secretAccessKey: data.SecretAccessKey,
    sessionToken: data.Token || ""
  };
}

async function signedAwsFetch({ service, region, method, path, body, credentials, headers = {} }) {
  const host = `${service}.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body || "");
  const signedHeadersMap = {
    host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    ...lowercaseHeaders(headers)
  };
  if (credentials.sessionToken) signedHeadersMap["x-amz-security-token"] = credentials.sessionToken;
  const signedHeaderNames = Object.keys(signedHeadersMap).sort();
  const canonicalHeaders = signedHeaderNames.map((key) => `${key}:${String(signedHeadersMap[key]).trim()}\n`).join("");
  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaderNames.join(";"),
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const signature = hmacHex(await getSignatureKey(credentials.secretAccessKey, dateStamp, region, service), stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaderNames.join(";")}, Signature=${signature}`;
  return fetch(`https://${host}${path}`, {
    method,
    headers: { ...signedHeadersMap, Authorization: authorization },
    body
  });
}

function lowercaseHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
}

function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key, value) {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

async function getSignatureKey(secretAccessKey, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

function parseJsonResponse(responseText = "") {
  if (!responseText) return {};
  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText.slice(0, 240) };
  }
}

function parseSendGridError(responseText = "") {
  if (!responseText) return "";
  try {
    const data = JSON.parse(responseText);
    return data.errors?.map((error) => error.message).filter(Boolean).join("; ") || data.message || "";
  } catch {
    return responseText.slice(0, 240);
  }
}
