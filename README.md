# LivingRelay

LivingRelay is an AI-assisted maintenance coordination product for small property managers.

The project has two useful checkpoints:

- `codex/relaydesk-demo-v1`: saved single-page concept demo.
- `codex/relaydesk-real-v1`: current mobile-first prototype for the real product direction.

## Run The Demo

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

Do not open `index.html` directly from Finder. The demo is a Vite/React app and should be run through the local dev server.

## Current Real V1 Prototype Scope

- Unique phone + PIN login
- Role-aware views for manager, owner, tenant, and vendor coordination
- Property subscription/payment placeholder
- SMS-style work orders
- Tenant request creation
- Manager approval
- Owner approval
- Vendor dispatch
- Invoice records and tax bundle action
- Twilio/Stripe integration contract docs

## Next Product Direction

The real product should become an SMS-first coordination system with a shared login URL, unique phone-based identity, paid property profiles, persistent work orders, invoice records, and optional voice calls to vendors.

See:

- `docs/demo-v1.md`
- `docs/real-version-plan.md`
- `docs/integrations.md`
- `docs/build-next.md`
# LivingRelay

SMS-first maintenance coordination for small property managers.

## Local Development

```bash
npm install
npm run dev
```

Web: `http://127.0.0.1:5173`  
API: `http://127.0.0.1:8787`

## Production Build

```bash
npm run build
npm start
```

The production server serves both:

- built frontend from `dist`
- API routes under `/api`

## Readiness

```bash
curl http://127.0.0.1:8787/api/readiness
```

For AWS readiness, this should return `ok: true`.

Required production env:

- `APP_PUBLIC_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_NUMBER`
- `ANTHROPIC_API_KEY`

See `.env.example`, `docs/aws-deploy.md`, and `docs/production-cutover.md`.

## Persistence

Local development uses `data/local-state.json`.

When `DATABASE_URL` is present, LivingRelay also persists the full application state to Postgres in `app_state`. The normalized production schema is in `db/schema.sql`; migrating individual API flows from snapshot state to table-backed repositories is the next backend hardening step.
