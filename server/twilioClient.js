import twilio from "twilio";

const required = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"];

export function getTwilioStatus() {
  const missing = required.filter((key) => !process.env[key]);
  const hasSender = Boolean(process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_MESSAGING_NUMBER);
  if (!hasSender) missing.push("TWILIO_MESSAGING_SERVICE_SID or TWILIO_MESSAGING_NUMBER");
  const verifyMissing = required.filter((key) => !process.env[key]);
  if (!process.env.TWILIO_VERIFY_SERVICE_SID) verifyMissing.push("TWILIO_VERIFY_SERVICE_SID");
  return {
    configured: missing.length === 0,
    missing,
    from: process.env.TWILIO_MESSAGING_NUMBER || null,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || null,
    senderMode: process.env.TWILIO_MESSAGING_SERVICE_SID ? "messaging_service" : "phone_number",
    verify: {
      configured: verifyMissing.length === 0,
      missing: verifyMissing,
      serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID || null
    }
  };
}

export async function sendTwilioSms({ to, body }) {
  const status = getTwilioStatus();
  if (!status.configured) {
    return { sent: false, error: `Missing Twilio env: ${status.missing.join(", ")}` };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const message = {
    to,
    body
  };
  if (process.env.TWILIO_STATUS_CALLBACK_URL) {
    message.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
  }
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    message.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  } else {
    message.from = process.env.TWILIO_MESSAGING_NUMBER;
  }
  try {
    const result = await client.messages.create(message);

    return {
      sent: true,
      provider: "twilio",
      sid: result.sid,
      status: result.status,
      to,
      body,
      senderMode: status.senderMode,
      messagingServiceSid: status.messagingServiceSid
    };
  } catch (error) {
    return {
      sent: false,
      provider: "twilio",
      error: error.message,
      errorCode: error.code,
      status: error.status,
      to,
      senderMode: status.senderMode,
      messagingServiceSid: status.messagingServiceSid
    };
  }
}

export const sendSms = sendTwilioSms;

export async function getSmsMessageStatus(messageSid) {
  const client = getTwilioClient();
  const message = await client.messages(messageSid).fetch();
  return {
    sid: message.sid,
    status: message.status,
    errorCode: message.errorCode,
    errorMessage: message.errorMessage || "",
    dateSent: message.dateSent
  };
}

export async function startPhoneVerificationSms({ to }) {
  const client = getTwilioVerifyClient();
  const serviceSid = getTwilioVerifyServiceSid();
  const verification = await client.verify.v2.services(serviceSid).verifications.create({
    to,
    channel: "sms"
  });
  return {
    sent: true,
    provider: "twilio_verify",
    sid: verification.sid,
    status: verification.status,
    to,
    channel: verification.channel
  };
}

export async function checkPhoneVerificationSms({ to, code }) {
  const client = getTwilioVerifyClient();
  const serviceSid = getTwilioVerifyServiceSid();
  const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
    to,
    code
  });
  return {
    approved: check.status === "approved",
    provider: "twilio_verify",
    sid: check.sid,
    status: check.status,
    to
  };
}

export function getTwilioClient() {
  const status = getTwilioStatus();
  if (!status.configured) {
    throw new Error(`Missing Twilio env: ${status.missing.join(", ")}`);
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function getTwilioVerifyClient() {
  const missing = required.filter((key) => !process.env[key]);
  if (!process.env.TWILIO_VERIFY_SERVICE_SID) missing.push("TWILIO_VERIFY_SERVICE_SID");
  if (missing.length > 0) {
    throw new Error(`Missing Twilio Verify env: ${missing.join(", ")}`);
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function getTwilioVerifyServiceSid() {
  if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
    throw new Error("Missing Twilio Verify env: TWILIO_VERIFY_SERVICE_SID");
  }
  return process.env.TWILIO_VERIFY_SERVICE_SID;
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
