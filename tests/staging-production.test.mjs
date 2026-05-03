import assert from "node:assert/strict";
import test from "node:test";
import { getRuntimeEnvironment, getStateId, isDurablePersistenceRequired } from "../server/postgresState.js";

const originalEnv = { ...process.env };

test.afterEach(() => {
  process.env = { ...originalEnv };
});

test("staging host maps to the staging runtime and isolated state namespace", () => {
  process.env = {
    ...originalEnv,
    APP_ENV: "",
    APP_PUBLIC_URL: "https://staging.livingrelay.com",
    NODE_ENV: "production"
  };

  assert.equal(getRuntimeEnvironment(), "staging");
  assert.equal(getStateId(), "livingrelay-staging");
  assert.equal(isDurablePersistenceRequired(), true);
});

test("production app host maps to the production runtime and isolated state namespace", () => {
  process.env = {
    ...originalEnv,
    APP_ENV: "",
    APP_PUBLIC_URL: "https://app.livingrelay.com",
    NODE_ENV: "production"
  };

  assert.equal(getRuntimeEnvironment(), "production");
  assert.equal(getStateId(), "livingrelay-production");
  assert.equal(isDurablePersistenceRequired(), true);
});

test("explicit environment aliases normalize before host inference", () => {
  process.env = {
    ...originalEnv,
    APP_ENV: "stage",
    APP_PUBLIC_URL: "https://app.livingrelay.com",
    NODE_ENV: "production"
  };

  assert.equal(getRuntimeEnvironment(), "staging");
  assert.equal(getStateId(), "livingrelay-staging");

  process.env.APP_ENV = "prod";
  process.env.APP_PUBLIC_URL = "https://staging.livingrelay.com";

  assert.equal(getRuntimeEnvironment(), "production");
  assert.equal(getStateId(), "livingrelay-production");
});

