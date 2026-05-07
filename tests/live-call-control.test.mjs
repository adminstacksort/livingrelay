import assert from "node:assert/strict";
import test from "node:test";
import {
  applyTwilioVoiceStatusToCall,
  displayStatusForTwilioCallStatus,
  isTerminalTwilioCallStatus
} from "../server/liveCallControl.js";

test("Twilio terminal statuses are not treated as live calls", () => {
  for (const status of ["completed", "busy", "failed", "no-answer", "canceled"]) {
    assert.equal(isTerminalTwilioCallStatus(status), true);
  }
  assert.equal(isTerminalTwilioCallStatus("ringing"), false);
});

test("Twilio terminal status updates retire a live vendor call session", () => {
  const call = { status: "Live", mode: "AI handling" };
  applyTwilioVoiceStatusToCall(call, "no-answer", { now: "2026-05-06T12:00:00.000Z" });

  assert.equal(call.status, "No answer");
  assert.equal(call.mode, "AI completed");
  assert.equal(call.twilioStatus, "no-answer");
  assert.equal(call.completedAt, "2026-05-06T12:00:00.000Z");
});

test("Twilio display statuses use dashboard-friendly labels", () => {
  assert.equal(displayStatusForTwilioCallStatus("completed"), "Completed");
  assert.equal(displayStatusForTwilioCallStatus("busy"), "Busy");
  assert.equal(displayStatusForTwilioCallStatus("canceled"), "Canceled");
});
