import assert from "node:assert/strict";
import test from "node:test";
import { buildTenantAvailability, tenantPresenceLikelyRelevant } from "../server/vendorWorkflow.js";

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
