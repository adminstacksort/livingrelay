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

- Shared phone + PIN login
- Role-aware views for admin/manager, owner, tenant, and vendor
- Property subscription/payment placeholder
- SMS-style work orders
- Tenant request creation
- Manager approval
- Owner approval
- Vendor dispatch
- Invoice records and tax bundle action
- Twilio/Stripe integration contract docs

## Next Product Direction

The real product should become an SMS-first coordination system with a shared login URL, role-specific PINs, paid property profiles, persistent work orders, invoice records, and optional voice calls to vendors.

See:

- `docs/demo-v1.md`
- `docs/real-version-plan.md`
- `docs/integrations.md`
- `docs/build-next.md`
