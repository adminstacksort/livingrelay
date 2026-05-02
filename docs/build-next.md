# Build Next

## Current Real V1 Prototype

The active app now demonstrates:

- unique phone + PIN login
- role-aware mobile web surfaces
- manager property setup
- subscription/payment placeholder
- SMS-style work orders
- tenant request creation
- manager approval
- owner approval
- vendor dispatch
- invoice records
- tax bundle action

## Production Backend Recommendation

Use a simple full-stack app next:

- React frontend
- Node/Express or Next.js backend
- Postgres database
- Prisma schema
- Twilio webhooks
- Stripe checkout/webhooks

## First Backend Tables

- `accounts`
- `properties`
- `subscriptions`
- `people`
- `role_assignments`
- `units`
- `vendors`
- `vendor_rules`
- `approval_rules`
- `work_orders`
- `messages`
- `approvals`
- `invoices`
- `attachments`
- `timeline_events`

## First Live Milestone

The first live milestone should prove:

1. Manager creates paid property profile.
2. Manager adds one tenant, one owner, one vendor.
3. Tenant texts issue to Twilio number.
4. Manager receives triage SMS.
5. Manager approves by SMS.
6. Owner approves by SMS if required.
7. Vendor receives scope by SMS.
8. Tenant receives status update.
9. Invoice is attached and visible to owner.

## Need From User

- Twilio Account SID
- Twilio Auth Token
- Twilio phone number
- Stripe secret key
- Stripe publishable key
- Stripe webhook signing secret
- Base property monthly price
- Additional property monthly price
- First test property name/address
- Manager phone
- Owner phone
- Tenant phone
- Vendor phone
