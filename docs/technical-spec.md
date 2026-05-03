# LivingRelay Technical Spec

## 1. System Overview

LivingRelay is built as a Vite/React web app, Express API server, JSON/Postgres-backed application state layer, and SwiftUI iOS clients. The backend integrates with Twilio for SMS and voice, ElevenLabs for AI vendor calls, Stripe for billing, Anthropic for vendor research, Google Places for address lookup, and optional AWS deployment infrastructure.

Local development runs the web app and API side by side:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787`

Production mode builds the Vite frontend into `dist` and serves both static assets and API routes from `server/index.js`.

## 2. Repository Map

- `src/main.jsx`: React application, role dashboards, login, onboarding, work-order UI, billing UI, admin console, dispatch panels, and live-call controls.
- `src/styles.css`: Web app styling.
- `server/index.js`: Express entry point and API route registry.
- `server/data.js`: Seed state, local JSON persistence, Postgres snapshot persistence, and audit helpers.
- `server/postgresState.js`: Runtime environment and Postgres state snapshot adapter.
- `server/smsLogic.js`: Phone normalization, SMS role resolution, issue classification, work-order creation, and command handling.
- `server/issueGuidance.js`: Tenant troubleshooting guidance and escalation rules.
- `server/vendorWorkflow.js`: Dispatch settings, tenant availability, vendor outreach, call attempt/retry logic, invoice delivery, completion packages, and booking transitions.
- `server/elevenLabsCalls.js`: ElevenLabs outbound vendor-call integration.
- `server/liveCallControl.js`: Manager listen/join/takeover controls for live calls.
- `server/mediaRelay.js`: WebSocket media relay for Twilio streams and browser listen-in.
- `server/twilioClient.js`: Twilio SMS client and configuration status.
- `server/stripeBilling.js`: Stripe customer, checkout, portal, subscription, invoice, and dispatch fee helpers.
- `server/taxExports.js`: Owner tax summaries, bundle audit, and CSV export.
- `server/staleNudges.js`: Stale work-order detection and reminders.
- `server/anthropicVendorSearch.js`: Anthropic vendor research fallback.
- `server/phoneVerification.js`: SMS verification challenge/token flow.
- `db/schema.sql`: Target normalized Postgres schema plus current `app_state` snapshot table.
- `livingrelay-ios/`: SwiftUI staging/production iOS client.
- `livingrelay-ios-demo/`: SwiftUI demo iOS client.
- `deploy/` and `scripts/`: AWS/ECS provisioning and smoke scripts.
- `docs/`: Product, integration, deployment, and cutover documentation.

## 3. Runtime Architecture

### Web Client

The React app loads state from `/api/state`, keeps local UI selections for active user, property, order, admin section, billing section, and forms, then calls API endpoints for mutations. The app is currently concentrated in `src/main.jsx`; components are organized by function names rather than separate modules.

Major component groups:

- Login and shared URL access using each user's unique phone number.
- Site admin console.
- Manager operations dashboard.
- Billing tab.
- Owner invoice/tax view.
- Tenant request view.
- Vendor assignment view.
- Dispatch and live-call panels.

### API Server

The Express server:

1. Loads environment variables with `dotenv`.
2. Registers the raw Stripe webhook route before JSON body parsing.
3. Parses JSON and URL-encoded requests.
4. Serves built frontend assets from `dist`.
5. Adds a persistence barrier for mutating routes so responses fail with `503` if durable state persistence cannot be confirmed in required environments.
6. Exposes health, readiness, state, auth, admin, billing, work-order, Twilio, ElevenLabs, tax, and media endpoints.

### State Layer

The current backend uses mutable in-memory arrays exported from `server/data.js`:

- `accounts`
- `people`
- `properties`
- `vendors`
- `workOrders`
- `invoices`
- `billingEvents`
- `auditLog`
- `platformSettings`

State loads from Postgres when configured, otherwise from `data/local-state.json`, falling back to seeded data. Mutations update in-memory objects and call `saveState()`.

Persistence modes:

- Local development: writes `data/local-state.json`; Postgres save may be skipped.
- Production/durable mode: writes the full JSON snapshot to Postgres `app_state`; the route-level persistence barrier confirms save completion before returning mutation responses.
- Target future mode: migrate each flow to normalized tables in `db/schema.sql`.

## 4. API Surface

### Health And State

- `GET /api/health`: returns service status, Twilio status, and readiness details.
- `GET /api/readiness`: production readiness check; returns `200` when required env, database, Twilio, and enabled vendor-call dependencies are ready.
- `GET /api/state`: returns app state scoped by host/role context.

### Auth And Verification

- `POST /api/phone-verifications/start`: creates SMS challenge.
- `POST /api/phone-verifications/verify`: verifies challenge.
- `POST /api/auth/login/start`: validates phone/PIN and starts login verification.
- `POST /api/auth/login/verify`: consumes verification token and returns user.
- `POST /api/site-admin/login`: authenticates site admin console.

### Onboarding And Admin

- `POST /api/onboarding/property`: creates initial account/property setup.
- `POST /api/site-admin/accounts`: creates account.
- `PATCH /api/site-admin/accounts/:id`: updates account.
- `PATCH /api/site-admin/platform-settings`: updates global vendor-call settings.
- `GET /api/site-admin/diagnostics`: returns operational diagnostics.
- `POST /api/admin/properties`: creates property.
- `PATCH /api/admin/properties/:id`: updates property and dispatch settings.
- `POST /api/admin/people`: creates person.
- `POST /api/admin/vendors`: creates vendor.
- `POST /api/admin/work-orders`: creates work order manually.

### Places

- `GET /api/places/autocomplete`: Google Places autocomplete proxy.
- `GET /api/places/:placeId`: Google Places details proxy.

### Billing

- `POST /api/billing/setup-session`: creates Stripe setup-mode Checkout Session.
- `POST /api/billing/portal-session`: creates Stripe Billing Portal session.
- `POST /api/billing/owner-subscription-session`: creates annual owner subscription Checkout Session.
- `POST /api/billing/confirm-setup-session`: reconciles setup session result.
- `POST /api/billing/confirm-owner-subscription`: reconciles owner subscription session result.
- `POST /api/stripe/webhook`: verifies Stripe webhook signature and updates local billing state.

### Work Orders And Dispatch

- `POST /api/work-orders/:id/book-vendor`: finalizes vendor booking and dispatch fee state.
- `POST /api/work-orders/:id/vendor-outreach`: starts vendor outreach.
- `POST /api/work-orders/:id/vendor-outreach/select`: selects vendor outcome.
- `POST /api/work-orders/:id/vendor-outreach/retry-due`: retries due failed/no-answer attempts.
- `POST /api/work-orders/:id/completion-package`: records vendor completion details.
- `POST /api/work-orders/:id/demo-outreach`: creates demo vendor outreach.
- `POST /api/work-orders/:id/select-quote`: selects demo quote.
- `POST /api/work-orders/:id/full-flow-demo`: runs demo flow.
- `POST /api/work-orders/:id/invoices`: creates invoice for work order.
- `POST /api/work-orders/:id/nudge`: sends one stale-work-order nudge.
- `GET /api/work-orders/:id/live-calls`: lists live call state.
- `POST /api/work-orders/:id/live-calls/:callId/listen`: marks/listens to call.
- `GET /api/work-orders/:id/live-calls/:callId/media`: media endpoint for call audio.
- `POST /api/work-orders/:id/live-calls/:callId/join`: dials manager into call.
- `POST /api/work-orders/:id/live-calls/:callId/takeover`: manager takeover.

### Invoices And Tax

- `PATCH /api/invoices/:id`: updates invoice status/metadata.
- `POST /api/properties/:id/owner-expenses`: creates owner expense/invoice record.
- `POST /api/properties/:id/tax-bundle`: records tax bundle request/audit.
- `GET /api/properties/:id/tax-summary`: returns tax-year summary.
- `GET /api/properties/:id/tax-spreadsheet.csv`: streams tax CSV export.

### Messaging And Voice

- `POST /api/messages/send`: sends outbound SMS.
- `POST /api/twilio/inbound`: handles inbound SMS webhook.
- `POST /api/twilio/elevenlabs/outbound`: Twilio voice webhook that registers a call with ElevenLabs.
- `POST /api/twilio/manager-listen`: Twilio path for manager listen/join flows.
- `POST /api/twilio/voice-status`: Twilio voice status callback.
- `POST /api/elevenlabs/vendor-call-result`: stores ElevenLabs post-call structured results.

## 5. Data Model

### Current Snapshot Model

`server/data.js` stores app state as one JSON object. This allows fast prototyping and makes local state easy to inspect. Work-order objects currently contain nested message timelines, vendor outreach data, attempts, outcomes, troubleshooting state, dispatch fee status, and completion packages.

### Target Normalized Postgres Model

`db/schema.sql` defines production-ready tables:

- `app_state`: current snapshot persistence table.
- `accounts`, `platform_settings`, `people`, `properties`, `units`, `vendors`.
- `work_orders`, `messages`, `media`.
- `vendor_quotes`, `vendor_call_attempts`, `vendor_completion_packages`.
- `invoices`, `billing_events`, `audit_events`.

Recommended migration path:

1. Keep `app_state` as backup state mirror.
2. Introduce repository functions per aggregate, starting with work orders/messages/invoices.
3. Move read endpoints to table-backed queries.
4. Move mutation endpoints to transactions.
5. Retire mutable exported arrays after parity tests pass.

## 6. Work-Order State Machine

Important fields:

- `status`: user-visible state such as `Tenant troubleshooting`, `Needs owner approval`, `Vendor scheduled`, `Closed`.
- `dispatchStage`: workflow phase such as tenant timing confirmation or vendor booked.
- `managerApproved`: boolean approval gate.
- `ownerApproved`: boolean approval gate.
- `tenantAvailability`: structured service window, access notes, permission, and follow-up flag.
- `vendorOutreach.status`: outreach status.
- `vendorOutreach.outcomes[]`: candidate quotes/availability.
- `vendorOutreach.attempts[]`: call attempt lifecycle.
- `completionPackage`: closeout notes, photos, invoice delivery.

Typical lifecycle:

1. Tenant SMS or web request creates work order.
2. AI triage starts troubleshooting.
3. Tenant replies and escalates when service is needed.
4. Manager approval and owner approval gates are evaluated.
5. Vendor outreach prepares candidates and records call/SMS outcomes.
6. Manager selects outcome.
7. Tenant confirms timing if required.
8. Vendor is booked and dispatch fee is charged or marked.
9. Completion package and invoice are recorded.
10. Work order closes or remains stale/nudgeable.

## 7. SMS Command Logic

Inbound SMS flow:

1. Normalize `From`.
2. Match to `people`.
3. Find latest open work order or explicit `WO-1234`.
4. Branch by role.
5. Mutate work order/message/timeline state.
6. Return Twilio response and enqueue action side effects.

Supported command examples:

- General: `HELP`, `STATUS`, `STATUS WO-1234`.
- Tenant: new issue text, `AVAILABLE ...`, `CONFIRM`, `CANCEL`.
- Manager: `APPROVE`, `VENDOR 1`, `CALL ME`, `CLOSE`, `CANCEL`.
- Owner: `APPROVE`, `DENY`, `PAID`, questions.
- Vendor: `ACCEPT`, `DECLINE`, `ISSUE ...`.

## 8. Integration Design

### Twilio SMS

Twilio sends inbound messages to `/api/twilio/inbound`. Outbound messages use `sendSms({ to, body, workOrderId, messageType })`. Media URLs are accepted from Twilio webhook fields and attached to the work order.

### Twilio Voice And Media Relay

When `VENDOR_CALL_PROVIDER=twilio_register`, LivingRelay initiates the Twilio call lifecycle, returns TwiML from the ElevenLabs registration flow, and injects a Twilio media stream. The media relay exposes:

- `wss://YOUR-API-HOST/api/media/twilio`
- `wss://YOUR-API-HOST/api/media/listen`

Managers can listen from the web UI and can join/take over through live-call controls.

### ElevenLabs

ElevenLabs powers vendor quote/availability calls. Calls are disabled unless `ENABLE_VENDOR_CALLS=true`. Production calls are additionally gated by:

- Platform global settings.
- Account production vendor calls setting.
- Property dispatch setting.
- Test mode override.

Post-call webhooks are verified with `ELEVENLABS_WEBHOOK_SECRET` in production and stored as outcomes/attempts.

### Anthropic

When `ANTHROPIC_API_KEY` is configured, the app can research local vendor options for a property and issue. Without the key, it falls back to configured/demo vendors.

### Stripe

Stripe interactions are direct REST calls from `server/stripeBilling.js`. Dispatch fees use idempotency keys based on work-order ID. Webhooks verify signatures before updating local state.

### Google Places

The API proxies autocomplete and place details to avoid exposing server-controlled field masks and to normalize address data for onboarding/property forms.

## 9. Environment Variables

Required production readiness variables:

- `APP_PUBLIC_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_NUMBER`
- `ANTHROPIC_API_KEY`

Stripe:

- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DISPATCH_FEE_CENTS`
- `OWNER_SUBSCRIPTION_AMOUNT_CENTS`

ElevenLabs/vendor calls:

- `ENABLE_VENDOR_CALLS`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID`
- `ELEVENLABS_AGENT_PHONE_NUMBER_ID`
- `ELEVENLABS_WEBHOOK_SECRET`
- `VENDOR_CALL_TEST_MODE`
- `VENDOR_CALL_TEST_NUMBER`
- `VENDOR_CALL_PROVIDER`
- `TWILIO_VOICE_NUMBER`
- `TWILIO_MEDIA_STREAM_URL`
- `INBOUND_EMAIL_ADDRESS`

Places:

- `GOOGLE_PLACES_API_KEY`
- `VITE_GOOGLE_PLACES_API_KEY`

Analytics:

- `VITE_GA_MEASUREMENT_ID`

Admin/hosts:

- `SITE_ADMIN_HOST`
- `SITE_ADMIN_HOSTS`
- `DEMO_HOST`

## 10. Security And Reliability

Current controls:

- SMS phone verification before normal login completion.
- PIN login where the phone number identifies a single person record and the PIN authenticates that person.
- Stripe webhook signature verification.
- ElevenLabs webhook signature verification when configured.
- Safe return URL handling for Stripe checkout returns.
- Vendor-call production gates and test-mode override.
- Persistence barrier for mutating routes.
- Readiness endpoint for deployment checks.

Recommended hardening:

- Hash all PINs and migrate away from raw seeded PINs.
- Enforce normalized phone uniqueness for production people records within the intended tenant boundary.
- Add rate limits to login, verification, SMS webhook, and admin routes.
- Add durable sessions/JWTs with role-scoped server authorization.
- Use per-account data scoping at every API boundary.
- Add CSRF protection or same-site session controls for browser mutations.
- Validate all request bodies with a schema library.
- Store Twilio/ElevenLabs webhook payloads for replay/debugging.
- Move all normalized persistence mutations into SQL transactions.
- Add structured logs with request IDs and work-order IDs.

## 11. Deployment

Build:

```bash
npm run build
```

Start:

```bash
npm start
```

Readiness:

```bash
npm run readiness
```

AWS deployment support lives in:

- `Dockerfile`
- `deploy/aws-ecs-task-definition.example.json`
- `scripts/provision-aws-https.mjs`
- `scripts/provision-aws-dev-runtime.mjs`
- `scripts/provision-aws-live.mjs`
- `docs/aws-deploy.md`
- `docs/production-cutover.md`

## 12. Testing And Verification

Existing scripts:

- `npm run build`: Vite production build.
- `npm run check`: alias for build.
- `npm run smoke`: smoke health script.
- `npm run readiness`: local readiness check.

Recommended test additions:

- Unit tests for `smsLogic.js` command parsing and role routing.
- Unit tests for `vendorWorkflow.js` retry, hold detection, invoice recipients, and stage transitions.
- Unit tests for `stripeBilling.js` idempotency and webhook state updates with mocked fetch.
- Integration tests for login verification and work-order creation.
- Contract tests for Twilio and ElevenLabs webhook payload shapes.
- Browser smoke tests for role dashboards on desktop/mobile.
- iOS build checks for staging and production schemes.

## 13. Known Technical Debt

- `src/main.jsx` is very large and should be split into route/view/component modules.
- API route handlers are concentrated in `server/index.js`; move domain logic into controllers/services.
- Mutable shared arrays make concurrent requests risky.
- Snapshot persistence is useful but not enough for multi-tenant production querying.
- Authorization needs to become server-enforced and test-covered.
- Request validation is currently informal.
- Demo and production behaviors need continued separation.
- Observability should include structured logging, metrics, and traceable external call IDs.

## 14. Recommended Next Build Milestones

1. Split backend repositories for accounts/properties/people/work orders/invoices.
2. Add server-side auth middleware and role guards.
3. Hash PINs and add login attempt rate limiting.
4. Move work orders, messages, invoices, and audit events from snapshot arrays to Postgres tables.
5. Add automated SMS command tests and webhook contract fixtures.
6. Split React app into route-level files and shared components.
7. Add production observability for Twilio, ElevenLabs, Stripe, and persistence failures.
8. Finalize billing model and make product copy match Stripe behavior exactly.
