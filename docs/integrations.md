# Integrations

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
3. If tenant: parse the issue, create or update a work order, use Anthropic to prepare 5 local vendor options with estimated ranges, and notify manager/admin/owner based on each person's notification settings.
4. If manager: parse approval commands like `APPROVE`, `VENDOR 1`, `VENDOR 2`, `CALL ME`, `CLOSE`.
5. If owner: parse `APPROVE`, `DENY`, questions, and `PAID`.
6. If vendor: parse `ACCEPT`, `DECLINE`, ETA, invoice/photo messages.
7. Store every message on the work order timeline.

### Notification Settings

Admins and owners should be able to choose:

- `tenantReports`: notify as soon as a tenant reports a new issue.
- `everyUpdate`: notify on every meaningful status update.
- `keyUpdates`: notify only for important events such as approval requests, billing/invoice updates, vendor decline, completion, or overdue reminders.

The default should be:

- property manager/admin: tenant reports + every update + key updates
- owner: tenant reports + key updates, but not every update

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
```

Calls are disabled unless `ENABLE_VENDOR_CALLS=true`. This prevents accidental calls during development.

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

Stripe is for property profile subscriptions only. Repair payments remain off platform in v1.

### Required Credentials

```text
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_BASE_PROPERTY
STRIPE_PRICE_ADDITIONAL_PROPERTY
```

### Billing Rules

- Creating the first property requires an active subscription.
- Each additional property adds a per-property line item.
- If billing is inactive, tenant SMS intake is paused for that property.
- Owners can still access historical invoices even if subscription is inactive.

### Future Endpoints

```text
POST /api/stripe/create-checkout-session
POST /api/stripe/create-portal-session
POST /api/stripe/webhook
```

Stripe events to handle:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## Repair Payments

Repair payments stay off platform.

The app only tracks:

- invoice received
- sent to owner
- approved
- paid off platform
- reminders sent
- tax export included

This keeps v1 simpler and avoids becoming the money transmitter or payment middleman for repairs.
