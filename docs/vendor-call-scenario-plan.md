# Vendor Call Scenario Plan

LivingRelay's vendor-calling goal is not simply to place calls. The goal is to help the tenant get the repair they need, while staying inside the property manager's instructions, owner approval rules, tenant access constraints, vendor qualification rules, and billing policy.

This document maps common repair-call scenarios, expected agent behavior, system state transitions, and implementation needs for the ElevenLabs + Twilio workflow.

## Current Voice Architecture

LivingRelay supports two call modes:

- `twilio_register`: LivingRelay starts the outbound call through Twilio, Twilio calls back to LivingRelay, and LivingRelay registers the answered call with ElevenLabs. This gives LivingRelay control over Twilio status callbacks, media stream/listen-in, retry policy, and manager takeover. ElevenLabs' register-call docs describe this as the advanced path for teams that need custom Twilio routing and control.
- `elevenlabs_native`: LivingRelay calls ElevenLabs' outbound-call endpoint directly. ElevenLabs returns a `conversation_id` and `callSid` when available.

Important platform facts:

- ElevenLabs register-call accepts `conversation_initiation_client_data`, so LivingRelay can pass work order, property, tenant access, vendor questions, invoice instructions, and manager policy as dynamic variables.
- ElevenLabs outbound-call returns `conversation_id`/`callSid` when successful, which enables post-call persistence and, where enabled, real-time monitoring.
- ElevenLabs post-call webhooks can provide transcript, analysis, and data collection results after the call ends.
- ElevenLabs real-time monitoring can stream text events for live conversations, but it requires monitoring enabled and appropriate API key permissions.
- Twilio status callbacks provide call lifecycle outcomes such as ringing, answered, completed, busy, failed, canceled, and no-answer.
- Register-call mode does not give ElevenLabs direct Twilio account control for transfers; LivingRelay must handle Twilio-side transfer/takeover logic.

References:

- ElevenLabs register-call: https://elevenlabs.io/docs/eleven-agents/phone-numbers/twilio-integration/register-call
- ElevenLabs outbound-call: https://elevenlabs.io/docs/eleven-agents/api-reference/twilio/outbound-call
- ElevenLabs dynamic variables: https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables
- ElevenLabs real-time monitoring: https://elevenlabs.io/docs/eleven-agents/guides/realtime-monitoring
- Twilio Voice status callbacks: https://www.twilio.com/docs/voice/api/call-resource
- Twilio Gather for speech/DTMF phone trees: https://www.twilio.com/docs/voice/twiml/gather

## Guiding Policy

The agent should be a coordinator, not an unchecked dispatcher.

Default behavior:

1. Identify the vendor/business and whether they can help with the trade.
2. Confirm whether this call is reaching a real service provider, voicemail, phone tree, or wrong/out-of-service number.
3. Share only the vendor-ready repair scope: property area, issue, urgency, access windows, tenant constraints, and invoice delivery instructions.
4. Ask the required vendor questions: availability, fees, discount, warranty, needed photos/access details, invoice delivery.
5. Never authorize work beyond approval limits or property manager instructions.
6. Never give lockbox/gate/tenant-sensitive access details unless the vendor is selected/approved under policy.
7. Prefer capture-and-recommend when uncertain; auto-book only when every booking gate is clear.

Auto-booking should require:

- Property dispatch settings allow automatic outreach/booking.
- Manager approval is not required or has already cleared.
- Owner approval is not required or has already cleared.
- Tenant availability/access is confirmed when required.
- Vendor outcome is clearly available and does not need photos, callback, online booking, or additional manager decision.
- Vendor is acceptable under property manager vendor rules.

## Call Outcome State Model

Use these normalized statuses for attempts and outcomes:

- `initiated`
- `ringing`
- `answered`
- `available`
- `needs_manager_review`
- `needs_tenant_info`
- `needs_photos`
- `online_booking_required`
- `callback_requested`
- `closed_now`
- `phone_tree`
- `voicemail_left`
- `wrong_number`
- `number_disconnected`
- `out_of_business`
- `not_available`
- `declined`
- `busy`
- `no-answer`
- `failed`
- `hold_timeout`
- `booked`

Each outcome should store:

- Vendor name and phone.
- Business identity confidence.
- Conversation/call IDs.
- Transcript summary and full transcript.
- Earliest availability.
- Price/fee notes.
- Warranty notes.
- Access/photo requirements.
- Booking next step.
- Whether manager, owner, tenant, or system action is needed.
- Retry/callback time when applicable.

## Scenario Matrix

### 1. Number Does Not Work

Examples:

- Disconnected number.
- Invalid phone number.
- Carrier failure.
- Twilio returns failed or unreachable.

Expected handling:

- Mark attempt `number_disconnected` or `failed`.
- Do not retry the same number more than policy allows.
- Try next preferred vendor if available.
- Alert manager if all preferred vendors fail.
- Suggest updating vendor directory.

Can the stack handle it?

- Twilio status callbacks can report failed call states.
- ElevenLabs call initiation failure webhooks can report failures in native mode.
- LivingRelay should normalize both into the same retry/fallback path.

Needed logic:

- Distinguish invalid/disconnected from temporary busy/no-answer.
- Auto-disable or flag vendor phone after repeated disconnected outcomes.
- Add manager task: "Verify vendor phone."

### 2. Business Is Out Of Business

Examples:

- Recording says permanently closed.
- Vendor says they no longer operate.
- Website/phone tree says business closed permanently.

Expected handling:

- Mark vendor `out_of_business`.
- Do not retry.
- Remove from preferred dispatch rotation until manager reviews.
- Call next vendor.
- Notify manager if this was the only configured vendor for that trade.

Can the stack handle it?

- ElevenLabs can detect and summarize this from conversation content.
- Post-call transcript/data collection can persist it.

Needed logic:

- Add data collection fields: `business_operating_status`, `vendor_usable`, `do_not_retry_reason`.
- Add vendor directory flag: `inactiveReason: out_of_business`.

### 3. Wrong Number

Examples:

- Person answers and says this is not the vendor.
- Residential number.
- Different business.

Expected handling:

- Apologize, do not discuss property/tenant details further.
- Mark `wrong_number`.
- Do not retry.
- Flag vendor record for manager cleanup.
- Continue to next vendor if allowed.

Can the stack handle it?

- ElevenLabs can follow prompt instructions.
- Twilio/ElevenLabs transcript provides evidence.

Needed logic:

- Agent prompt must stop sharing details after wrong-number detection.
- Redact sensitive property details in future wrong-number calls by requiring business identity before full scope.

### 4. No Answer

Examples:

- Ring no answer.
- Timeout.
- Call goes unanswered.

Expected handling:

- Mark `no-answer`.
- Retry according to policy, for example 10 minutes later, maximum 3 attempts.
- Call next vendor in parallel or sequence depending on property settings.
- If emergency, do not wait too long before trying the next vendor.

Can the stack handle it?

- Twilio status callback supports no-answer-like call statuses.
- Existing retry policy can schedule retries.

Needed logic:

- Separate emergency retry cadence from normal retry cadence.
- Avoid infinite retry loops across server restarts by persisting retry jobs or scanning due retries.

### 5. Busy Signal

Expected handling:

- Mark `busy`.
- Retry after shorter interval.
- Try next vendor if urgency is high.

Can the stack handle it?

- Twilio status callback can report busy.
- ElevenLabs failure webhook may report busy in native mode.

Needed logic:

- Keep busy retry shorter than no-answer.
- Do not treat busy as a vendor decline.

### 6. Voicemail

Examples:

- Personal voicemail.
- Business voicemail.
- After-hours mailbox.

Expected handling:

- Leave a short, safe message only if manager settings allow voicemail.
- Message should include LivingRelay callback number, work order ID, trade, urgency, and high-level issue.
- Do not include lockbox codes, tenant phone, or sensitive access details.
- Mark `voicemail_left`.
- Continue calling other vendors if urgent or if voicemail is not enough.

Can the stack handle it?

- Twilio machine detection can identify answering machines.
- ElevenLabs may converse with voicemail, but voicemail-specific handling should be explicit.

Needed logic:

- Add property setting: `allowVendorVoicemail`.
- Add voicemail script.
- Persist voicemail transcript/summary.

### 7. Phone Tree / IVR

Examples:

- "Press 1 for service, press 2 for billing."
- "Say service department."
- Multi-level IVR.

Expected handling:

- If the route is obvious, navigate to repair/service scheduling.
- If account number/customer number is requested and unavailable, mark `phone_tree_needs_manager`.
- If stuck or held too long, mark `phone_tree` or `hold_timeout` and try alternate vendor or manager takeover.

Can the stack handle it?

- Twilio can handle DTMF and TwiML `<Gather>` in Twilio-owned flows.
- ElevenLabs may be able to speak responses to speech IVRs.
- ElevenLabs register-call mode gives LivingRelay Twilio control, but the AI agent itself needs tool/control support for DTMF if pressing keys is required.

Needed logic:

- Add agent tool: `send_dtmf(digits)` backed by Twilio call update or TwiML control, if feasible.
- Add phone tree policy: max depth, max hold time, approved menu choices.
- Add manager takeover when IVR requires account-specific info.

### 8. Long Hold / Hold Music

Expected handling:

- Detect hold phrases or silence/hold-music state.
- Wait up to policy limit.
- If emergency, try next vendor while this call is on hold or end and move on.
- Mark `hold_timeout`.

Can the stack handle it?

- Transcript can catch phrases such as "please hold".
- Audio-level hold music detection is not currently implemented.

Needed logic:

- Current text-based hold phrase detection is a start.
- Add timer-based policy per attempt.
- Consider Twilio media stream analysis later for hold music/silence.

### 9. Business Closed Right Now / Call Back During Hours

Examples:

- "We are closed. Call back at 8 AM."
- After-hours answering service asks for callback.

Expected handling:

- Capture hours and callback time.
- If non-emergency, schedule callback.
- If emergency, ask if there is emergency dispatch; if no, call next vendor.
- Mark `closed_now` or `callback_requested`.

Can the stack handle it?

- ElevenLabs can capture hours/callback details.
- LivingRelay can persist retry/callback time.

Needed logic:

- Store `callbackAfter` and `businessHours`.
- Add scheduled callback worker/automation that survives restarts.
- Emergency path should continue vendor search immediately.

### 10. Business Wants Online Booking

Examples:

- "Go to our website."
- "Book through Housecall Pro/ServiceTitan/Calendly."
- "Fill out the form."

Expected handling:

- Ask whether phone booking is possible for property managers.
- If online booking required, capture URL and required fields.
- Do not enter tenant-sensitive access details or payment info automatically unless manager has approved that integration.
- Mark `online_booking_required`.
- Notify manager with booking URL and prefilled recommended details.

Can the stack handle it?

- Voice call can capture the instruction.
- ElevenLabs/Twilio do not themselves browse websites.
- LivingRelay can later use a browser/form integration or manager task.

Needed logic:

- Add outcome fields: `onlineBookingUrl`, `requiredBookingFields`, `managerActionRequired`.
- Add manager UI action: "Open booking page" with copied scope.
- Future: safe browser automation for approved vendor portals.

### 11. Vendor Needs Photos First

Expected handling:

- Ask which photos are needed.
- Mark `needs_photos`.
- Ask tenant for specific safe photos.
- Do not book until photos are collected unless manager overrides.

Can the stack handle it?

- ElevenLabs can ask and capture required photos.
- LivingRelay already supports tenant media intake.

Needed logic:

- Convert vendor photo request into tenant SMS/app prompt.
- Attach photos to next vendor callback.

### 12. Vendor Needs More Access Details

Examples:

- Parking.
- Gate code.
- Pets.
- Permission to enter.
- Tenant must be home.

Expected handling:

- Capture exactly what is missing.
- Mark `needs_tenant_info`.
- Ask tenant or manager for missing info.
- Do not book until required access details are resolved.

Can the stack handle it?

- ElevenLabs can collect the missing requirements.
- LivingRelay can persist tenant availability and access fields.

Needed logic:

- Add structured `missingAccessFields`.
- Add tenant follow-up message template.

### 13. Vendor Is Available And Quote Is Under Approval Limit

Expected handling:

- Capture quote/range, fees, arrival window, warranty, and invoice instructions.
- If auto-booking gates are clear, book.
- Notify tenant, manager, owner as configured.
- Trigger dispatch fee only once booking is confirmed.

Can the stack handle it?

- Existing webhook/outcome path captures vendor result.
- Auto-booking exists when property settings and approvals allow it.

Needed logic:

- Ensure manager settings explicitly opt into automatic booking.
- Ensure quote/range comparison to owner threshold handles ranges conservatively.

### 14. Vendor Is Available But Quote Exceeds Approval Limit

Expected handling:

- Do not book automatically.
- Capture estimate and availability hold if possible.
- Send owner approval request with vendor recommendation.
- Ask vendor how long the slot can be held.

Can the stack handle it?

- ElevenLabs can ask hold-window question.
- LivingRelay can route owner approvals.

Needed logic:

- Add `slotHoldUntil`.
- Add owner approval flow tied to selected outcome.

### 15. Vendor Asks For Payment / Deposit / Card

Expected handling:

- Do not provide payment method.
- Ask if they can invoice after service or send invoice/payment link to manager/owner.
- Mark `payment_required`.
- Manager review required.

Can the stack handle it?

- ElevenLabs can be prompted never to provide payment info.
- LivingRelay tracks vendor-direct invoice/payment status.

Needed logic:

- Add payment-required outcome.
- Optional manager notification for deposit decision.

### 16. Vendor Requests Tenant Phone Or Direct Tenant Coordination

Expected handling:

- Follow property manager policy.
- Prefer LivingRelay-mediated coordination.
- If manager permits direct tenant scheduling, share only approved tenant contact method.
- Otherwise collect vendor callback/ETA and relay to tenant through LivingRelay.

Can the stack handle it?

- ElevenLabs can follow dynamic manager policy.

Needed logic:

- Add property setting: `allowDirectTenantVendorContact`.
- Agent prompt must not disclose tenant phone unless allowed.

### 17. Vendor Declines Trade / Does Not Service Area

Expected handling:

- Mark `declined` with reason.
- Do not retry for same issue.
- Try next vendor.
- Optionally update vendor service area/trade metadata.

Can the stack handle it?

- ElevenLabs can capture reason.
- LivingRelay can persist outcome.

Needed logic:

- Add vendor metadata update suggestion for manager.

### 18. Vendor Can Come But Timing Conflicts With Tenant

Expected handling:

- Ask for alternate windows.
- Compare against tenant availability.
- If no overlap, mark `tenant_timing_confirmation`.
- Ask tenant to approve one of the vendor windows.

Can the stack handle it?

- ElevenLabs can capture multiple windows.
- LivingRelay stores preferred windows.

Needed logic:

- Store structured `vendorWindows`.
- Add tenant window confirmation prompt.

### 19. Emergency Vendor Dispatch

Examples:

- Active water leak.
- No heat in required conditions.
- Electrical safety issue.
- Broken lock/security issue.

Expected handling:

- Prioritize speed.
- Try multiple approved vendors faster.
- Escalate to manager takeover if needed.
- Do not wait for normal callback windows.
- Still respect legal/property rules and owner approval settings unless emergency override exists.

Can the stack handle it?

- Twilio can place calls and track statuses.
- ElevenLabs can call and capture availability.
- LivingRelay needs emergency-specific retry and escalation policy.

Needed logic:

- Emergency vendor pool.
- Parallel/sequential call policy.
- Manager notification if no vendor accepts within threshold.

### 20. Vendor Books The Job

Expected handling:

- Confirm vendor, time window, expected fee, invoice recipient, access instructions, and whether tenant must be present.
- Mark work order `Vendor scheduled`.
- Notify tenant/manager/owner/vendor as configured.
- Trigger dispatch billing event once, idempotently.
- Save transcript and summary.

Can the stack handle it?

- Current booking endpoint and billing event support this.
- Auto-booking exists for eligible outcomes.

Needed logic:

- Agent should not declare final booking unless all gates are clear.
- Store booking confirmation number if vendor provides one.

## Agent Prompt Requirements

The ElevenLabs agent should be instructed to:

- Confirm it reached the intended vendor/business before sharing full property details.
- Ask whether the vendor handles the trade and service area.
- Explain it is coordinating on behalf of the property manager for a rental repair.
- Ask the standard vendor questions.
- Capture exact scheduling options and constraints.
- Never promise payment, owner approval, or access beyond provided instructions.
- Never provide sensitive access details until booking is authorized.
- If blocked by phone tree, online booking, payment, missing photos, or missing tenant info, stop and record the next action.
- If urgent and vendor is unavailable, ask for emergency availability or recommendation, then proceed to next vendor.

## Structured Data To Collect From Every Call

Minimum fields:

- `business_identity_confirmed`
- `business_status`
- `call_outcome`
- `can_service_trade`
- `can_service_address`
- `earliest_arrival_window`
- `alternate_windows`
- `quote_or_fee`
- `emergency_fee`
- `discount`
- `warranty`
- `needs_photos`
- `needs_access_details`
- `needs_tenant_callback`
- `online_booking_required`
- `online_booking_url`
- `payment_required`
- `approval_required`
- `slot_hold_until`
- `invoice_delivery_confirmed`
- `callback_after`
- `manager_action_required`
- `recommended_next_step`

## Twilio + ElevenLabs Capability Fit

Good fit now:

- Calling vendors.
- Capturing call lifecycle statuses.
- Passing work order context into calls.
- Capturing post-call transcripts/results.
- Saving transcripts to portal.
- Retrying failed/no-answer/busy calls.
- Manager listen-in/takeover for Twilio-owned calls.

Good fit with configuration:

- Real-time transcript monitor, if ElevenLabs monitoring is enabled and API key has permission.
- Better structured outcome collection, if ElevenLabs data collection/tool configuration is set up.
- Phone tree speech handling, if the agent can speak menu choices.

Requires additional product work:

- DTMF phone tree control from the agent.
- Persistent scheduled callbacks across server restarts.
- Safe online booking assistance.
- Vendor directory hygiene automation.
- Emergency-specific parallel vendor calling.
- Owner approval threshold handling for quote ranges.

Not appropriate to automate fully yet:

- Entering payment information.
- Sharing tenant phone/access details without explicit policy.
- Booking through third-party websites without manager review.
- Selecting unverified vendors for high-risk/emergency work without property manager rules.

## Implementation Roadmap

### Phase 1: Normalize Outcomes

- Add enum statuses listed above.
- Add structured call outcome object to `vendorOutreach.outcomes`.
- Add manager-visible reason and next action.

### Phase 2: Configure ElevenLabs Agent/Data Collection

- Add structured data collection schema matching this doc.
- Add tools for:
  - `record_vendor_call_outcome`
  - `request_tenant_info`
  - `recommend_vendor_booking`
  - `queue_vendor_callback`
  - `flag_vendor_record`
- Keep booking itself server-side so LivingRelay can enforce approval gates.

### Phase 3: Callback And Retry Worker

- Persist due retries/callbacks.
- Add periodic worker to call due vendors.
- Emergency policy should try next vendor before waiting for callbacks.

### Phase 4: Phone Tree Handling

- Detect phone tree.
- Add DTMF tool if Twilio call control can safely send digits.
- Add max phone-tree depth and manager takeover trigger.

### Phase 5: Online Booking Workflow

- Capture booking URL and fields.
- Generate manager-ready booking packet.
- Later, add browser automation only for approved vendor portals and non-payment forms.

### Phase 6: Vendor Directory Hygiene

- Track disconnected/wrong/out-of-business outcomes.
- Suggest vendor record updates.
- Suppress vendors from auto-dispatch until reviewed.

## Acceptance Tests

Create fixtures/simulations for:

- No answer -> retry queued.
- Busy -> short retry queued.
- Disconnected -> no retry, vendor flagged.
- Out of business -> vendor flagged, next vendor called.
- Wrong number -> no property details after detection.
- Phone tree -> phone_tree status and manager action.
- Closed now -> callback scheduled or next vendor for emergency.
- Online booking required -> manager action with URL.
- Needs photos -> tenant photo request generated.
- Needs access -> tenant access follow-up generated.
- Available under threshold -> auto-book if policy allows.
- Available over threshold -> owner approval requested.
- Payment required -> manager review.
- Timing conflict -> tenant confirmation requested.
- Emergency no vendor -> manager escalation.

## Open Decisions

- Should automatic booking ever be allowed for first-time/unpreferred vendors?
- Should emergency mode call vendors in parallel or sequence?
- Should vendors be allowed to coordinate directly with tenants?
- What is the maximum hold time by urgency?
- What online booking platforms are in scope first?
- Which property manager settings should be account-level defaults versus property-level overrides?

## Recommended Immediate Next Step

Implement Phase 1 and Phase 2 together. Without structured outcome normalization, the agent can talk to vendors, but the product will keep relying on fragile text summaries. With structured outcomes and server-side booking gates, LivingRelay can safely handle most vendor-call scenarios while keeping manager/owner control where it matters.
