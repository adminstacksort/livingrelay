# Global Improvements

## SES Feedback SNS Confirmation

Status: follow-up needed.

LivingRelay is now deployed with SES outbound email enabled in production, account-level SES suppression for bounces and complaints, and SES feedback forwarding re-enabled as a fallback. The app has a deployed `POST /api/ses/notifications` endpoint that records SES bounce/complaint SNS notifications into the app email suppression list.

Open issue: the SNS HTTPS subscription for `arn:aws:sns:us-east-1:365609840635:livingrelay-ses-feedback` remains `PendingConfirmation`. Attempts with query-token endpoints, path-token endpoints, `app.livingrelay.com`, and `livingrelay.com` did not confirm, even though direct POST checks reach the production endpoint.

Future work:

- Enable SNS HTTP/S delivery status logging for the `livingrelay-ses-feedback` topic to see the exact delivery status and response body for subscription confirmation attempts.
- This likely requires a narrow IAM `iam:PassRole` permission for the SNS delivery logging role. The attempted policy change was blocked by safety review, so handle it explicitly in AWS IAM or with approved operator action.
- After delivery logs are available, retry subscription confirmation and remove stale pending HTTPS subscriptions.
- Once the SNS subscription is confirmed and bounce/complaint ingestion is verified with SES mailbox simulator events, consider disabling SES feedback forwarding again.

Current fallback:

- SES account suppression is enabled for `BOUNCE` and `COMPLAINT`.
- SES feedback forwarding is enabled so bounce/complaint notices are still delivered outside the app while the SNS subscription is pending.
