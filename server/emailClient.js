const resendApiKeys = ["RESEND_API_KEY"];
const sendGridApiKeys = ["TWILIO_SENDGRID_API_KEY", "SENDGRID_API_KEY"];

export function getEmailStatus() {
  const resendKeyName = resendApiKeys.find((key) => process.env[key]);
  if (resendKeyName) {
    return {
      configured: true,
      provider: "resend",
      apiKey: resendKeyName,
      from: getFromEmail()
    };
  }

  const apiKeyName = sendGridApiKeys.find((key) => process.env[key]);
  return {
    configured: Boolean(apiKeyName),
    provider: apiKeyName ? "twilio_sendgrid" : "none",
    apiKey: apiKeyName || null,
    from: getFromEmail()
  };
}

export async function sendEmail({ to, subject, text, from }) {
  const status = getEmailStatus();
  if (!status.configured) {
    return { sent: false, reason: "email_not_configured" };
  }

  if (status.provider === "resend") {
    return sendResendEmail({ apiKey: process.env[status.apiKey], to, subject, text, from: from || status.from });
  }

  return sendSendGridEmail({ apiKey: process.env[status.apiKey], to, subject, text, from: from || status.from });
}

async function sendResendEmail({ apiKey, to, subject, text, from }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { sent: false, reason: data.message || data.error || `email_failed_${response.status}` };
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

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL
    || process.env.TWILIO_SENDGRID_FROM_EMAIL
    || process.env.SENDGRID_FROM_EMAIL
    || process.env.NOTIFICATIONS_FROM_EMAIL
    || "LivingRelay <support@livingrelay.com>";
}

function parseFromEmail(value = "") {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim() || "LivingRelay", email: match[2].trim() };
  }
  return { email: trimmed || "support@livingrelay.com", name: "LivingRelay" };
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
