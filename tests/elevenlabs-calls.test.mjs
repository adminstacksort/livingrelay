import assert from "node:assert/strict";
import test from "node:test";
import { normalizeElevenLabsTwiml } from "../server/elevenLabsCalls.js";

test("ElevenLabs register-call XML passes through unchanged", () => {
  const twiml = "<Response><Connect><Stream url=\"wss://example.com\" /></Connect></Response>";

  assert.equal(normalizeElevenLabsTwiml(twiml), twiml);
});

test("ElevenLabs register-call JSON string is decoded before returning to Twilio", () => {
  const twiml = "<Response><Say>Hello</Say></Response>";

  assert.equal(normalizeElevenLabsTwiml(JSON.stringify(twiml)), twiml);
});

test("ElevenLabs register-call rejects non-TwiML bodies", () => {
  assert.throws(
    () => normalizeElevenLabsTwiml(JSON.stringify({ error: "missing agent" })),
    /non-TwiML response/
  );
});
