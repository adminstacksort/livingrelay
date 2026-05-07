import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTenantAvailability,
  buildVendorAgentInstructions,
  buildVendorCallOpeningScript,
  normalizeCallOutcomeStatus,
  tenantPresenceLikelyRelevant,
  vendorCallOutcomeSchemaFields
} from "../server/vendorWorkflow.js";
import { applyTwilioVoiceStatusToCall } from "../server/liveCallControl.js";

test("tenant presence is relevant for repair-person access issues", () => {
  assert.equal(tenantPresenceLikelyRelevant({ issue: "Water is leaking under the sink" }), true);
  assert.equal(tenantPresenceLikelyRelevant({ issue: "Outlet sparked once" }), true);
  assert.equal(tenantPresenceLikelyRelevant({ issue: "Can we use LivingRelay for maintenance?" }), false);
});

test("tenant availability needs follow-up when a relevant repair has no access window", () => {
  const availability = buildTenantAvailability({
    issue: "Heat is not working",
    severity: "Urgent",
    access: ""
  });

  assert.equal(availability.presenceRelevant, true);
  assert.equal(availability.needsFollowUp, true);
});

test("tenant availability accepts permission-to-enter notes for relevant repairs", () => {
  const availability = buildTenantAvailability({
    issue: "Bedroom window will not lock",
    severity: "Normal",
    access: "Permission to enter with text before entry"
  });

  assert.equal(availability.presenceRelevant, true);
  assert.equal(availability.permissionToEnter, true);
  assert.equal(availability.needsFollowUp, false);
});

test("vendor call outcome statuses normalize scenario language", () => {
  assert.equal(normalizeCallOutcomeStatus("wrong business"), "wrong_number");
  assert.equal(normalizeCallOutcomeStatus("website booking"), "online_booking_required");
  assert.equal(normalizeCallOutcomeStatus("card required"), "payment_required");
  assert.equal(normalizeCallOutcomeStatus("can dispatch"), "available");
  assert.equal(normalizeCallOutcomeStatus("vendor hung up"), "vendor_hung_up");
});

test("vendor call opening is concise and asks fit price and timing", () => {
  const script = buildVendorCallOpeningScript({
    order: { trade: "Plumbing", issue: "Toilet is leaking around the base" },
    property: { address: "11820 Sanchez St, San Francisco, CA" }
  });

  assert.match(script, /we have a leaking toilet at 11820 Sanchez St/);
  assert.match(script, /something you all can fix/);
  assert.match(script, /how much do you charge/);
  assert.match(script, /when could you come/);
});

test("vendor agent instructions include manager gates and structured schema", () => {
  const instructions = buildVendorAgentInstructions({
    order: {
      id: "WO-TEST",
      trade: "Plumbing",
      issue: "Sink is leaking",
      severity: "Urgent",
      access: "Tomorrow 9-11 AM",
      tenantAvailability: { preferredWindows: ["Tomorrow 9-11 AM"], accessNotes: "Text before entry" },
      vendorOutreach: { invoiceDeliveryInstructions: "Send invoice to manager and owner." }
    },
    property: { dispatchSettings: { allowDirectTenantVendorContact: false } }
  });

  assert.match(instructions, /Confirm you reached the intended vendor/);
  assert.match(instructions, /Open the call with this short script/);
  assert.match(instructions, /Do not schedule on the first call/);
  assert.match(instructions, /Direct tenant contact allowed: no/);
  assert.ok(vendorCallOutcomeSchemaFields.every((field) => instructions.includes(field)));
});

test("completed call with no captured vendor pricing is treated as hung up", () => {
  const call = {
    twilioStatus: "in-progress",
    summary: "ElevenLabs outbound call started.",
    transcript: [
      { speaker: "AI agent", text: "How much do you charge?" },
      { speaker: "Vendor", text: "Hello?" }
    ]
  };

  applyTwilioVoiceStatusToCall(call, "completed", { now: "2026-05-06T12:00:00.000Z" });

  assert.equal(call.status, "Hung up");
  assert.equal(call.mode, "Needs next vendor");
});

test("vendor agent instructions pin calls to the verified issue scope", () => {
  const instructions = buildVendorAgentInstructions({
    order: {
      id: "WO-TOILET",
      trade: "Plumbing",
      issue: "toilet leaking",
      severity: "Urgent",
      access: "Needs follow-up",
      tenantAvailability: { preferredWindows: [], accessNotes: "Needs follow-up" }
    },
    property: { name: "435 Hayes St", address: "435 Hayes St, San Francisco, CA 94102" }
  });

  assert.match(instructions, /Use only this verified repair scope: "toilet leaking"/);
  assert.match(instructions, /If the verified scope is a toilet leak, never mention garage doors, springs, openers/);
});
