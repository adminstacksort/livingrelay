import twilio from "twilio";

const required = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_MESSAGING_NUMBER"];

export function getTwilioStatus() {
  const missing = required.filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    missing,
    from: process.env.TWILIO_MESSAGING_NUMBER || null
  };
}

export async function sendSms({ to, body }) {
  const status = getTwilioStatus();
  if (!status.configured) {
    return { sent: false, error: `Missing Twilio env: ${status.missing.join(", ")}` };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const result = await client.messages.create({
    from: process.env.TWILIO_MESSAGING_NUMBER,
    to,
    body
  });

  return {
    sent: true,
    sid: result.sid,
    status: result.status,
    to,
    body
  };
}
