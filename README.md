# RelayDesk

RelayDesk is an AI-assisted maintenance coordination product for small property managers.

The current app is a **demo v1**: a single-page prototype showing the operating loop from tenant intake through triage, manager approval, owner approval, vendor coordination, tenant updates, and closeout.

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

## Current Demo Scope

- Tenant maintenance request form
- AI-style issue triage
- Manager dispatch rules
- Vendor recommendation
- Manager approval
- Owner approval when thresholds require it
- Vendor coordination message
- Tenant status update
- Work order timeline

## Next Product Direction

The real product should become an SMS-first coordination system with a shared login URL, role-specific PINs, paid property profiles, persistent work orders, invoice records, and optional voice calls to vendors.

See:

- `docs/demo-v1.md`
- `docs/real-version-plan.md`
