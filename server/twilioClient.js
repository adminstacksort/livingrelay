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

export function getTwilioClient() {
  const status = getTwilioStatus();
  if (!status.configured) {
    throw new Error(`Missing Twilio env: ${status.missing.join(", ")}`);
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function startVoiceCall({ to, url, statusCallback, machineDetection = "DetectMessageEnd" }) {
  const client = getTwilioClient();
  const call = await client.calls.create({
    from: process.env.TWILIO_VOICE_NUMBER || process.env.TWILIO_MESSAGING_NUMBER,
    to,
    url,
    method: "POST",
    statusCallback,
    statusCallbackMethod: "POST",
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    machineDetection
  });
  return {
    sid: call.sid,
    status: call.status,
    to,
    url
  };
}

export async function callManagerForListenIn({ to, twimlUrl, statusCallback }) {
  const client = getTwilioClient();
  const call = await client.calls.create({
    from: process.env.TWILIO_VOICE_NUMBER || process.env.TWILIO_MESSAGING_NUMBER,
    to,
    url: twimlUrl,
    method: "POST",
    statusCallback,
    statusCallbackMethod: "POST",
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"]
  });
  return {
    sid: call.sid,
    status: call.status,
    to,
    url: twimlUrl
  };
}

export async function redirectLiveCall({ callSid, twimlUrl }) {
  const client = getTwilioClient();
  const call = await client.calls(callSid).update({
    url: twimlUrl,
    method: "POST"
  });
  return {
    sid: call.sid,
    status: call.status,
    url: twimlUrl
  };
}
