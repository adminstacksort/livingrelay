# LivingRelay Product Spec

## 1. Product Summary

LivingRelay is an SMS-first maintenance coordination product for small property managers, rental owners, tenants, and vendors. It helps non-technical users move a maintenance issue from tenant report to triage, approval, vendor coordination, invoice capture, and owner tax records without requiring every participant to adopt a full property-management platform.

The product's center of gravity is a shared phone number and shared login URL. Users identify themselves with their phone number and PIN, then LivingRelay resolves their role, property access, permissions, and next actions.

## 2. Problem

Small property managers often coordinate repairs through scattered SMS threads, calls, email, spreadsheets, and invoices. The pain is not only creating a ticket; it is keeping all parties aligned:

- Tenants need quick intake, follow-up questions, and status updates.
- Managers need triage, vendor options, approval controls, and reminders.
- Owners need spend approval, invoice visibility, and tax records.
- Vendors need clear scope, access notes, ETA coordination, and invoice instructions.

Traditional property-management systems are often too heavy for this coordination layer, while generic SMS/email lacks workflow state, auditability, role permissions, and records.

## 3. Target Users

### Site Admin

LivingRelay internal operator. Manages accounts, platform settings, diagnostics, global vendor-call controls, and operational visibility across tenants.

### Manager

The primary property operator. Creates and manages property profiles, tenants, owners, vendors, notification preferences, dispatch settings, work orders, invoices, and billing setup.

### Owner

Rental property owner. Reviews repair requests above thresholds, tracks work-order history, marks off-platform invoices as paid, and exports tax packets.

### Tenant

Occupant who reports maintenance issues by SMS or web. Provides issue details, photos/media, access notes, availability, timing confirmation, and completion feedback.

### Vendor

Service provider. Receives job scope, accepts or declines work, gives ETA/quote details, requests more information, and sends completion/invoice information.

## 4. Product Principles

- SMS first, web supported: the primary workflow should work over text messages, with web and iOS dashboards for richer operations.
- One URL, role-aware experience: avoid separate portals for each role.
- Human approval gates: managers and owners stay in control of spend and dispatch decisions.
- Off-platform repair payments in v1: LivingRelay tracks vendor invoices and paid status but does not pay vendors.
- Low-friction identity: phone + PIN keeps access simple, with SMS verification and stronger checks for privileged flows.
- Operational audit trail: every meaningful action should create a timeline, message, or audit event.
- Safe vendor automation: AI vendor outreach is gated by platform, account, and property controls, with test mode before production calls.

## 5. MVP Scope Implemented In This Repo

### Shared Phone + PIN Login

Users enter a phone number and PIN. The backend resolves the matching person, sends an SMS verification challenge for normal users, and returns role-scoped state after verification. Seeded test users can bypass SMS verification for smoke tests.

Supported roles:

- Site Admin
- Manager
- Owner
- Tenant
- Vendor

### Role-Specific Dashboards

The React app renders role-specific views from `/api/state`:

- Site admin console: account visibility, diagnostics, platform settings, directory, properties, work orders, billing, and audit log.
- Manager operations view: active property, work-order queue, dispatch workflow, stale nudges, vendor outreach, invoices, and billing.
- Owner view: approvals, invoice records, tax packet controls, paid status.
- Tenant view: maintenance request creation and existing request status.
- Vendor view: assigned jobs and dispatch context.

### Property Onboarding And Directory

Managers and site admins can create account/property records, add people, create properties, configure owners/managers, and add vendors. Google Places autocomplete is supported when a Places API key is configured.

### SMS Intake And Command Handling

Twilio inbound SMS posts to `/api/twilio/inbound`. LivingRelay matches the sender to a person, resolves role context, and handles:

- Tenant issue creation and troubleshooting replies.
- Tenant availability, confirmation, and cancellation.
- Manager approval, vendor selection, close, and call-me commands.
- Owner approval, denial, questions, and paid-status commands.
- Vendor accept/decline/issue responses.

### AI-Assisted Triage

Tenant messages are classified into trade, urgency, and estimated cost. The app starts safe troubleshooting, asks for missing details, and escalates to manager/vendor workflows when the tenant confirms the issue is not self-fixable or the issue requires immediate attention.

### Vendor Coordination

Vendor coordination supports configured vendors, Anthropic-powered local vendor research fallback, demo outreach, and ElevenLabs/Twilio call workflows. Vendor call results are stored as structured outcomes with availability, quote, warranty, discount, photo needs, invoice instructions, transcript, and retry metadata.

### Dispatch Approval Flow

Work orders track manager approval, owner approval, dispatch stage, tenant timing confirmation, selected vendor outcome, and booking status. Property dispatch settings control automatic or manager-approved outreach, emergency behavior, vendor count, tenant availability requirements, production call enablement, retry policy, and invoice-recipient policy.

### Billing

Stripe supports:

- Customer creation.
- Setup-mode checkout for saving a payment method.
- Billing portal session.
- Annual owner subscription checkout.
- Dispatch coordination fee charging after vendor booking.
- Webhook handling for setup and subscription state.

The business model represented in code is `$0/property + $25 vendor dispatch`, plus an annual owner subscription amount configurable through environment variables.

### Invoice And Tax Records

Invoices are tracked as off-platform vendor payments. LivingRelay records vendor, amount, status, payment rail, recipients, delivery instructions, tax year, category, document details, paid status, and owner expense uploads. Owners can view tax summaries, request tax bundles, and download CSV exports.

### Stale Work-Order Nudges

The backend identifies stale work orders and can send nudges for individual orders or all stale orders on a property. This helps managers avoid losing repair threads after initial intake or approval.

### iOS Clients

The repo includes SwiftUI iOS apps:

- `livingrelay-ios`: production/staging targets.
- `livingrelay-ios-demo`: demo-specific app separation.

The iOS scope mirrors the web role workflow: phone/PIN login, property switching, work-order metrics, issue creation, approval, dispatch, invoice creation, owner tax packets, vendor surfaces, and API health/state loading.

## 6. Key User Journeys

### Tenant Reports Issue By SMS

1. Tenant texts the LivingRelay number.
2. Backend matches the phone number to a tenant and property.
3. Issue is classified by trade, severity, and estimated cost.
4. LivingRelay sends safe troubleshooting and missing-detail questions.
5. Tenant replies with more detail, availability, photos, or confirmation that the issue still needs service.
6. Work order is escalated to the manager with vendor options when appropriate.

### Manager Reviews And Dispatches

1. Manager receives or opens the triage summary.
2. Manager reviews issue, urgency, access notes, vendor options, and approval requirements.
3. Manager approves, edits, selects vendor option, starts outreach, or closes the work order.
4. If owner approval is required, LivingRelay routes approval to the owner.
5. After approvals and tenant timing are confirmed, manager books the vendor.
6. LivingRelay records dispatch fee status, timeline events, and messages.

### Owner Approves Spend

1. Owner receives approval request when estimate exceeds property rules.
2. Owner approves, denies, asks a question, or later marks an invoice as paid.
3. Work order and invoice state update for manager and owner views.
4. Owner can retrieve invoice history and tax exports.

### Vendor Quote Call

1. Manager starts vendor outreach or property settings auto-start it after gates clear.
2. LivingRelay prepares preferred/configured vendors first, then fallback options.
3. ElevenLabs/Twilio places calls when enabled and safe gates pass.
4. Vendor call webhook stores structured outcome and transcript.
5. Manager compares outcomes and selects the best vendor.
6. Tenant confirms timing before final booking when required.

### Invoice And Tax Packet

1. Vendor/admin creates or uploads invoice metadata.
2. Invoice is tied to property, work order, vendor, tax year, and recipients.
3. Owner or manager marks paid status after off-platform payment.
4. Owner views tax-year summary, requests a bundle audit event, or downloads CSV.

## 7. Data Objects

Core product objects:

- Account: customer organization and Stripe customer state.
- Platform settings: global operational controls.
- Person: role, phone, PIN, notification settings, property links.
- Property: address, units, owner/manager, approval threshold, dispatch settings.
- Vendor: trade, phone, preference metadata.
- Work order: issue, status, approvals, dispatch stage, messages, timeline, vendor outreach, completion package.
- Vendor outcome: quote, availability, warranty, discount, invoice details, selection status.
- Call attempt: provider status, SID/conversation IDs, transcript, retry/hold metadata.
- Invoice: vendor charge record, payment status, tax metadata, recipient instructions.
- Billing event: dispatch fee or related charge event.
- Audit event: actor/action/detail log.

## 8. Permissions And Access

Current permissioning is role-scoped in application logic:

- Site admins can see full platform state and diagnostics on allowed admin hosts.
- Non-admin state excludes site-admin people and limits platform settings to safe vendor-call flags.
- Tenants see their own property and work orders.
- Vendors see assigned vendor jobs.
- Owners see their properties, approvals, invoices, and tax records.
- Managers see managed property operations and setup surfaces.

Future production hardening should move these checks to durable server-side authorization middleware instead of relying primarily on UI scope and route-level branching.

## 9. Notifications

Notification preferences currently include:

- `tenantReports`: notify on new tenant issues.
- `everyUpdate`: notify on meaningful state updates.
- `keyUpdates`: notify on approval, billing, vendor decline, completion, overdue, and similar critical events.

Defaults:

- Manager: tenant reports, every update, and key updates.
- Owner: tenant reports and key updates.

## 10. Billing Model

Current app copy and Stripe implementation support:

- No monthly per-property fee in the current prototype copy.
- `$25` dispatch coordination fee charged after a vendor is booked.
- Annual owner subscription for owner tax packet exports, configurable with `OWNER_SUBSCRIPTION_AMOUNT_CENTS`.

The spec should be revisited before launch to decide whether the first production offer is dispatch-fee-only, annual owner subscription, per-property subscription, or a hybrid.

## 11. Success Metrics

Operational metrics:

- New tenant issue to triaged work-order time.
- Triaged work order to manager action time.
- Manager approval to vendor outcome time.
- Vendor outcome to tenant timing confirmation time.
- Work order open duration and stale rate.
- Percent of work orders with complete invoice/tax metadata.

Business metrics:

- Active properties.
- Work orders per property per month.
- Dispatch fee conversion rate.
- Owner subscription conversion rate.
- SMS/voice cost per successful coordination.
- Manual manager interventions per work order.

Quality metrics:

- Misclassified trade/urgency rate.
- Vendor-call success rate.
- No-answer retry success rate.
- Tenant satisfaction/completion confirmation rate.
- Invoice export completeness.

## 12. Out Of Scope For Current V1

- Paying vendors through LivingRelay.
- Full accounting system replacement.
- Lease/rent collection.
- Enterprise property-management suite parity.
- Fully autonomous emergency dispatch without human-configured rules.
- Training custom AI models from manager corrections.
- Production-grade row-level auth and normalized repository layer across every endpoint.

## 13. Open Product Questions

- Should owner subscriptions be account-wide, property-specific, or tax-year-specific?
- Should SMS users need repeat PIN verification after initial phone verification?
- Should vendor web access require PIN, signed links, or SMS-only flows?
- Which emergency categories can bypass normal approval thresholds?
- What is the final launch pricing model?
- Should invoice ingestion support inbound email parsing, file upload, or both first?
- How much AI confidence should be shown to managers versus hidden behind recommended actions?
