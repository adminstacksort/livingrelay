# LivingRelay Product And Technical Spec

Last updated: 2026-05-04

This is the living reference for what LivingRelay is, what exists in this repository, how it was built, and what future contributors or AI agents should inspect before making product or technical changes.

When the product changes in a meaningful way, update this file in the same pull request. Treat it as the canonical orientation doc for the repo, with the deeper topic docs in `docs/` as supporting references.

## 1. Product Summary

LivingRelay is an SMS-first maintenance coordination product for small property managers, rental owners, tenants, vendors, and LivingRelay operators. It helps a maintenance issue move from tenant intake to triage, approvals, vendor outreach, booking, completion records, invoices, owner tax records, and operational follow-up.

The product is built around a shared login URL and phone-based identity. Each person uses their own phone number and PIN. The app resolves the person's role, property access, permissions, and dashboard after login.

The current product direction is not a full property-management suite. It is a focused coordination layer for the repair workflow that often happens across SMS, calls, email, spreadsheets, invoices, and memory.

## 2. Target Users And Roles

- Site admin: LivingRelay operator who manages platform settings, diagnostics, QA runs, accounts, prospecting leads, public sales leads, vendor-call controls, billing visibility, audit events, and account cleanup.
- Manager: Property operator who creates properties, manages people and vendors, reviews work orders, approves dispatch, coordinates vendors, tracks invoices, and configures notifications.
- Owner: Rental owner who reviews approvals, tracks invoices, marks off-platform payments, sees tax summaries, and exports tax records.
- Tenant: Occupant who reports issues by SMS or web, adds media/access notes, confirms availability, and tracks status.
- Vendor: Service provider who receives assigned work, can accept/decline, provide ETA/issue details, and provide completion or invoice information.

## 3. Product Principles

- SMS first, web supported. The most important workflows should work by text message, with web/mobile dashboards for richer operations.
- One URL, role-aware experience. Do not create separate portals unless there is a strong product reason.
- Phone numbers are identity anchors. A production person should have a unique normalized phone number inside the intended tenant/account boundary.
- Humans control spend and dispatch. AI and automation prepare, route, summarize, and nudge; managers and owners remain approval gates.
- Vendor payments are off-platform in the current V1. LivingRelay tracks invoices and paid status but does not pay vendors.
- Every meaningful workflow action should leave a timeline, message, invoice, billing event, or audit event.
- Vendor call automation must remain gated by platform, account, property, and test-mode settings.

## 4. What Exists Now

### Web App

The main web application is a Vite/React app in `src/main.jsx`, styled by `src/styles.css`.

Implemented surfaces include:

- Public marketing/public lead and invite flows.
- Phone + PIN login with SMS verification.
- Role-aware app shell.
- Site admin console.
- Manager dashboard and property operations.
- Owner invoice, approval, and tax views.
- Tenant issue creation and status views.
- Vendor assignment views.
- Property onboarding and directory management.
- Google Places-backed address lookup when configured.
- Vendor team and vendor preference management.
- Work-order intake, triage, approval, dispatch, booking, completion, invoice, and stale-nudge flows.
- Billing setup and owner subscription UI.
- Live vendor call controls for listen, join, and takeover paths.
- Notification preference controls.
- Prospecting lead management and refresh flows.
- QA scenario run surfaces for testing cross-role lifecycle behavior.

### Backend API

The backend is an Express server in `server/index.js`. It serves API routes and, in production mode, serves the Vite build from `dist`.

Major backend capabilities:

- Health and readiness checks.
- Session-based app login and site-admin login.
- Phone verification challenge flow.
- Account/property/person/vendor onboarding and administration.
- Site admin diagnostics, platform settings, QA scenarios, prospecting leads, and account deletion.
- PMS/integration connection stubs and import/export preview flows.
- Twilio inbound SMS command handling.
- Outbound SMS notifications.
- Tenant media attachment extraction and optional AI media review.
- AI-assisted issue triage and troubleshooting.
- Vendor research fallback through Anthropic.
- Vendor outreach orchestration and retry policy.
- ElevenLabs and Twilio-owned vendor call workflows.
- WebSocket media relay for manager browser listen-in.
- Manager join/takeover controls for live calls.
- Stripe billing setup, portal, owner subscription, webhooks, and dispatch fee records.
- Invoice creation/update and owner expense ingestion.
- Tax summary, tax bundle audit, and CSV export.
- Referral and public sales lead capture.
- Push/email notification preference storage and delivery helpers.

### Mobile Clients

The repo includes native mobile clients:

- `livingrelay-ios/`: SwiftUI iOS app for staging/production.
- `livingrelay-ios-demo/`: separate SwiftUI demo app.
- `livingrelay-android/`: Android project with staging/production flavor tests and Google Play release documentation.

The mobile clients mirror the web product direction: phone/PIN login, state loading, property switching, role dashboards, issue creation, approval, dispatch, invoice/tax surfaces, and health checks.

### Store And Public Assets

Store and public launch assets exist in:

- `app-store-assets/`: App Store metadata, screenshots/previews, icon material, and submission notes.
- `google-play-assets/`: Google Play metadata, icons, feature graphics, phone screenshots, and tablet screenshots.
- `google-play-upload/`: generated/upload-ready Android release artifacts.
- `public/`: favicon, hero image, robots.txt, sitemap.xml, and llms.txt.

### Deployment And CI

Deployment support exists for AWS/ECS and GitHub Actions:

- `.github/workflows/ci.yml`: CI.
- `.github/workflows/deploy-dev.yml`: development deploy.
- `.github/workflows/deploy-staging.yml`: staging deploy.
- `.github/workflows/deploy-production.yml`: production deploy.
- `.github/workflows/_deploy-environment.yml`: reusable deployment workflow.
- `Dockerfile`: production container.
- `deploy/aws-ecs-task-definition.example.json`: ECS task definition example.
- `scripts/provision-aws-https.mjs`, `scripts/provision-aws-dev-runtime.mjs`, and `scripts/provision-aws-live.mjs`: AWS provisioning helpers.
- `scripts/smoke-health.mjs`: health smoke script.

The environment model is documented in `docs/environments.md`.

## 5. Core User Journeys

### Tenant Reports Issue

1. Tenant texts the LivingRelay number or uses the tenant dashboard.
2. Backend matches the phone number to a person and property/unit context.
3. Issue is classified by trade, urgency, estimated cost, and missing details.
4. LivingRelay asks safe troubleshooting and follow-up questions.
5. Tenant replies with details, availability, media, or confirmation that service is still needed.
6. Work order escalates to manager review and vendor preparation when appropriate.

### Manager Reviews And Dispatches

1. Manager reviews the triage summary, issue history, media, access notes, urgency, approval rules, and vendor options.
2. Manager approves, closes, starts vendor outreach, selects an outcome, or updates dispatch settings.
3. If owner approval is required, the owner is routed into the approval flow.
4. After approvals and tenant timing confirmation, the manager books the selected vendor.
5. Billing events, timeline events, messages, and invoice instructions are recorded.

### Owner Approves Spend And Tracks Taxes

1. Owner receives approval requests when rules require owner approval.
2. Owner approves, denies, asks a question, or later marks invoices as paid.
3. Owner can review invoice records, tax-year summaries, tax bundle requests, and CSV exports.

### Vendor Outreach And Calls

1. LivingRelay prepares configured vendors first, then fallback vendor options.
2. Vendor calls can be started manually or automatically if all gates allow it.
3. ElevenLabs/Twilio call flows capture availability, rough quote, callout fees, warranty, discount, photo needs, access needs, and invoice delivery instructions.
4. Manager compares outcomes, selects a vendor, and books only after required approval and tenant timing gates clear.
5. Attempts, transcripts, retry decisions, hold/no-answer outcomes, and selected vendors are stored on the work order.

### Completion, Invoice, And Tax Packet

1. Vendor/manager records completion details and invoice metadata.
2. Invoice is tied to property, work order, vendor, tax year, category, amount, payment rail, recipients, and document details.
3. Owner/manager marks off-platform payment status.
4. Owner downloads CSV tax data or requests a tax bundle audit event.

### Site Admin And Growth Operations

1. Site admin logs in on the configured admin host.
2. Admin can view diagnostics, accounts, people, properties, work orders, billing, audit log, platform settings, prospecting leads, QA runs, and public sales leads.
3. Admin can refresh/generate prospecting leads, validate referrals, inspect QA lifecycle output, and manage platform-level vendor-call safety settings.

## 6. Architecture

### Runtime Shape

Local development runs two processes:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787`

Production builds the frontend into `dist` and serves both static assets and API routes from `server/index.js`.

### Frontend

- Framework: React with Vite.
- Entry point: `src/main.jsx`.
- Styling: `src/styles.css`.
- Analytics helper: `src/analytics.js`.
- Current shape: most web components and state handlers are colocated in `src/main.jsx`.
- Technical debt: split into route/view/component modules when the UI stabilizes further.

### Backend

- Framework: Express 5.
- Entry point: `server/index.js`.
- State source: mutable in-memory arrays exported from `server/data.js`.
- Persistence: local JSON and optional Postgres snapshot state.
- External calls: Twilio, Stripe, Anthropic, ElevenLabs, Google Places, email providers, APNs/push placeholders.
- WebSocket support: `server/mediaRelay.js` attaches media relay paths to the HTTP server.

### State And Persistence

Current state is loaded from Postgres when `DATABASE_URL` is configured, otherwise from `data/local-state.json`, otherwise from seed data in `server/data.js`.

The current production persistence model writes the full application state snapshot to the Postgres `app_state` table. The target normalized model is defined in `db/schema.sql`.

Important state collections:

- `accounts`
- `people`
- `properties`
- `vendors`
- `workOrders`
- `invoices`
- `billingEvents`
- `auditLog`
- `platformSettings`

Recommended migration path:

1. Keep `app_state` as a backup mirror.
2. Introduce repository functions per aggregate.
3. Move work orders, messages, invoices, people, properties, and audit events to normalized tables.
4. Move mutation flows into SQL transactions.
5. Retire exported mutable arrays after parity tests exist.

## 7. Repository Map

- `.github/`: GitHub workflows, CODEOWNERS, and this living spec.
- `src/`: Vite/React web app.
- `server/index.js`: Express routes, session handling, admin routes, public routes, and orchestration glue.
- `server/data.js`: seed data, mutable state, local JSON persistence, Postgres snapshot persistence, and audit helpers.
- `server/smsLogic.js`: phone normalization, inbound SMS role routing, issue classification, command parsing, and work-order message behavior.
- `server/issueGuidance.js`: safe tenant troubleshooting and escalation rules.
- `server/issueMediaReview.js`: media attachment normalization and optional AI media review.
- `server/vendorWorkflow.js`: dispatch settings, vendor outreach, retries, tenant availability, stage transitions, completion package, and invoice delivery logic.
- `server/elevenLabsCalls.js`: ElevenLabs and Twilio-registration vendor call integration.
- `server/liveCallControl.js`: manager listen, join, and takeover controls.
- `server/mediaRelay.js`: Twilio/browser WebSocket media relay.
- `server/twilioClient.js`: SMS client and Twilio status helpers.
- `server/notifications.js`: event notification routing.
- `server/emailClient.js`: Resend/SendGrid email helper.
- `server/phoneVerification.js`: SMS verification challenge/token flow.
- `server/stripeBilling.js`: Stripe billing helpers.
- `server/taxExports.js`: tax summaries, bundle request audit, and CSV export.
- `server/staleNudges.js`: stale work-order detection and reminders.
- `server/anthropicVendorSearch.js`: Anthropic vendor research fallback.
- `server/prospectingResearch.js`: AI-assisted prospecting lead generation.
- `server/pmsIntegrations.js`: PMS/integration connection model and import/export preview helpers.
- `server/transitEncryption.js`: public key and encrypted field handling.
- `server/demoScenarios.js`: QA/demo scenario definitions.
- `server/demoOutreach.js`: deterministic demo vendor outreach.
- `db/schema.sql`: current and target Postgres schema.
- `docs/`: detailed product, technical, deployment, environment, integration, and campaign notes.
- `tests/`: Node tests for environment behavior and email client behavior.
- `livingrelay-ios/`, `livingrelay-ios-demo/`, `livingrelay-android/`: native clients.
- `app-store-assets/`, `google-play-assets/`, `google-play-upload/`: store listing and release assets.
- `deploy/`, `scripts/`: deployment and smoke/provisioning scripts.

## 8. API Surface

The main API groups are:

- Health/state: `GET /api/health`, `GET /api/readiness`, `GET /api/state`, `GET /api/encryption/public-key`.
- Auth: `POST /api/auth/login/start`, `POST /api/auth/login/verify`, `POST /api/auth/logout`, phone verification start/verify, site admin login.
- Public/legal: privacy, terms, delete account/data pages, public invites, public sales leads.
- Onboarding/admin: property onboarding, accounts, people, properties, vendors, work orders, account deletion, user data deletion.
- Site admin: diagnostics, platform settings, QA scenarios/runs, prospecting leads, referral validation.
- Places/vendors: Google Places autocomplete/details and vendor autocomplete.
- Integrations: integration create/update/delete, dry run, directory import, work-order export preview.
- Billing: setup checkout, billing portal, owner subscription checkout, setup/subscription confirmation, Stripe webhook.
- Work orders: create/update, vendor booking, vendor outreach, outcome selection, retry due, completion package, demo outreach, quote selection, stale nudges.
- Invoices/tax: invoice create/update, owner expenses, owner operating system parsing, tax bundle, tax summary, tax spreadsheet CSV.
- Messaging/voice: outbound SMS, inbound Twilio SMS, ElevenLabs result webhook, Twilio voice registration, manager listen/join/takeover, voice status callbacks.

Before changing API behavior, inspect `server/index.js` for the current route and the domain module that owns the actual state transition.

## 9. Key Integrations

### Twilio SMS

Twilio inbound SMS posts to `/api/twilio/inbound`. LivingRelay normalizes the sender, resolves the role, chooses the active work order or explicit work-order ID, parses role-specific commands, updates state, and responds with TwiML.

### Twilio Voice And Media Relay

With `VENDOR_CALL_PROVIDER=twilio_register`, LivingRelay owns the Twilio call lifecycle, registers answered calls with ElevenLabs, injects a media stream, and supports browser listen-in plus manager join/takeover controls.

### ElevenLabs

ElevenLabs powers vendor quote/availability conversations. Calls are disabled unless `ENABLE_VENDOR_CALLS=true`, and production calls require platform, account, and property gates. Post-call webhooks are verified when `ELEVENLABS_WEBHOOK_SECRET` is configured.

### Anthropic

Anthropic is used for vendor research fallback and prospecting research when configured. Without keys, local/demo flows fall back to configured or mock data where possible.

### Stripe

Stripe supports setup-mode checkout, billing portal sessions, owner subscription checkout, webhooks, and dispatch fee billing events. Dispatch fee idempotency is based on work-order ID.

### Google Places

The backend proxies autocomplete/details so address lookup can be normalized and server-controlled.

### Email, Push, And Analytics

Email delivery supports Resend and SendGrid helpers. iOS push registration is represented through device token endpoints and APNs env variables. Web analytics uses GA4 through `VITE_GA_MEASUREMENT_ID`.

## 10. Data Model

Core product objects:

- Account: customer organization, billing state, referral rewards, integration connections, vendor-call settings.
- Platform settings: global operational and vendor-call controls.
- Person: role, phone, PIN, notification preferences, property links, account links, availability, push devices.
- Property: address, units, managers/owners, approval threshold, dispatch settings, vendor preferences, operating rules.
- Vendor: trade, phone, preference metadata, property/team associations.
- Work order: issue, status, approvals, dispatch stage, messages, timeline, troubleshooting state, media, vendor outreach, billing, completion package.
- Vendor outcome: candidate vendor result with quote, availability, warranty, discount, access/photo/invoice needs, and selection status.
- Call attempt: provider status, Twilio/ElevenLabs IDs, transcript, retry decision, hold detection, and lifecycle metadata.
- Invoice: amount, vendor, tax category/year, status, paid state, document details, owner expense metadata, recipients.
- Billing event: dispatch/subscription/setup event record.
- Integration connection: PMS/import/export connection configuration and activity preview.
- Prospecting lead: lead/contact/account metadata, market, status, priority, score, notes, and source.
- Referral: token and reward validation metadata.
- Audit event: actor/action/detail record.

## 11. Security, Privacy, And Reliability

Implemented or partially implemented controls:

- Phone + PIN login with SMS verification for normal app users.
- Session cookies/tokens for app and site admin flows.
- Site admin host gating through configured admin hosts.
- Production guard for `SITE_ADMIN_PASSWORD`.
- Stripe webhook signature verification.
- ElevenLabs webhook signature verification when configured.
- Safe Stripe return URL handling.
- Vendor-call production gates and test-mode override.
- Persistence barrier for mutating routes in required durable environments.
- Public delete account/data pages and API deletion flows.
- Transit encryption helper for selected encrypted fields.
- Readiness checks for deployment health.

Known hardening work:

- Hash all PINs and migrate seeded raw PINs.
- Add rate limits to login, phone verification, SMS webhook, site admin, and public lead routes.
- Add schema validation for request bodies.
- Enforce server-side role/account/property authorization consistently across every route.
- Move normalized persistence into transactions.
- Add structured logs, request IDs, external-call IDs, and replayable webhook payload storage.
- Add CSRF/same-site protections appropriate to the final auth model.
- Add tests for destructive/admin flows and deletion privacy guarantees.

## 12. Build, Test, And Run

Common commands:

```bash
npm install
npm run dev
npm run build
npm start
npm test
npm run smoke
npm run readiness
```

Package scripts:

- `npm run dev`: starts Vite web and API server together.
- `npm run dev:web`: starts Vite on `127.0.0.1`.
- `npm run dev:api`: starts Express API.
- `npm run build`: production web build.
- `npm run check`: build alias.
- `npm test`: Node test suite in `tests/*.test.mjs`.
- `npm run test:staging`: staging env expectations.
- `npm run test:production`: production env expectations.
- `npm run test:ios`: iOS environment tests.
- `npm run test:android`: Android staging/production unit tests.
- `npm run test:all`: Node tests plus Android tests.
- `npm run smoke`: health smoke script.
- `npm run readiness`: local readiness check.

## 13. Environment Model

The repository is designed around a source repo plus deployment mirror repos:

- Source: `adminstacksort/livingrelay`.
- Dev mirror: `adminstacksort/livingrelay-dev`.
- Staging mirror: `adminstacksort/livingrelay-staging`.
- Production mirror: `adminstacksort/livingrelay-production`.

Canonical domains:

- Development: `https://dev.livingrelay.com`
- Staging: `https://staging.livingrelay.com`
- Production marketing/root: `https://livingrelay.com`
- Production app: `https://app.livingrelay.com`
- Site admin: `https://admin.livingrelay.com`

Use `docs/environments.md`, `.env.example`, `.env.dev.example`, `.env.staging.example`, and `.env.production.example` when adding or changing environment variables.

## 14. Current Technical Debt

- `src/main.jsx` is large and should be split into app shell, role views, shared components, and feature modules.
- `server/index.js` contains many route handlers and helper functions; move route groups into controllers/services.
- Mutable in-memory arrays make concurrent production mutation behavior risky.
- Snapshot persistence is practical for prototyping but insufficient for multi-tenant production querying.
- Authorization is not yet uniformly enforced as middleware with tests.
- Request validation is informal.
- Demo, QA, staging, and production behaviors need continued separation.
- Observability should be stronger before production operations scale.
- Mobile clients should share clearer API contracts and automated release checks with the web/backend.

## 15. Recommended Next Build Milestones

1. Add server-side role/account/property auth middleware and cover it with tests.
2. Hash PINs and add login/verification rate limiting.
3. Move work orders, messages, invoices, people, properties, and audit events toward normalized Postgres repositories.
4. Split `src/main.jsx` into route-level modules and reusable components.
5. Add SMS command, webhook contract, vendor retry, billing idempotency, and admin deletion tests.
6. Add browser smoke tests for role dashboards on desktop and mobile.
7. Finalize launch billing model and align product copy, Stripe behavior, and store metadata.
8. Add production-grade structured logging and external provider diagnostics.
9. Tighten mobile release automation for iOS and Android.

## 16. How Future Agents Should Use This File

Before making changes:

1. Read this file for orientation.
2. Inspect the specific source files listed in the repository map.
3. Check the supporting docs only for the domain being changed.
4. Preserve the product principles unless the user explicitly changes direction.
5. Update this file when adding or removing major surfaces, data objects, integrations, workflows, environment variables, deployment behavior, or known debt.

Supporting docs worth checking:

- `docs/product-spec.md`: product details and open product questions.
- `docs/technical-spec.md`: deeper architecture/API notes.
- `docs/integrations.md`: Twilio, ElevenLabs, Anthropic, Stripe, Places, analytics, and notification details.
- `docs/environments.md`: repo/environment/domain/deploy model.
- `docs/aws-deploy.md` and `docs/production-cutover.md`: AWS deployment and launch readiness.
- `docs/pms-integrations-plan.md`: PMS integration direction.
- `docs/meta-leads-campaign-plan.md`: growth campaign direction.
- mobile release docs under `livingrelay-ios/docs/` and `livingrelay-android/docs/`.
