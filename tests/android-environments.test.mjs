import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gradle = readFileSync(new URL("../livingrelay-android/app/build.gradle.kts", import.meta.url), "utf8");

test("Android staging flavor uses staging application id suffix, label, and API URL", () => {
  const staging = productFlavor("staging");

  assert.match(staging, /applicationIdSuffix = "\.staging"/);
  assert.match(staging, /resValue\("string", "app_name", "LivingRelay Staging"\)/);
  assert.match(staging, /buildConfigField\("String", "API_BASE_URL", "\\"https:\/\/staging\.livingrelay\.com\\""\)/);
});

test("Android production flavor uses the production label and API URL without an id suffix", () => {
  const production = productFlavor("production");

  assert.doesNotMatch(production, /applicationIdSuffix/);
  assert.match(production, /resValue\("string", "app_name", "LivingRelay"\)/);
  assert.match(production, /buildConfigField\("String", "API_BASE_URL", "\\"https:\/\/app\.livingrelay\.com\\""\)/);
});

test("Android unit tests are wired to run both environment flavors", () => {
  assert.match(gradle, /testInstrumentationRunner = "androidx\.test\.runner\.AndroidJUnitRunner"/);
});

function productFlavor(name) {
  const startNeedle = `create("${name}") {`;
  const start = gradle.indexOf(startNeedle);
  assert.notEqual(start, -1, `Missing ${name} flavor`);

  let depth = 0;
  for (let index = start + startNeedle.length - 1; index < gradle.length; index += 1) {
    const char = gradle[index];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return gradle.slice(start, index + 1);
  }

  throw new Error(`Could not parse ${name} flavor`);
}

