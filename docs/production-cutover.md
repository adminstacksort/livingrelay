# Production Cutover Checklist

## MVP Pilot Scope

Use this scope for the first real property manager:

- One admin account
- One paid property
- Homes/spaces, residents, owner, preferred vendors
- Tenant SMS issue intake
- AI troubleshooting before escalation
- Manager review
- Owner approval above threshold
- Vendor SMS coordination
- Invoice/tax export
- Stale work order nudges

## Current State

Done:

- Twilio inbound/outbound SMS hooks
- Guided troubleshooting
- Manager/owner/vendor views
- Owner tax packet
- Stale nudges
- Demo vendor outreach
- Optional ElevenLabs call hooks
- Postgres snapshot persistence when `DATABASE_URL` is set
- Dockerfile and ECS task template

Still required before charging strangers:

- Real auth/session model
- Stripe subscription gate
- Per-account/property authorization
- S3 media ingestion
- Twilio signature validation
- Table-backed repositories replacing state snapshots

## The Line For A Real Pilot

The app is pilot-ready when:

1. `GET /api/readiness` returns `ok: true`.
2. A tenant can text the production Twilio number.
3. The work order survives process restarts through Postgres.
4. The manager can approve/escalate/contact vendor from SMS or web.
5. Owner invoices and CSV exports persist across deploys.

Do not add broad new features until those five are boring.
