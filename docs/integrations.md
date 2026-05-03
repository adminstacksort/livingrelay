# Integrations

## Google Analytics

LivingRelay uses Google Analytics 4 through the frontend `gtag.js` integration.

Required environment-specific env:

```text
staging: VITE_GA_MEASUREMENT_ID=G-4EPQK851N0
production: VITE_GA_MEASUREMENT_ID=G-JK9RC1VEXR
```

The app sends page views for public pages, the unauthenticated app entry, and role-aware dashboard route changes. Leave the variable blank for local and dev so those visits are not counted.

## Twilio SMS

Use Twilio first for SMS. Voice can come after the SMS workflow is reliable.

### Required Credentials

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_MESSAGING_NUMBER
TWILIO_STATUS_CALLBACK_URL
```

### Local API

The local API runs on:

```text
http://127.0.0.1:8787
```

Health check:

```text
GET /api/health
```

Send test SMS:

```text
POST /api/messages/send
Content-Type: application/json

{
  "to": "+13105550104",
  "body": "Test from LivingRelay"
}
```

### Inbound SMS Webhook

Endpoint:

```text
POST /api/twilio/inbound
```

Expected Twilio fields:

- `From`
- `To`
- `Body`
- `MessageSid`
- `NumMedia`
- `MediaUrl0...`

App behavior:

1. Match `From` to a person phone number.
2. Resolve role and property/unit/vendor relationship.
3. If tenant: parse the issue, create or update a work order, use Anthropic to prepare 5 local vendor options with estimated ranges, and notify manager/owner based on each person's notification settings.
4. If manager: parse approval commands like `APPROVE`, `VENDOR 1`, `VENDOR 2`, `CALL ME`, `CLOSE`.
5. If owner: parse `APPROVE`, `DENY`, questions, and `PAID`.
6. If vendor: parse `ACCEPT`, `DECLINE`, ETA, invoice/photo messages.
7. Store every message on the work order timeline.

### Notification Settings

Admins and owners should be able to choose:

- Channels: email and native push. Email works for any role with an email address. iOS push uses registered APNs device tokens; Android tokens are stored with the same device shape for FCM rollout.
- Events: tenant logged request, vendors being contacted, vendor booked, issue resolved, owner paid, owner approval, and billing setup.

The default should be:

- manager: tenant request, vendor contact, vendor booked, issue resolved, owner paid, and billing setup.
- owner: tenant request, vendor booked, issue resolved, owner approval, and billing setup.
- tenant: vendor booked and issue resolved.
- vendor: vendor booked.

Tenant report notifications are informational unless the message is an explicit approval request.

### Anthropic Vendor Research

When a tenant reports an issue, LivingRelay can call Anthropic with web search enabled to find five local vendor options.

Required env:

```text
ANTHROPIC_API_KEY
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

If no Anthropic key is present, the app falls back to configured/demo vendors so local development still works.

The manager SMS includes:

- vendor name
- phone number
- estimated range
- availability note
- reply instructions, such as `VENDOR 1`

### ElevenLabs Vendor Quote Calls

After vendor options are prepared, LivingRelay can start outbound quote/availability calls through ElevenLabs Conversational AI.

Required env:

```text
ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID
ELEVENLABS_AGENT_PHONE_NUMBER_ID
ENABLE_VENDOR_CALLS=true
ELEVENLABS_WEBHOOK_SECRET
INBOUND_EMAIL_ADDRESS=invoices@livingrelay.com
```

Calls are disabled unless `ENABLE_VENDOR_CALLS=true`. This prevents accidental calls during development.

Safe test mode:

```text
VENDOR_CALL_TEST_MODE=true
VENDOR_CALL_TEST_NUMBER=+1YOURPHONE
```

When test mode is on, vendor outreach calls only the test number and labels the target as `Test vendor (...)`. Managers can also use the `Call me first` button, which calls their own login phone as the vendor. Leave `VENDOR_CALL_TEST_MODE=true` until at least one full call and post-call webhook lands correctly on a work order.

Vendor calls are gated in three places:

- Platform admin dashboard: global `Route vendor calls to test mode` and `Enable production vendor calls`.
- Customer account: `Enable production vendor calls`.
- Property manager dispatch settings: `Enable production vendor calls`.

Production vendor calls require all production toggles to be on. Test mode is a global safety override and routes calls to the configured test number or the manager’s own phone through `Call me first`.

Twilio-owned call mode:

```text
VENDOR_CALL_PROVIDER=twilio_register
TWILIO_VOICE_NUMBER=+1...
TWILIO_MEDIA_STREAM_URL=wss://your-media-relay.example.com/twilio/media
```

In this mode LivingRelay starts outbound voice calls through Twilio, Twilio calls back to `/api/twilio/elevenlabs/outbound`, and LivingRelay registers the answered call with ElevenLabs through `POST /v1/convai/twilio/register-call`. ElevenLabs returns TwiML, which LivingRelay returns to Twilio.

This gives LivingRelay ownership of the Twilio call lifecycle and prepares the listen-in path. LivingRelay now exposes a built-in media relay:

```text
wss://YOUR-API-HOST/api/media/twilio
wss://YOUR-API-HOST/api/media/listen
```

When using `twilio_register`, LivingRelay injects a Twilio `<Start><Stream track="both_tracks">` before the ElevenLabs TwiML. Twilio streams μ-law 8kHz audio into `/api/media/twilio`, and the manager `Audio` button opens `/api/media/listen` in the browser and plays the live audio. `TWILIO_MEDIA_STREAM_URL` is optional; set it only if the media relay runs on a separate host.

The manager `Join` button still dials the manager as a standby/coordinator path. Browser listen-in is handled by the `Audio` button.

Vendor outreach records:

- Every outbound vendor call creates/updates a `vendorOutreach.attempts[]` record on the work order.
- Attempts store vendor, phone, provider, status, call SID, conversation ID, transcript, summary/outcome, retry decision, and hold detection.
- ElevenLabs post-call webhooks append transcripts and structured outcomes.
- Twilio status callbacks mark calls as `completed`, `no-answer`, `busy`, `failed`, etc.
- No-answer/busy/failed/canceled attempts are queued for retry up to the property retry policy limit.
- Hold detection is transcript/summary based for now. If the transcript or outcome contains phrases such as `on hold`, `please hold`, or `all representatives are busy`, the attempt is marked `hold_timeout` and retried sooner. A future media classifier can feed the same field for stronger hold-music detection.

The ElevenLabs agent prompt should include this policy: if a property manager joins or is introduced, acknowledge them as the lead maintenance coordinator, defer decisions to them, and continue helping capture vendor details.

The ElevenLabs agent receives dynamic variables:

- work order ID
- property name/address
- unit
- trade
- urgency
- issue description
- estimated amount
- tenant name
- vendor name

The first agent goal should be: collect whether the vendor can take the job, earliest availability, rough quote/callout fee, and whether they need photos or access details.

Current dispatch workflow target:

1. Tenant reports an issue and LivingRelay starts safe troubleshooting.
2. Tenant confirms `STILL` or otherwise says it is not self-fixable.
3. LivingRelay prepares local vendor options through configured property preferences first, then Anthropic/web search fallbacks.
4. Property dispatch settings decide whether manager starts calls or calls can start automatically after approval rules clear.
5. ElevenLabs calls vendors in prioritized order for now. The call script captures availability, quote/callout fees, discounts, warranty, photo/access needs, and confirms invoices should go to the property manager, owner, and LivingRelay records unless the property has different instructions.
6. LivingRelay stores structured outcomes and recommends a vendor to the manager.
7. Manager and owner approval gates still apply before final booking.
8. Tenant confirms the proposed timing by text or web.
9. LivingRelay finalizes the vendor booking and tracks change events such as tenant cancellation, owner denial, or vendor scheduling issues.
10. Vendor closeout stores completion notes, work photos, warranty, invoice delivery, and off-platform payment tracking.

Useful SMS commands added for the dispatch loop:

- tenant: `AVAILABLE after 1 PM tomorrow`, `CONFIRM`, `CANCEL`
- manager: `APPROVE`, `VENDOR 1`, `CANCEL`, `CLOSE`
- owner: `APPROVE`, `DENY`, `CANCEL`, `PAID`
- vendor: `ACCEPT`, `DECLINE`, `ISSUE ...`

ElevenLabs result webhook:

```text
POST /api/elevenlabs/vendor-call-result
```

Payloads should include `work_order_id` plus any structured fields available: `vendor_name`, `phone`, `quote`, `availability`, `discount`, `warranty`, `needs_photos`, `invoice_email`, `invoice_recipients`, `invoice_delivery_instructions`, `conversation_id`, `call_sid`, and `summary`.

The endpoint accepts both the simple internal shape above and ElevenLabs post-call transcription/failure webhooks. In production, set `ELEVENLABS_WEBHOOK_SECRET`; the server verifies the `ElevenLabs-Signature` HMAC header before storing results.

Recommended first live test:

1. Set `ENABLE_VENDOR_CALLS=true`.
2. Set `VENDOR_CALL_TEST_MODE=true` and `VENDOR_CALL_TEST_NUMBER` to your phone.
3. Configure the ElevenLabs post-call webhook URL to `/api/elevenlabs/vendor-call-result`.
4. Open a work order and click `Call me first`.
5. Answer as if you are the vendor and provide availability, quote, discount, warranty, photo needs, and invoice-recipient confirmation.
6. Confirm the work order shows a structured vendor outcome before disabling test mode.

### Twilio Console Setup

Twilio cannot call `127.0.0.1` directly. For local testing, expose the API with a tunnel:

```bash
ngrok http 8787
```

or:

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

Then set the Twilio Messaging webhook for the LivingRelay number to:

```text
https://YOUR-TUNNEL-URL/api/twilio/inbound
```

Use `HTTP POST`.

### Outbound SMS

Function:

```text
sendSms({ to, body, workOrderId, messageType })
```

Message types:

- tenant_intake_followup
- tenant_status_update
- manager_review
- owner_approval
- vendor_dispatch
- invoice_reminder
- completion_confirmation

## Stripe Billing

Stripe stores the payer's payment method and charges LivingRelay's coordination fee only when vendor dispatch is booked.
Property creation, tenant/owner setup, tenant intake, and LLM-only advice are free. Vendor repair payments never run through LivingRelay in v1.

### Required Credentials

```text
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
APP_PUBLIC_URL
DISPATCH_FEE_CENTS=2500
OWNER_SUBSCRIPTION_AMOUNT_CENTS=9900
```

### Durable Callback URLs

Use the AWS dev environment for deployed-development Stripe and Twilio callback testing instead of disposable quick tunnels.

```text
APP_PUBLIC_URL=https://dev.livingrelay.com
Stripe webhook=https://dev.livingrelay.com/api/stripe/webhook
Twilio inbound SMS webhook=https://dev.livingrelay.com/api/twilio/inbound
Twilio media stream=wss://dev.livingrelay.com/api/media/twilio
```

`dev.livingrelay.com` is backed by Route 53, ACM, an Application Load Balancer, ECS Fargate, and Postgres, so callback URLs stay stable across local restarts. It is for the deployed dev environment only. If a provider must call code running only on a workstation, use a separate laptop-specific public host such as `local-dev.livingrelay.com` rather than overloading `dev.livingrelay.com`.

### Billing Rules

- Accounts can add any number of properties with no monthly or per-property fee.
- The default payer is the owner, but the property manager can choose to pay for the account.
- A user can identify as owner, property manager, or both during property setup.
- After a property is created, the next screen should prompt for a card on file. Skipping is secondary and leaves the property/account in `Needs card`.
- Adding tenants, owners, managers, or vendors saves their role silently; no SMS goes out until setup is launched.
- When setup is launched, each person receives role-specific instructions.
- A $25 dispatch coordination fee is recorded only when a vendor is booked.
- Saved payment methods are set as the customer's default Stripe payment method so dispatch invoices can be charged automatically.
- No fee is charged when the tenant issue is solved by LLM guidance without vendor coordination.
- If a tenant reports the first issue before billing is complete, LivingRelay continues the normal intake/troubleshooting flow and texts the account manager to finish billing setup before vendor dispatch.
- When vendors are called, they are asked to send invoices to the property manager, owner, and LivingRelay records inbox unless the property manager gives different instructions.
- Vendor invoices are routed to the property manager contact on file by email when available, otherwise SMS/phone follow-up.
- LivingRelay tracks vendor invoice delivery and paid/unpaid status, but the property manager/owner pays the vendor directly outside the app.
- Owners can still access vendor invoice history and tax bundles because repair payments stay off platform.
- Owners can upload maintenance bills for free and receive annual/category summaries plus possible capital-improvement candidates for future sale-basis review.
- Owner Subscription is `$99/year` and unlocks updated spreadsheet files plus prefilled tax packet exports for rental property expenses.

### Endpoints

```text
POST /api/billing/setup-session
POST /api/billing/portal-session
POST /api/billing/owner-subscription-session
POST /api/work-orders/:id/book-vendor
POST /api/properties/:id/owner-expenses
POST /api/stripe/webhook
```

Stripe events to handle:

- `checkout.session.completed` for setup mode
- `checkout.session.completed` for Owner Subscription checkout
- `setup_intent.succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Repair Payments

Vendor repair payments stay off platform. LivingRelay never collects, transfers, or remits vendor repair money in v1.

The app only tracks:

- invoice received
- sent to property manager
- paid/unpaid
- paid off platform
- reminders sent
- tax export included

This keeps v1 simpler and avoids becoming the money transmitter or payment middleman for repairs.
