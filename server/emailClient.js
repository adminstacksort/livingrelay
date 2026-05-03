const sendGridApiKeys = ["TWILIO_SENDGRID_API_KEY", "SENDGRID_API_KEY"];

export function getEmailStatus() {
  const apiKeyName = sendGridApiKeys.find((key) => process.env[key]);
  return {
    configured: Boolean(apiKeyName),
    provider: "twilio_sendgrid",
    apiKey: apiKeyName || null,
    from: getFromEmail()
  };
}

export async function sendEmail({ to, subject, text, from }) {
  const status = getEmailStatus();
  if (!status.configured) {
    return { sent: false, reason: "email_not_configured:twilio_sendgrid" };
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env[status.apiKey]}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: parseFromEmail(from || status.from),
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
  return process.env.TWILIO_SENDGRID_FROM_EMAIL
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
