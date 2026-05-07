import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const regionKeys = ["AWS_SMS_REGION", "AWS_REGION", "AWS_DEFAULT_REGION"];

export function getAwsSmsStatus() {
  const region = getAwsSmsRegion();
  const missing = [];
  if (!region) missing.push("AWS_SMS_REGION or AWS_REGION");
  return {
    configured: missing.length === 0,
    missing,
    provider: "aws_sns",
    region,
    smsType: process.env.AWS_SNS_SMS_TYPE || "Transactional",
    senderId: process.env.AWS_SMS_SENDER_ID || null,
    dryRun: process.env.AWS_SMS_DRY_RUN === "true"
  };
}

export async function sendAwsSms({ to, body }) {
  const status = getAwsSmsStatus();
  if (!status.configured) {
    return { sent: false, provider: "aws_sns", error: `Missing AWS SMS env: ${status.missing.join(", ")}` };
  }
  if (status.dryRun) {
    return {
      sent: true,
      provider: "aws_sns",
      sid: "aws-sns-dry-run",
      status: "dry_run",
      to,
      body,
      region: status.region
    };
  }

  const client = new SNSClient({ region: status.region });
  try {
    const result = await client.send(new PublishCommand({
      PhoneNumber: to,
      Message: body,
      MessageAttributes: buildMessageAttributes(status)
    }));
    return {
      sent: true,
      provider: "aws_sns",
      sid: result.MessageId,
      status: "published",
      to,
      body,
      region: status.region
    };
  } catch (error) {
    return {
      sent: false,
      provider: "aws_sns",
      error: error.message,
      errorCode: error.name,
      status: error.$metadata?.httpStatusCode,
      to,
      region: status.region
    };
  }
}

function buildMessageAttributes(status) {
  const attributes = {
    "AWS.SNS.SMS.SMSType": {
      DataType: "String",
      StringValue: status.smsType
    }
  };
  if (status.senderId) {
    attributes["AWS.SNS.SMS.SenderID"] = {
      DataType: "String",
      StringValue: status.senderId
    };
  }
  return attributes;
}

function getAwsSmsRegion() {
  return regionKeys.map((key) => process.env[key]).find(Boolean) || "";
}
