# LivingRelay Meta Lead Campaign Plan

Working draft for a small Facebook/Instagram test aimed at owner-managers, small landlords, and small property managers in the United States.

## Goal

Start with a controlled $25-$50/day Meta campaign that produces discovery calls and qualitative feedback from real rental operators. The near-term goal is not max lead volume; it is finding people with actual maintenance-coordination pain who are willing to talk.

Success for the first 7-10 days:

- 2-3 qualified sales conversations/day is a good early target.
- 10 leads/day is possible only if we accept looser lead quality or find a strong low-friction offer.
- A qualified lead should manage or own rental property, have maintenance/vendor coordination responsibility, and provide a reachable phone or email.
- A sales conversation should answer: unit count, current maintenance intake process, biggest failure mode, vendor/owner approval process, willingness to try LivingRelay, and pricing reaction.

## Current Meta Tooling Notes

Meta appears to have released Ads AI Connectors in open beta on April 29, 2026: a hosted MCP endpoint and a local `meta` CLI for AI-agent/terminal workflows. Recent coverage says the tools use Meta Business OAuth, can create/manage/analyze campaigns, and create new campaign objects paused by default. I could not verify the official docs directly from the browser because Meta pages were login-blocked in this environment, so setup should be confirmed inside the authenticated Meta Business account before spend.

Useful references:

- Meta lead ads overview: https://www.facebook.com/business/ads/ad-objectives/lead-generation
- Meta lead ads with forms: https://www.facebook.com/business/ads/ad-objectives/lead-generation/lead-ads-with-forms
- Meta Ads AI Connector coverage: https://mcp.directory/blog/meta-ads-cli-mcp
- Connector limitation note for lead retrieval/forms: https://leadsync.me/blog/meta-ads-ai-connectors/

Local check: the `meta` CLI is not currently installed in this workspace environment.

## Compliance Watch

LivingRelay is B2B software for rental repair coordination, not an ad for rental housing availability. Still, the target segment sits close to housing. Before launch, check Meta's current policy in Ads Manager and decide whether to mark the campaign as a Special Ad Category if Meta classifies "housing-related services" broadly.

If Meta requires Housing Special Ad Category, expect restrictions:

- No age/gender narrowing.
- No ZIP-code targeting.
- Limited detailed targeting and lookalike/customer-list options.
- Broader geo controls only.

That means the creative and lead-form questions have to qualify the audience instead of relying on narrow targeting.

## Recommended Funnel

Use two paths at launch:

1. Lead objective with Instant Form for lower friction and volume.
2. Website conversion/traffic test to `https://livingrelay.com/sales` for higher-intent leads.

For the first week, allocate 70% to Instant Forms and 30% to the sales page. The existing sales page already posts to `/api/public/sales-leads`, stores inbound leads in the site admin pipeline, and sends a notification email through `SALES_LEAD_NOTIFICATION_EMAIL`.

Lead handling needs to be fast:

- Call or text every phone lead within 5 minutes when possible.
- Email every email-only lead within 15 minutes.
- Mark leads in the admin console as New, Contacted, Replied, Qualified, or Not fit.
- Feed outcomes back into the next creative/form revision daily.

## Campaign Structure

Campaign: `LR - US - Rental Maintenance Feedback Calls - Leads - 2026-05`

Objective: Leads

Budget:

- Start at $30/day if the ad account is fresh or learning.
- Raise to $50/day only after cost per qualified conversation is directionally acceptable.
- Do not optimize too early; wait for at least 20-30 leads or 3-4 days unless the spend is clearly poor quality.

Ad sets:

- `US broad property operators` - US only, broad, Advantage+ audience if available.
- `Maintenance pain keywords` - suggested interests/terms where allowed: property management, landlord, rental property, real estate investing, real estate investor, maintenance management, property maintenance, apartments, multifamily, rental housing.
- `Retargeting` - website visitors and engaged social users, if existing audiences are available and allowed.

Placements:

- Advantage+ placements initially.
- Monitor Instagram placements separately; small landlords may skew Facebook, but Instagram can still work for real estate investors.

## Offer

Primary offer:

> Help shape an SMS-first maintenance tool for small rental operators. Book a 15-minute feedback call and see whether LivingRelay can clean up tenant texts, owner approvals, vendor coordination, and repair records.

Optional incentive:

- $25 Amazon card for completed qualifying feedback calls.
- Only offer this if lead quality is too low or call-show rate needs help.
- State qualification clearly: must own/manage rental property and handle maintenance coordination.

## Instant Form Fields

Use a higher-intent form type if available. Do not over-optimize for cheap form fills.

Required:

- Name
- Email
- Phone
- Role: Property manager, owner-manager, small landlord, rental owner, other
- City/market
- Portfolio size: 1, 2-4, 5-20, 21-100, 100+

Custom qualifying questions:

- How do tenants usually report maintenance today? Text/call, email, portal, PMS, other
- What is hardest right now? Getting enough detail, owner approval, vendor availability, tenant updates, invoice records, after-hours triage
- Are you open to a 15-minute feedback call this week? Yes/No

Thank-you screen:

> Thanks. We will follow up shortly. If you want to move faster, book a time here: [Calendly or sales scheduling link].

## Draft Ads

### Angle A: Text Chaos

Primary text:

Tenant repair texts, vendor calls, owner approvals, invoice notes. If those live in five different places, I would like your feedback on LivingRelay: an SMS-first repair coordination tool for small rental operators.

Headline:

Rental maintenance texts into work orders

CTA:

Sign Up or Learn More

### Angle B: Owner-Manager

Primary text:

Own or manage a few rentals? LivingRelay is built for the awkward middle ground where a full PMS feels heavy but maintenance texts still need structure, approvals, vendor updates, and records.

Headline:

Built for small rental operators

CTA:

Book Now or Sign Up

### Angle C: Vendor Coordination

Primary text:

When a tenant reports a repair, the hard part is often everything after intake: photos, access notes, owner approval, vendor availability, booking, and invoices. Help us pressure-test LivingRelay with real operators.

Headline:

Cleaner rental repair coordination

CTA:

Learn More

### Angle D: Feedback Call

Primary text:

We are talking with landlords and small property managers about how maintenance actually gets handled. If you own/manage rentals and coordinate repairs, share your workflow and see the LivingRelay prototype.

Headline:

15-minute maintenance workflow call

CTA:

Apply Now

## Creative Direction

Use product screenshots or short demo clips, not generic stock real estate. Best first creative set:

- Screenshot/video of tenant SMS becoming a structured work order.
- Screenshot/video of manager approval + vendor options.
- Screenshot/video of owner approval/invoice record.

Creative text overlays:

- "Tenant text -> repair work order"
- "Owner approvals with context"
- "Vendor notes, invoices, and status in one place"

Avoid claims that sound like emergency repair coverage, tenant screening, housing availability, or legal/property-management advice.

## Landing Page Requirements

The current `/sales` form is usable, and the app now includes campaign-specific pages:

- `/maintenance-workflow-audit`
- `/rental-maintenance-workflow-audit`
- `/rental-maintenance-intake-kit`
- `/maintenance-kit`
- `/rental-maintenance-software`
- `/property-maintenance-coordination`
- `/tenant-maintenance-texts`
- `/try-livingrelay`
- `/pilot`

Paid traffic should primarily route to `/maintenance-workflow-audit` for qualified calls and `/rental-maintenance-intake-kit` for broader list building.

If founder/operator time is constrained, prioritize lower-touch routes:

- `/try-livingrelay` or `/pilot` for early access leads who can be handled asynchronously.
- `/rental-maintenance-software` for scalable software-interest traffic.
- `/tenant-maintenance-texts` for SMS pain-angle ads.
- `/property-maintenance-coordination` for owner/manager/vendor handoff ads.
- `/rental-maintenance-intake-kit` for broad, cheaper template lead capture.

Use `/maintenance-workflow-audit` only when there is enough calendar capacity for live calls.

Nice-to-have:

- Add a calendar booking link after form submission.
- Send the template kit automatically by email for kit leads.
- Add Meta Pixel + Conversions API deduplication.

## Launch Prerequisites

- Meta Business account and ad account access.
- Facebook Page and Instagram account connected.
- Payment method added inside Meta billing. Do not share card details in chat or commit them to files.
- Confirm whether Special Ad Category is required.
- Install/authenticate Meta Ads CLI or connect the hosted MCP in the tool that will manage campaigns.
- Privacy policy URL: `https://livingrelay.com/privacy`
- Sales URL: `https://livingrelay.com/sales`
- Scheduling URL for thank-you screen.
- Lead routing destination: existing LivingRelay admin pipeline, Meta Lead Center/Google Sheet, CRM, or all three.
- One person responsible for calling leads daily.

## Operating Rhythm

Daily for first week:

- Check spend, leads, cost per lead, cost per qualified lead, and calls booked.
- Read every lead answer manually.
- Pause obvious low-quality ads.
- Keep one variable per test: creative, offer, or form, not all three.
- Record call notes back to the lead record.

Kill criteria:

- More than $150 spent with fewer than 3 qualified conversations.
- Leads mostly tenants/vendors/job seekers/non-US despite form qualifiers.
- Cost per qualified conversation exceeds what we are willing to pay for research.

Scale criteria:

- At least 5 qualified conversations in a week.
- Clear repeated pain around maintenance text chaos, owner approvals, vendor scheduling, or invoice records.
- At least 2 prospects ask to pilot or see pricing.

## Scalable Lead Generation Track

The feedback campaign is for learning. The scalable campaign should be designed to acquire qualified demos/pilots repeatedly, with Meta optimizing toward downstream lead quality instead of cheap form fills.

### Scalable Goal

Build a campaign system that can grow from $50/day to $150-$300/day while maintaining acceptable cost per qualified opportunity.

Initial targets:

- Cost per raw lead: directional only; do not optimize around this alone.
- Cost per qualified lead: target under $75-$150 in early testing.
- Cost per booked call: target under $150-$300 until sales conversion data exists.
- Call-show rate: 50%+ for phone-confirmed leads.
- Pilot/customer intent: at least 10%-20% of qualified calls should ask about trying LivingRelay, pricing, or onboarding.

### Scalable Offer Ladder

Use offers that attract operators with real maintenance pain, not people casually curious about a startup.

Primary scalable offer:

> Get a 15-minute rental maintenance workflow audit. We will map how tenant requests, owner approvals, vendor coordination, and invoice records move today, then show where LivingRelay can reduce follow-up.

Secondary lead magnet:

> Free Rental Maintenance Intake Kit: tenant request template, owner approval template, vendor coordination checklist, and repair log spreadsheet.

Demo/pilot offer:

> Try LivingRelay on your next real maintenance request. No per-property subscription in the current pilot; pay only if vendor dispatch is booked.

The workflow audit is likely better for qualified calls. The intake kit can scale cheaper but needs stronger follow-up automation.

### Funnel Architecture

Use three campaign layers:

1. Cold acquisition: broad US owner/manager audience, lead objective, Advantage+ placements/audience where allowed.
2. Retargeting: people who watched videos, opened forms, visited `/sales`, visited resource pages, or engaged with the Page/Instagram.
3. Bottom-funnel: booked-call/demo offer for high-intent visitors and form openers who did not submit.

Lead destinations to test:

- Instant Form: highest volume, lowest friction.
- Website form: stronger intent, better analytics and routing into LivingRelay's existing lead pipeline.
- Call ads during business hours: lower volume but highest immediate intent.
- Messenger/Instagram DM ads later, if manual response capacity exists.

### Campaign Structure For Scale

Campaign 1: `LR - US - Workflow Audit - Leads - Cold`

- Objective: Leads.
- Budget: $30-$75/day at first.
- Audience: US broad, with audience suggestions only where allowed.
- Optimization: leads at launch, then conversion leads/qualified event once enough feedback signal exists.
- Creative: 6-10 ads, mostly 9:16 vertical video or product walkthrough clips.

Campaign 2: `LR - US - Maintenance Kit - Leads - Cold`

- Objective: Leads or website conversions.
- Budget: $20-$50/day.
- Audience: US broad plus allowed suggestions.
- Creative: template/checklist offer.
- Purpose: cheaper list building and nurturing.

Campaign 3: `LR - US - Demo Retargeting`

- Objective: Leads or conversions.
- Budget: $10-$25/day.
- Audience: 30-180 day website visitors, form openers, video viewers, Page/Instagram engagers, if allowed.
- Creative: direct proof/demo/pilot ask.

### Creative System

Creative is the scaling lever. Build a small library, not one perfect ad.

Formats:

- 9:16 vertical videos, 15-30 seconds.
- 1:1 feed variants from the same clips.
- Product screenshots with plain overlays.
- Founder-style direct-to-camera, if available.

First creative batches:

- `Text thread chaos`: show scattered tenant/vendor/owner communication turning into a LivingRelay work order.
- `Owner approval`: show a repair summary, estimate threshold, and approval record.
- `Vendor coordination`: show vendor availability/quote notes compared in one place.
- `Invoice/tax record`: show owner repair history and invoice tracking.
- `Small landlord angle`: "A full PMS is too much, but texts are not enough."
- `Manager angle`: "Stop rebuilding the same repair context for every owner, tenant, and vendor."

Hooks:

- "Still coordinating rental repairs from tenant texts?"
- "The repair request is not the hard part. The follow-up is."
- "For landlords with too many texts and not enough system."
- "When a tenant texts a repair, where does the history go?"
- "Small property managers do not need more portals. They need cleaner coordination."

### Lead Form For Scale

Use enough friction to protect quality. Suggested form:

- Name
- Email
- Phone
- Role
- Portfolio size
- Biggest maintenance bottleneck
- "Would you like a workflow audit, a demo, or the free templates?"

Qualification scoring:

- High: owns/manages 5+ units, provides phone, chooses audit/demo, names owner approval/vendor coordination/invoice records as pain.
- Medium: 1-4 units, provides phone or email, chooses templates but has clear pain.
- Low: no rental role, tenant/vendor/job seeker, no reachable contact, vague interest.

### Landing Page Variant

Create a paid-traffic page when ready: `/maintenance-workflow-audit` or `/rental-maintenance-workflow-audit`.

The page should open with the actual offer:

> Rental maintenance workflow audit for small landlords and property managers.

Above-the-fold elements:

- Who it is for: owners, owner-managers, small property managers.
- What they get: 15-minute workflow review, LivingRelay demo, recommended next step.
- What pain it solves: tenant intake, owner approvals, vendor coordination, invoice/repair records.
- Short form plus booking link.

Avoid a generic SaaS landing page. Paid traffic should understand in 3 seconds that this is about rental repair coordination.

### Tracking And Feedback Loop

Scalable Meta lead gen needs downstream signal.

Minimum tracking:

- UTM fields on website form submissions.
- Lead status fields in LivingRelay admin: New, Contacted, Replied, Qualified, Booked, No-show, Pilot, Customer, Not fit.
- Daily manual export/import or native sync from Meta Lead Center if Instant Forms are used.

Better tracking:

- Meta Pixel on `/sales` and future audit landing page.
- Conversions API for server-side `Lead` events from `/api/public/sales-leads`.
- Downstream events back to Meta: `QualifiedLead`, `Schedule`, `StartTrial`/`Pilot`, and `Purchase` once applicable.
- Deduplication between Pixel and CAPI.

The unlock is teaching Meta which leads became qualified calls or pilots. Otherwise the algorithm will optimize for people who submit cheap forms and never answer.

### Nurture Path

Do not rely on one call attempt.

Recommended sequence:

- Minute 0-5: call or text phone leads.
- Minute 15: email with booking link and one-line reminder of their selected pain.
- Day 1: send relevant resource/template.
- Day 3: "Want me to map your current maintenance workflow?"
- Day 7: pilot invite with a simple next step.

For template leads, send the kit immediately and follow with the workflow audit CTA.

### Scaling Rules

Do not increase budget because cost per lead looks cheap. Increase when qualified-call economics are acceptable.

Budget increases:

- Increase by 20%-30% every 3-4 days if qualified lead volume and booked calls hold.
- Add new creative before raising budget if frequency rises or CPL worsens.
- Keep retargeting budget small until cold traffic volume supports it.

Pause rules:

- Pause ads with high form opens but poor submits after enough data.
- Pause ads with cheap leads but poor role/portfolio fit.
- Pause placements that over-index on low-quality leads if breakdowns show a clear pattern.

### 30-Day Test Plan

Week 1:

- Run feedback/audit offer at $30-$50/day.
- Manually review all leads and calls.
- Identify best pain language.

Week 2:

- Add maintenance kit campaign.
- Launch retargeting.
- Create 4-6 new creatives from Week 1 learning.

Week 3:

- Add call ads or direct booked-call ads during business hours.
- Start tracking Qualified/Booked/Pilot outcomes consistently.
- Build first CAPI plan if enough volume exists.

Week 4:

- Move budget toward the best offer/creative combination.
- Cut weak lead sources.
- Decide whether to scale to $100-$150/day or tighten the offer/landing page first.
