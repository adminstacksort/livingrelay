# Real Version Plan

## Product Thesis

LivingRelay should be an SMS-first AI maintenance coordinator for small property managers.

It should not try to replace AppFolio, Buildium, Rent Manager, or accounting systems at first. It should sit above existing workflows and handle the operational pain: tenant intake, triage, approvals, vendor coordination, updates, reminders, invoices, and owner records.

## Core Principle

Everyone can use the same URL, but identity and role are determined by PIN.

Example:

```text
https://livingrelay.app
```

A user enters a phone number and PIN. The app resolves:

- who they are
- which property or unit they belong to
- whether they are manager, owner, tenant, vendor, or internal staff
- which actions they can take

This keeps the product simple for non-technical users while avoiding separate portals for every role.

## Roles

### Manager

Usually the property manager who created the property profile.

Can:

- create property profiles
- pay for subscriptions
- add tenants, owners, vendors, and staff
- set approval rules
- set vendor preferences
- view all work orders
- view invoices and tax records
- configure SMS/voice behavior

### Property Manager

Can:

- review triage
- approve dispatch
- override vendor selection
- message tenants, owners, and vendors
- close work orders
- view property stats

### Owner

Can:

- approve/deny repair spend
- see work order history
- see invoices over time
- export/email invoice bundles for tax records
- mark an invoice as paid when payment happens off platform

### Tenant

Can:

- submit requests by SMS or web
- upload photos/videos
- answer follow-up questions
- receive status updates
- confirm completion

### Vendor

Can:

- receive job scope
- accept/decline
- provide ETA
- request more details
- send invoice/photos/completion note

## Business Model

Require a paid subscription to create a property profile. This helps prevent abuse and spam.

Recommended first pricing model:

- base account includes one property
- charge per additional property
- optional usage add-on for high SMS/voice volume
- optional white-glove setup fee for importing tenants/vendors/rules

This fits the real-world value: every property creates separate operational complexity and abuse risk.

## Identity And PIN Model

Every person has:

- name
- phone number
- role
- PIN
- linked property/unit/vendor/owner profile
- SMS opt-in status
- notification preferences

Security notes:

- PINs should be hashed, not stored raw.
- Require phone verification for new users.
- Consider magic-link fallback for owners/admins.
- Rate-limit PIN attempts.
- Log access to invoices and owner records.
- Let admins rotate tenant/vendor PINs.

PIN login is good for low-friction property workflows, but high-privilege admin actions should eventually require stronger verification.

## SMS-First Workflow

The app should work natively over SMS.

Initial manager setup:

1. Manager creates property profile.
2. Manager adds tenants, owners, vendors, and their own phone number.
3. Each person receives an intro SMS with their role and PIN.
4. Tenants can text the LivingRelay number to start a maintenance request.

Tenant flow:

1. Tenant texts issue.
2. AI asks for missing details.
3. AI requests photos/video when helpful.
4. AI creates work order.
5. AI sends status updates automatically.

Manager flow:

1. Manager receives triage summary by SMS.
2. Manager replies `APPROVE`, `EDIT`, `CALL ME`, or chooses a vendor.
3. If owner approval is required, owner gets the approval request.
4. If no owner approval is required, vendor coordination starts.

Owner flow:

1. Owner receives approval request.
2. Owner replies `APPROVE`, `DENY`, or asks a question.
3. Later, owner can mark off-platform payment as paid.
4. Owner can request invoice bundle by email.

Vendor flow:

1. Vendor receives scope and access notes.
2. Vendor replies with availability/ETA.
3. AI coordinates with tenant.
4. Vendor can text completion note and invoice photo/PDF.

## Money Movement

For v1, money movement stays off platform.

The app should support:

- invoice upload by vendor/admin
- invoice status: received, sent to owner, approved, paid off platform
- reminders to owner/property manager
- invoice history per property/unit/vendor
- tax-year export bundle
- email invoice bundle to owner

Do not process payments in the first real version. Payment processing can come later if the workflow proves sticky.

## Vendor Voice Layer

Voice is useful for vendors because many service providers still operate by phone.

Short-term recommendation:

- start with Twilio SMS and Twilio Voice
- use AI-generated call scripts
- keep human approval before first live vendor calls
- record call outcome as structured notes

Provider thoughts:

- Twilio is the most practical first provider for SMS/voice primitives.
- ElevenLabs is strong for voice quality but is not a full workflow/customer-service platform by itself.
- Decagon and Sierra are more enterprise customer-service platforms; likely too heavy/expensive for an early solo-built product.
- Bland, Vapi, Retell, or similar voice-agent tools may be worth testing for vendor calls if Twilio-only voice becomes too much plumbing.

Recommended v1 approach:

1. Build reliable SMS workflow first.
2. Add click-to-call or AI-generated call scripts.
3. Add AI voice calls only for vendor availability checks after the approval workflow is solid.

## AI Behavior

AI should handle:

- issue classification
- urgency scoring
- missing-detail questions
- owner approval summaries
- vendor scope messages
- tenant-friendly status updates
- invoice extraction
- timeline summarization
- exception detection

AI should not autonomously:

- dispatch emergency work without configured rules
- approve spend above threshold
- promise exact vendor arrival
- make legal/compliance claims
- change tenant/owner records without confirmation

The product should improve over time through manager corrections:

- wrong trade
- wrong urgency
- bad vendor choice
- bad message wording
- missing context

Every correction becomes training/evaluation data for the app's prompts and rules.

## Data Model

Minimum entities:

- Account
- Subscription
- Property
- Unit
- Person
- RoleAssignment
- Vendor
- VendorRule
- ApprovalRule
- WorkOrder
- Message
- Approval
- Invoice
- TimelineEvent
- Attachment

## MVP Build Order

1. Backend, database, and auth/PIN model.
2. Manager setup for property, units, tenants, owners, vendors.
3. Shared URL login by phone + PIN.
4. Tenant request page.
5. Manager work-order desk.
6. Twilio SMS intake and outbound messages.
7. Approval workflow over SMS.
8. Vendor coordination over SMS.
9. Invoice upload and owner invoice history.
10. Basic subscription gating per property.

## Open Product Questions

- Should one admin account be allowed to manage many owners, or should owner identity be globally unique?
- Should tenants need PIN for SMS after phone verification, or only for web access?
- Should owners approve every invoice, every estimate, or only work above property thresholds?
- Should vendors have PIN access or only SMS links?
- How much should the app expose AI confidence versus just showing the recommended next action?
- What is the right escalation protocol for emergencies?
