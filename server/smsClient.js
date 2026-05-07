import { getAwsSmsStatus, sendAwsSms } from "./awsSmsClient.js";
import { getTwilioStatus, sendTwilioSms } from "./twilioClient.js";

export function getSmsStatus() {
  const twilio = getTwilioStatus();
  const aws = getAwsSmsStatus();
  return {
    provider: getPrimarySmsProvider(),
    fallbackProvider: getFallbackSmsProvider(),
    configured: isProviderConfigured(getPrimarySmsProvider(), { twilio, aws }),
    twilio,
    aws
  };
}

export function hasAwsSmsFallback() {
  return getFallbackSmsProvider() === "aws_sns" && getAwsSmsStatus().configured;
}

export async function sendSms({ to, body }) {
  const primary = getPrimarySmsProvider();
  const fallback = getFallbackSmsProvider();
  const primaryResult = await sendWithProvider(primary, { to, body });
  if (primaryResult.sent || !fallback || fallback === primary) return primaryResult;

  const fallbackResult = await sendWithProvider(fallback, { to, body });
  return {
    ...fallbackResult,
    fallbackFrom: primary,
    primaryError: primaryResult.error || primaryResult.status || "primary SMS provider failed"
  };
}

export async function sendSmsWithProvider(provider, { to, body }) {
  return sendWithProvider(provider, { to, body });
}

function sendWithProvider(provider, message) {
  if (provider === "aws_sns") return sendAwsSms(message);
  return sendTwilioSms(message);
}

function isProviderConfigured(provider, statuses) {
  if (provider === "aws_sns") return statuses.aws.configured;
  return statuses.twilio.configured;
}

function getPrimarySmsProvider() {
  return process.env.SMS_PROVIDER === "aws_sns" ? "aws_sns" : "twilio";
}

function getFallbackSmsProvider() {
  return process.env.SMS_FALLBACK_PROVIDER === "aws_sns" ? "aws_sns" : "";
}
