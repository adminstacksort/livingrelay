import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTenantAvailability,
  buildVendorAgentInstructions,
  normalizeCallOutcomeStatus,
  tenantPresenceLikelyRelevant,
  vendorCallOutcomeSchemaFields
} from "../server/vendorWorkflow.js";

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
  assert.match(instructions, /Direct tenant contact allowed: no/);
  assert.ok(vendorCallOutcomeSchemaFields.every((field) => instructions.includes(field)));
});
