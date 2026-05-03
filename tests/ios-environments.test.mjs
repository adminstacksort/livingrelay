import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const project = readFileSync(new URL("../livingrelay-ios/LivingRelay.xcodeproj/project.pbxproj", import.meta.url), "utf8");
const infoPlist = readFileSync(new URL("../livingrelay-ios/LivingRelay/Info.plist", import.meta.url), "utf8");

test("iOS Info.plist reads its API URL from target build settings", () => {
  assert.match(infoPlist, /<key>LRApiBaseURL<\/key>\s*<string>\$\(INFOPLIST_KEY_LRApiBaseURL\)<\/string>/);
  assert.match(infoPlist, /<key>CFBundleDisplayName<\/key>\s*<string>\$\(INFOPLIST_KEY_CFBundleDisplayName\)<\/string>/);
});

test("iOS staging target uses the staging bundle id, display name, API URL, and compilation flag", () => {
  const target = targetBuildSettings("LivingRelay Staging");

  assert.match(target, /PRODUCT_BUNDLE_IDENTIFIER = adminstacksort\.livingrelay\.staging;/);
  assert.match(target, /INFOPLIST_KEY_CFBundleDisplayName = "LivingRelay Staging";/);
  assert.match(target, /INFOPLIST_KEY_LRApiBaseURL = "https:\/\/staging\.livingrelay\.com";/);
  assert.match(target, /SWIFT_ACTIVE_COMPILATION_CONDITIONS = (?:"DEBUG STAGING"|STAGING);/);
});

test("iOS production target uses the production bundle id, display name, API URL, and compilation flag", () => {
  const target = targetBuildSettings("LivingRelay Production");

  assert.match(target, /PRODUCT_BUNDLE_IDENTIFIER = adminstacksort\.livingrelay;/);
  assert.match(target, /INFOPLIST_KEY_CFBundleDisplayName = LivingRelay;/);
  assert.match(target, /INFOPLIST_KEY_LRApiBaseURL = "https:\/\/app\.livingrelay\.com";/);
  assert.match(target, /SWIFT_ACTIVE_COMPILATION_CONDITIONS = (?:"DEBUG PRODUCTION"|PRODUCTION);/);
});

function targetBuildSettings(targetName) {
  const listPattern = new RegExp(
    `/\\* Build configuration list for PBXNativeTarget "${escapeRegExp(targetName)}" \\*/ = \\{[\\s\\S]*?buildConfigurations = \\(([\\s\\S]*?)\\);`,
    "m"
  );
  const listMatch = project.match(listPattern);
  assert.ok(listMatch, `Missing build configuration list for ${targetName}`);

  const ids = [...listMatch[1].matchAll(/([A-F0-9]{24}) \/\* (?:Debug|Release) \*\//g)].map((match) => match[1]);
  assert.equal(ids.length, 2, `${targetName} should have Debug and Release configurations`);

  return ids.map((id) => {
    const configPattern = new RegExp(`${id} /\\* (?:Debug|Release) \\*/ = \\{[\\s\\S]*?buildSettings = \\{([\\s\\S]*?)\\};[\\s\\S]*?\\n\\t\\t\\};`, "m");
    const configMatch = project.match(configPattern);
    assert.ok(configMatch, `Missing build settings for ${targetName} configuration ${id}`);
    return configMatch[1];
  }).join("\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

