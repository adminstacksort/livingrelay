# Property Management Software Integration Plan

## Recommendation

Build a few integrations, but do not make them a launch blocker.

LivingRelay should remain an SMS-first maintenance coordination layer for small operators. Property management software integrations are useful when they reduce duplicate data entry, keep the manager's source-of-record current, or help import an existing portfolio. They are not necessary for the first repair workflow because LivingRelay already owns the intake, triage, approval, vendor outreach, invoice metadata, and owner tax-record loop.

The best first move is a provider-neutral integration model, then two or three connectors where the API surface is public enough and the customer overlap is strong.

## Market Read

### AppFolio

AppFolio is important because many professional managers use it, but it is not the easiest first integration. AppFolio's public materials emphasize the AppFolio Stack partner marketplace and official partner integrations such as Property Meld, Breezeway, AppWork, HappyCo, and PointCentral. Maintenance partners sync property, resident, vendor, work order, invoice, and unit-turn data into AppFolio.

For LivingRelay, AppFolio is a high-value enterprise/professional-manager target, but likely requires partnership approval or a third-party bridge. A direct integration should wait until there is a committed customer or marketplace path.

### Buildium

Buildium is a strong early candidate. It has an official Open API, a developer portal, self-service API keys, sandbox and production base URLs, and maintenance objects that overlap well with LivingRelay. Buildium customers can submit work orders with images and documents, use a Maintenance Contact Center, track vendor performance, and pay vendors inside the accounting system.

LivingRelay should integrate by reading residents/properties/units/vendors, creating or updating Buildium maintenance tasks, and attaching LivingRelay's coordination summary back to the Buildium record.

### DoorLoop

DoorLoop is also a strong early candidate. DoorLoop documents a REST API and API reference, exposes data through JSON endpoints, and has maintenance concepts that line up with LivingRelay: tenant requests, work orders, vendor assignment, status, priority, costs, timelines, and automated workflows. DoorLoop also explicitly positions Zapier and its API as integration paths.

DoorLoop may be the best first "modern PMS" connector because the customer segment includes small-to-mid operators and the API posture is friendly.

### TenantCloud

TenantCloud is a good small-operator candidate. It has an official GraphQL API using personal access tokens, and the product serves landlords, property managers, tenants, owners, and service pros. Its maintenance surface includes tenant requests, work orders, service-pro communication, invoices, owner visibility, and several third-party integrations.

This connector should start as account-level PAT sync rather than marketplace OAuth: import properties, units, tenants, owners, and vendors; optionally push work-order summaries and invoice metadata.

### Rentec Direct

Rentec Direct is promising for small property managers because it offers an Open API on Pro and PM plans, says the API is RESTful, and calls out workflow automation, raw-data access, integrations, webhooks, and additional endpoint requests for vendors. It also has a work-order system with tenant portal submissions, owner access, vendor assignment, bids, invoices, and email/text communication.

This should be evaluated alongside TenantCloud for the "small PM" connector slot.

### Avail, TurboTenant, Hemlane, Innago

These are relevant to owner-operators, but they vary in integration readiness.

Avail and TurboTenant are strong product-overlap signals for DIY landlords: maintenance tracking, tenant portals, messaging, costs, photos, and work-order sharing. I did not find a clearly public API path in the quick pass, so these should be treated as manual import/export, email-forwarding, or Zapier-style candidates until proven otherwise.

Hemlane is close to LivingRelay's value proposition because it offers repair coordination, text/email vendor communication, troubleshooting, thresholds, and 24/7 repair coordination. That makes it both a competitive reference and a possible migration/import target rather than an obvious integration partner.

Innago advertises integrations and APIs, but the public page I found was thin. Keep it on the watchlist, but do not prioritize until API details are clearer.

## Is An Integration Necessary?

Not for V1 adoption by small owners. A user can create a property, add tenants/vendors, and receive SMS-based requests without connecting anything.

Yes for three cases:

1. Managers with 20+ doors already have residents, units, owners, and vendors somewhere else.
2. Managers using Buildium, DoorLoop, AppFolio, TenantCloud, or Rentec Direct do not want work orders split across two systems.
3. LivingRelay wants to sell as an add-on maintenance coordinator rather than asking customers to switch systems.

The integration promise should be: "Keep your PMS as the source of record. LivingRelay handles the messy repair coordination and writes back a clean record."

## Integration Shape

### Phase 1: Portable Integration Backbone

Add provider-neutral tables and APIs:

- `integration_connections`: account, provider, auth mode, encrypted credentials reference, scopes, status, last sync timestamps.
- `external_mappings`: provider, external object type/id, LivingRelay object type/id, sync direction, last seen hash.
- `integration_events`: inbound/outbound sync attempts, payload summary, status, retry metadata.
- `work_orders.external_source`: provider and external id.
- `invoices.external_source`: provider and external id.

Core sync contract:

- Import: accounts/properties/units/tenants/owners/vendors.
- Export: work-order summary, status, selected vendor, tenant availability, owner approval, invoice metadata, completion notes.
- Optional two-way: new PMS maintenance request creates a LivingRelay work order; LivingRelay status updates the PMS work order.

### Phase 2: CSV Import And Email Intake

Before full APIs, ship low-friction connectors:

- CSV import for property/unit/person/vendor setup.
- Dedicated forwarding inbox for PMS notification emails, parsed into LivingRelay draft work orders.
- Manual "Copy to PMS" summary with stable fields for teams that cannot grant API access.

This captures value immediately and avoids overbuilding partner-specific code before customer demand is proven.

### Phase 3: First API Connectors

Recommended order:

1. DoorLoop: modern REST API, good small-to-mid-market fit, maintenance/writeback alignment.
2. Buildium: mature Open API and strong source-of-record fit for professional small PMs.
3. TenantCloud or Rentec Direct: choose based on early customer interviews and API coverage for work orders.
4. AppFolio: pursue when a paying customer or partner route justifies the heavier marketplace/approval path.

## Data Flow

### Inbound From PMS

1. Nightly or webhook sync imports properties, units, active tenants, owners, and vendors.
2. New PMS maintenance requests become LivingRelay work orders when enabled.
3. LivingRelay dedupes by external id, tenant phone, unit, and open issue similarity.
4. Tenant SMS replies enrich the LivingRelay work order instead of making the PMS the conversational surface.

### Outbound To PMS

1. When LivingRelay creates a work order from SMS, create a PMS work order if the property is mapped.
2. Push timeline milestones: triaged, manager approved, owner approved, vendor contacted, vendor booked, resolved.
3. Attach or append a completion summary: issue, photos/media references, vendor outcome, estimate, invoice metadata, approval history, tenant confirmation.
4. Do not push every SMS message by default; push digest summaries to avoid noisy PMS records.

## Product Boundaries

LivingRelay should not attempt to sync rent payments, ledgers, lease documents, deposits, trust accounting, owner distributions, or vendor payments in the first integration wave.

It should sync only the objects needed for maintenance coordination:

- property/unit identity
- tenant/owner/manager/vendor contacts
- work-order lifecycle
- approval and dispatch state
- invoice metadata and tax category

## Open Questions

- Which PMS do the first ten real prospects already use?
- Are customers willing to create API tokens, or do they need OAuth/partner marketplace install flows?
- Should LivingRelay create new PMS work orders for SMS-originated issues, or only write a summary after vendor booking?
- For AppFolio, is an official Stack partnership realistic, or should we wait for a customer with existing partner access?
- Which sync direction matters most commercially: portfolio import, PMS request ingestion, or work-order writeback?

## Decision

Start with CSV import plus the provider-neutral integration backbone. Then build DoorLoop and Buildium API connectors first, with TenantCloud/Rentec Direct as the next small-operator slot. Treat AppFolio as strategic but not first, because the integration value is high and the partnership/API path is heavier.
