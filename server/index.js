import "dotenv/config";
import express from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accounts, auditLog, billingEvents, invoices, people, platformSettings, properties, recordAudit, saveState, vendors, waitForStatePersistence, workOrders } from "./data.js";
import { composeActionMessage, handleInboundCommand, normalizePhone } from "./smsLogic.js";
import { getTwilioStatus, sendSms } from "./twilioClient.js";
import { registerTwilioCallWithElevenLabs, startVendorQuoteCalls } from "./elevenLabsCalls.js";
import { runFullFlowDemo, selectDemoQuote, simulateVendorOutreach } from "./demoOutreach.js";
import { createDemoScenario, listDemoScenarios } from "./demoScenarios.js";
import { getStaleWorkOrders, nudgeStaleWorkOrders, nudgeWorkOrder } from "./staleNudges.js";
import { dialManagerIntoCall, getLiveCalls, listenToCall, takeOverCall } from "./liveCallControl.js";
import { buildTaxCsv, buildTaxSummary, canExportOwnerTaxPacket, recordTaxBundleAudit } from "./taxExports.js";
import { getReadiness } from "./config.js";
import { getRuntimeEnvironment, getStateId } from "./postgresState.js";
import { chargeStripeDispatchFee, createStripeOwnerSubscriptionSession, createStripePortalSession, createStripeSetupSession, dispatchFeeCents, ownerSubscriptionCents, retrieveStripeCheckoutSession, retrieveStripeSetupIntent, setCustomerDefaultPaymentMethod, stripeBillingStatus } from "./stripeBilling.js";
import { attachMediaRelay, getMediaRelayRoom } from "./mediaRelay.js";
import { consumeVerifiedPhoneToken, createPhoneChallenge, verifyPhoneChallenge } from "./phoneVerification.js";
import {
  buildTenantAvailability,
  buildInvoiceDeliveryInstructions,
  createDemoVendorOutreach,
  defaultDispatchSettings,
  ensureWorkOrderDispatchFields,
  mergeOutcomes,
  recordVendorCallResults,
  recordVendorCompletion,
  selectVendorOutcome,
  upsertCallAttempt
} from "./vendorWorkflow.js";

const app = express();
const port = Number(process.env.SERVER_PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
const siteAdminHost = process.env.SITE_ADMIN_HOST || "admin.livingrelay.com";
const siteAdminHosts = new Set([
  siteAdminHost,
  ...(process.env.SITE_ADMIN_HOSTS || "").split(",").map((host) => host.trim()).filter(Boolean),
  ...(getRuntimeEnvironment() === "staging" ? ["staging.livingrelay.com"] : [])
].map((host) => host.toLowerCase()));
const demoHost = process.env.DEMO_HOST || "demo.livingrelay.com";
const siteAdminSessions = new Set();
const appSessions = new Map();

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    if (!verifyStripeSignature(req)) {
      res.status(400).json({ error: "invalid Stripe signature" });
      return;
    }
    const event = JSON.parse(req.body.toString("utf8"));
    await handleStripeWebhookEvent(event);
    await saveState();
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = buffer;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(distDir));

app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    next();
    return;
  }
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    try {
      await waitForStatePersistence();
    } catch (error) {
      console.error(`[Persistence barrier failed] ${error.message}`);
      res.status(503);
      return originalJson({
        error: "State persistence failed. This change was not confirmed durable.",
        detail: error.message,
        environment: getRuntimeEnvironment(),
        stateId: getStateId()
      });
    }
    return originalJson(body);
  };
  next();
});

app.get("/api/health", async (req, res) => {
  const readiness = await getReadiness();
  res.json({ ok: true, service: "LivingRelay API", twilio: getTwilioStatus(), readiness });
});

app.get("/api/readiness", async (req, res) => {
  const readiness = await getReadiness();
  res.status(readiness.ok ? 200 : 503).json(readiness);
});

app.get("/api/state", (req, res) => {
  const includeSiteAdmin = isSiteAdminHost(req);
  const includeDemo = isDemoExperienceHost(req);
  res.json({
    accounts: includeSiteAdmin ? accounts : accounts.map(({ id, name, status, plan, stripeCustomerId, billingPayerRole, billingPayerPersonId, billingSetupStatus, ownerSubscriptionStatus, ownerSubscriptionPlan, ownerSubscriptionStripeId, ownerSubscriptionCurrentPeriodEnd, productionVendorCallsEnabled }) => ({
      id,
      name,
      status,
      plan,
      stripeCustomerId,
      billingPayerRole,
      billingPayerPersonId,
      billingSetupStatus: accountBillingSetupStatus({ stripeCustomerId, billingSetupStatus }),
      ownerSubscriptionStatus: ownerSubscriptionStatus || "Free",
      ownerSubscriptionPlan: ownerSubscriptionPlan || "Owner Subscription",
      ownerSubscriptionStripeId,
      ownerSubscriptionCurrentPeriodEnd,
      productionVendorCallsEnabled: productionVendorCallsEnabled !== false
    })),
    people: (includeSiteAdmin ? people : people.filter((person) => person.role !== "Site Admin")).map(safePerson),
    properties,
    platformSettings: includeSiteAdmin ? platformSettings : {
      vendorCallTestMode: platformSettings.vendorCallTestMode,
      productionVendorCallsEnabled: platformSettings.productionVendorCallsEnabled
    },
    vendors,
    workOrders,
    invoices,
    billingEvents,
    auditLog,
    twilio: getTwilioStatus(),
    stripe: stripeBillingStatus(),
    demoScenarios: includeDemo ? listDemoScenarios() : [],
    staleWorkOrders: getStaleWorkOrders({ thresholdHours: 12 })
  });
});

app.get("/api/places/autocomplete", async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;
  const input = String(req.query.input || "").trim();
  if (!apiKey || input.length < 3) {
    res.json({ predictions: [] });
    return;
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat"
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["us"]
      })
    });
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ predictions: [], error: data.error?.message || "Places autocomplete failed" });
      return;
    }
    const predictions = (data.suggestions || [])
      .map((suggestion) => suggestion.placePrediction)
      .filter(Boolean)
      .map((prediction) => ({
        placeId: prediction.placeId,
        description: prediction.text?.text || "",
        mainText: prediction.structuredFormat?.mainText?.text || prediction.text?.text || "",
        secondaryText: prediction.structuredFormat?.secondaryText?.text || ""
      }));
    res.json({ predictions });
  } catch (error) {
    res.status(502).json({ predictions: [], error: error.message });
  }
});

app.get("/api/places/:placeId", async (req, res) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;
  const placeId = String(req.params.placeId || "").trim();
  if (!apiKey || !placeId) {
    res.status(404).json({ error: "place not found" });
    return;
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,addressComponents,location"
      }
    });
    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message || "Place details failed" });
      return;
    }
    res.json({
      place_id: data.id,
      name: data.displayName?.text || "",
      formatted_address: data.formattedAddress || "",
      address_components: data.addressComponents || [],
      geometry: data.location ? { location: data.location } : undefined
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post("/api/phone-verifications/start", async (req, res) => {
  try {
    const result = await createPhoneChallenge({
      phone: req.body.phone,
      purpose: req.body.purpose || "phone_verification",
      subjectId: req.body.subjectId || ""
    });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

app.post("/api/phone-verifications/verify", (req, res) => {
  try {
    const result = verifyPhoneChallenge({
      challengeId: req.body.challengeId,
      code: req.body.code,
      purpose: req.body.purpose || "phone_verification",
      subjectId: req.body.subjectId || ""
    });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

app.post("/api/auth/login/start", async (req, res) => {
  try {
    const { phone, pin } = req.body;
    const phoneIdentity = resolveUniquePhoneIdentity(phone);
    if (phoneIdentity.error) {
      res.status(phoneIdentity.status).json({ error: phoneIdentity.error });
      return;
    }
    const person = phoneIdentity.person;
    if (person.pin !== pin) {
      res.status(401).json({ error: "Invalid phone or PIN" });
      return;
    }
    if (isTestLoginPerson(person)) {
      person.phoneVerifiedAt = new Date().toISOString();
      person.phoneVerificationRequired = false;
      saveState();
      recordAudit(person.name, "Test account login", "Seeded test account login bypassed SMS verification.");
      const token = createAppSession(person);
      setAppSessionCookie(res, token);
      res.json({ userId: person.id, person: safePerson(person), token, bypassedSms: true });
      return;
    }
    const result = await createPhoneChallenge({
      phone: person.phone,
      purpose: "login",
      subjectId: person.id
    });
    recordAudit(person.name, "Started phone login verification", `Verification sent to ${maskPhone(person.phone)}.`);
    res.json({ challengeId: result.challengeId, expiresAt: result.expiresAt, devCode: result.devCode, sms: result.sms?.sent ? { sent: true } : result.sms });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

app.post("/api/auth/login/verify", (req, res) => {
  try {
    const phoneIdentity = resolveUniquePhoneIdentity(req.body.phone);
    if (phoneIdentity.error) {
      res.status(phoneIdentity.status).json({ error: phoneIdentity.error });
      return;
    }
    const person = phoneIdentity.person;
    if (person.pin !== req.body.pin) {
      res.status(401).json({ error: "Invalid phone or PIN" });
      return;
    }
    verifyPhoneChallenge({
      challengeId: req.body.challengeId,
      code: req.body.code,
      purpose: "login",
      subjectId: person.id
    });
    person.phoneVerifiedAt = new Date().toISOString();
    person.phoneVerificationRequired = true;
    saveState();
    recordAudit(person.name, "Verified phone login", `Login verified for ${maskPhone(person.phone)}.`);
    const token = createAppSession(person);
    setAppSessionCookie(res, token);
    res.json({ userId: person.id, person: safePerson(person), token });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const token = bearerToken(req) || cookieValue(req, "lr_session");
  if (token) appSessions.delete(token);
  res.clearCookie("lr_session");
  res.json({ ok: true });
});

app.post("/api/onboarding/property", (req, res) => {
  const { propertyName, address = "", managerName, managerPhone, role = "Property manager", pin, phoneVerificationToken } = req.body;
  if (!propertyName || !managerName || !managerPhone) {
    res.status(400).json({ error: "propertyName, managerName, and managerPhone are required" });
    return;
  }
  let verifiedPhone;
  try {
    verifiedPhone = consumeVerifiedPhoneToken({
      token: phoneVerificationToken,
      phone: managerPhone,
      purpose: "onboarding"
    });
  } catch (error) {
    res.status(error.statusCode || 401).json({ error: error.message, phoneVerificationRequired: true });
    return;
  }

  const personRole = role === "Owner" ? "Owner" : "Manager";
  const canonicalManagerPhone = normalizePhone(verifiedPhone.phone || managerPhone);
  const phonePeople = peopleForPhone(canonicalManagerPhone).filter((person) => person.role !== "Site Admin");
  if (phonePeople.length > 1) {
    res.status(409).json({ error: "This phone number is assigned to multiple users. Each person must have a unique phone number before onboarding can continue." });
    return;
  }
  if (phonePeople.length === 1 && phonePeople[0].role !== personRole) {
    res.status(409).json({ error: `This phone number already belongs to a ${phonePeople[0].role}. Use a unique phone number for each person.` });
    return;
  }
  let account = accountForPhonePeople(phonePeople);
  const reconciled = Boolean(account);
  if (!account) {
    account = {
      id: `acct-${Date.now()}`,
      name: `${propertyName} account`,
      status: "Trial",
      plan: "$0/property + $25 only when a vendor is booked",
      billingPayerRole: role === "Owner" ? "Owner" : "Property manager",
      productionVendorCallsEnabled: true,
      billingSetupStatus: "Needs card",
      createdAt: new Date().toISOString()
    };
    accounts.push(account);
  }

  let person = selectOnboardingPerson(phonePeople, personRole, pin);
  if (person) {
    person.name = person.name || managerName;
    person.phone = canonicalManagerPhone;
    person.phoneVerifiedAt = new Date().toISOString();
    person.phoneVerificationRequired = true;
    person.propertyIds = person.propertyIds || [];
    person.accountIds = addUnique(person.accountIds || [], account.id);
    if (!person.notify && ["Manager", "Owner"].includes(person.role)) {
      person.notify = { tenantReports: true, everyUpdate: person.role === "Manager", keyUpdates: true };
    }
  } else {
    person = {
      id: `${personRole.toLowerCase()}-${Date.now()}`,
      name: managerName,
      role: personRole,
      phone: canonicalManagerPhone,
      phoneVerifiedAt: new Date().toISOString(),
      phoneVerificationRequired: true,
      pin: pin || String(Math.floor(1000 + Math.random() * 9000)),
      propertyIds: [],
      accountIds: [account.id],
      notify: { tenantReports: true, everyUpdate: personRole === "Manager", keyUpdates: true }
    };
    people.push(person);
  }

  const property = {
    id: `p-${Date.now()}`,
    accountId: account.id,
    name: propertyName,
    address,
    subscription: "Trial",
    plan: "$0/property + $25 only when a vendor is booked",
    units: [address || propertyName],
    adminId: person.id,
    managerId: person.id,
    ownerId: personRole === "Owner" ? person.id : null,
    billingPayerRole: role === "Owner" ? "Owner" : "Property manager",
    billingPayerPersonId: person.id,
    billingSetupStatus: "Needs card",
    approvalThreshold: 250,
    launchNotificationStatus: "Pending setup",
    dispatchSettings: defaultDispatchSettings(),
    rules: "All dispatches need manager review until tenants, owners, vendors, and approval rules are configured."
  };
  properties.push(property);
  person.propertyIds = addUnique(person.propertyIds || [], property.id);

  saveState();
  recordAudit("self-serve", reconciled ? "Added property to existing account" : "Created property", `${managerName} created ${property.name}${reconciled ? " on an existing phone account" : ""}.`);
  const token = createAppSession(person);
  setAppSessionCookie(res, token);
  res.json({ account, person, property, reconciled, phoneVerified: true, token });
});

app.use("/api/site-admin", requireSiteAdminHost);

app.post("/api/site-admin/login", (req, res) => {
  const { password } = req.body;
  const siteAdmin = people.find((person) => person.role === "Site Admin");
  if (!siteAdmin || password !== (process.env.SITE_ADMIN_PASSWORD || "owner-console")) {
    res.status(401).json({ error: "Invalid admin console password" });
    return;
  }
  const token = randomUUID();
  siteAdminSessions.add(token);
  recordAudit(siteAdmin.name, "Admin console login", "Platform admin console session started.");
  res.json({ userId: siteAdmin.id, token });
});

function requestHost(req) {
  const forwardedHost = forwardedRequestHost(req);
  return (forwardedHost || req.hostname || req.headers.host || "").split(":")[0].toLowerCase();
}

function forwardedRequestHost(req) {
  return String(req.headers["x-forwarded-host"] || "").split(",")[0].trim();
}

function isLocalDevHost(req) {
  if (forwardedRequestHost(req)) return false;
  return process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "::1"].includes(requestHost(req));
}

function isSiteAdminHost(req) {
  const host = requestHost(req);
  return siteAdminHosts.has(host) || isLocalDevHost(req);
}

function isDemoExperienceHost(req) {
  const host = requestHost(req);
  return host === demoHost || siteAdminHosts.has(host) || isLocalDevHost(req);
}

function hasSiteAdminSession(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return Boolean(token && siteAdminSessions.has(token));
}

function createAppSession(person) {
  const token = randomUUID();
  appSessions.set(token, { userId: person.id, createdAt: Date.now() });
  return token;
}

function appSessionUser(req) {
  const token = bearerToken(req) || cookieValue(req, "lr_session");
  const session = token ? appSessions.get(token) : null;
  if (!session) return null;
  return people.find((person) => person.id === session.userId) || null;
}

function bearerToken(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
}

function cookieValue(req, name) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((item) => item.trim())
    .map((item) => item.split("="))
    .find(([key]) => key === name)?.[1] || "";
}

function setAppSessionCookie(res, token) {
  res.cookie("lr_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 30
  });
}

function isDemoExperienceRequest(req, res) {
  const host = requestHost(req);
  if (host === demoHost || isLocalDevHost(req)) {
    return true;
  }
  if (siteAdminHosts.has(host) && hasSiteAdminSession(req)) {
    return true;
  }
  res.status(404).json({ error: "Demo mode is only available at demo.livingrelay.com or from the site admin console." });
  return false;
}

function requireSiteAdminHost(req, res, next) {
  if (isSiteAdminHost(req)) {
    next();
    return;
  }
  res.status(404).json({ error: "Site admin console is only available at admin.livingrelay.com" });
}

function requireSiteAdminSession(req, res, next) {
  if (hasSiteAdminSession(req)) {
    next();
    return;
  }
  res.status(401).json({ error: "Site admin login required" });
}

app.use("/api/site-admin", requireSiteAdminSession);

function requireAppSession(req, res, next) {
  if (hasSiteAdminSession(req)) {
    req.user = people.find((person) => person.role === "Site Admin") || null;
    next();
    return;
  }
  const user = appSessionUser(req);
  if (user) {
    req.user = user;
    if (!isAuthorizedAppRequest(req, user)) {
      res.status(403).json({ error: "This role cannot perform that action" });
      return;
    }
    next();
    return;
  }
  res.status(401).json({ error: "Login required" });
}

function isAuthorizedAppRequest(req, user) {
  const path = req.originalUrl.split("?")[0];
  const role = user.role;
  const managerRoles = new Set(["Manager", "Admin"]);
  const ownerManagerRoles = new Set(["Owner", "Manager", "Admin"]);
  if (path.startsWith("/api/admin/work-orders") && req.method === "POST") {
    return ["Tenant", "Manager", "Admin"].includes(role);
  }
  if (path.startsWith("/api/admin")) return managerRoles.has(role);
  if (path.startsWith("/api/billing")) return ownerManagerRoles.has(role);
  if (path.startsWith("/api/invoices")) return ownerManagerRoles.has(role);
  if (path.startsWith("/api/properties")) return ownerManagerRoles.has(role);
  if (path.startsWith("/api/people")) return managerRoles.has(role) || path.includes(`/${user.id}/`);
  if (path.startsWith("/api/work-orders")) return ["Tenant", "Manager", "Admin", "Owner", "Vendor"].includes(role);
  return true;
}

app.use([
  "/api/admin",
  "/api/billing",
  "/api/work-orders",
  "/api/invoices",
  "/api/people",
  "/api/properties"
], requireAppSession);

app.get("/api/site-admin/diagnostics", async (req, res) => {
  const readiness = await getReadiness();
  const baseUrl = process.env.APP_PUBLIC_URL || "http://127.0.0.1:8787";
  const twilio = getTwilioStatus();
  const stripe = stripeBillingStatus();
  const vendorAttempts = workOrders.flatMap((order) =>
    (order.vendorOutreach?.attempts || []).map((attempt) => ({
      workOrderId: order.id,
      vendorName: attempt.vendorName,
      phone: maskPhone(attempt.phone),
      status: attempt.status,
      provider: attempt.provider,
      attemptNumber: attempt.attemptNumber,
      retry: attempt.retry,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      hasTranscript: Boolean(attempt.transcript?.length),
      hasOutcome: Boolean(attempt.outcome)
    }))
  );
  const recentAttempts = vendorAttempts
    .sort((left, right) => new Date(right.startedAt || 0) - new Date(left.startedAt || 0))
    .slice(0, 8);
  const vendorCallEnv = ["ENABLE_VENDOR_CALLS", "VENDOR_CALL_PROVIDER", "APP_PUBLIC_URL", "TWILIO_MEDIA_STREAM_URL", "ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_AGENT_PHONE_NUMBER_ID", "ELEVENLABS_WEBHOOK_SECRET", "MEDIA_RELAY_SECRET"];
  res.json({
    generatedAt: new Date().toISOString(),
    service: {
      environment: getRuntimeEnvironment(),
      nodeEnv: process.env.NODE_ENV || "development",
      stateId: getStateId(),
      publicUrl: baseUrl,
      readinessOk: readiness.ok,
      missingRequired: readiness.missing,
      database: readiness.database,
      uptimeSeconds: Math.round(process.uptime())
    },
    twilio,
    stripe,
    ai: readiness.ai,
    vendorCalls: {
      ...readiness.vendorCalls,
      provider: process.env.VENDOR_CALL_PROVIDER || "elevenlabs_native",
      platformTestMode: platformSettings.vendorCallTestMode !== false,
      platformProductionEnabled: platformSettings.productionVendorCallsEnabled !== false,
      env: envPresence(vendorCallEnv),
      webhookUrls: {
        twilioSmsInbound: `${baseUrl}/api/twilio/inbound`,
        twilioOutbound: `${baseUrl}/api/twilio/elevenlabs/outbound`,
        twilioStatus: `${baseUrl}/api/twilio/voice-status`,
        twilioMediaStream: process.env.TWILIO_MEDIA_STREAM_URL || `${baseUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:")}/api/media/twilio`,
        stripeWebhook: `${baseUrl}/api/stripe/webhook`,
        elevenLabsResult: `${baseUrl}/api/elevenlabs/vendor-call-result`
      },
      attempts: {
        total: vendorAttempts.length,
        retryNeeded: vendorAttempts.filter((attempt) => attempt.retry?.needed).length,
        withTranscript: vendorAttempts.filter((attempt) => attempt.hasTranscript).length,
        recent: recentAttempts
      }
    }
  });
});

app.patch("/api/site-admin/platform-settings", (req, res) => {
  const allowed = ["vendorCallTestMode", "productionVendorCallsEnabled", "vendorCallTestNumber"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) platformSettings[key] = req.body[key];
  }
  platformSettings.updatedAt = new Date().toISOString();
  saveState();
  recordAudit("site-admin", "Updated platform vendor call settings", `Production calls ${platformSettings.productionVendorCallsEnabled ? "enabled" : "disabled"}; test mode ${platformSettings.vendorCallTestMode ? "enabled" : "disabled"}.`);
  res.json({ platformSettings });
});

app.post("/api/site-admin/accounts", (req, res) => {
  const {
    name,
    status = "Trial",
    plan = "$0/property + $25 vendor dispatch",
    stripeCustomerId = "",
    billingPayerRole = "Owner",
    billingPayerPersonId = "",
    billingSetupStatus = stripeCustomerId ? "Card on file" : "Needs card",
    productionVendorCallsEnabled = true
  } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const account = {
    id: `acct-${accounts.length + 1}`,
    name,
    status,
    plan,
    stripeCustomerId,
    billingPayerRole,
    billingPayerPersonId,
    billingSetupStatus,
    productionVendorCallsEnabled,
    createdAt: new Date().toISOString()
  };
  accounts.push(account);
  saveState();
  recordAudit("site-admin", "Created account", `${name} account created.`);
  res.json({ account });
});

app.patch("/api/site-admin/accounts/:id", (req, res) => {
  const account = accounts.find((item) => item.id === req.params.id);
  if (!account) {
    res.status(404).json({ error: "account not found" });
    return;
  }
  const allowed = ["name", "status", "plan", "stripeCustomerId", "billingPayerRole", "billingPayerPersonId", "billingSetupStatus", "productionVendorCallsEnabled"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) account[key] = req.body[key];
  }
  saveState();
  recordAudit("site-admin", "Updated account", `${account.name} account settings updated.`);
  res.json({ account });
});

app.delete("/api/site-admin/accounts/:id", (req, res) => {
  const account = accounts.find((item) => item.id === req.params.id);
  if (!account) {
    res.status(404).json({ error: "account not found" });
    return;
  }
  const summary = deleteAccountState(account.id);
  saveState();
  recordAudit("site-admin", "Deleted account", `${account.name} account deleted with ${summary.properties} properties, ${summary.people} people, ${summary.workOrders} work orders, and ${summary.invoices} invoices.`);
  res.json({ deleted: true, accountId: account.id, summary });
});

app.post("/api/demo/scenario", (req, res) => {
  if (!isDemoExperienceRequest(req, res)) return;
  const result = createDemoScenario(req.body.scenario);
  res.json(result);
});

app.post("/api/admin/properties", (req, res) => {
  const {
    name,
    address,
    adminId = "admin-1",
    ownerId = "owner-1",
    accountId = accounts[0]?.id || "acct-1",
    creatorRole = "Manager",
    billingPayerRole = "Owner"
  } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const property = {
    id: `p-${properties.length + 1}`,
    accountId,
    name,
    address: address || "",
    subscription: "Ready, no monthly charge",
    plan: "$0/property + $25 only when a vendor is booked",
    units: [address || name],
    adminId,
    managerId: adminId,
    ownerId,
    creatorRole,
    billingPayerRole,
    billingPayerPersonId: billingPayerRole === "Property manager" ? adminId : ownerId,
    billingSetupStatus: accountBillingSetupStatus(accounts.find((item) => item.id === accountId)),
    launchNotificationStatus: "Pending setup",
    approvalThreshold: 250,
    dispatchSettings: defaultDispatchSettings(),
    rules: "Manager is the default property operator. Contacts are saved now; tenant and owner SMS is sent only after setup is launched."
  };
  properties.push(property);
  const admin = people.find((person) => person.id === adminId);
  if (admin && !admin.propertyIds.includes(property.id)) admin.propertyIds.push(property.id);
  saveState();
  const owner = people.find((person) => person.id === ownerId);
  if (owner && !owner.propertyIds.includes(property.id)) owner.propertyIds.push(property.id);
  recordAudit("admin", "Created property", `${name} created with contacts pending launch notification.`);
  res.json({ property, billingSetupRequired: property.billingSetupStatus !== "Card on file" });
});

app.patch("/api/admin/properties/:id", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: "property not found" });
    return;
  }
  const allowed = ["name", "address", "subscription", "plan", "rules", "approvalThreshold", "adminId", "managerId", "ownerId", "billingPayerRole", "billingPayerPersonId", "billingSetupStatus", "creatorRole", "launchNotificationStatus", "dispatchSettings"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) property[key] = req.body[key];
  }
  if (req.body.units !== undefined) {
    property.units = Array.isArray(req.body.units)
      ? req.body.units
      : String(req.body.units).split(",").map((unit) => unit.trim()).filter(Boolean);
  }
  saveState();
  recordAudit("admin", "Updated property", `${property.name} admin settings updated.`);
  res.json({ property });
});

app.delete("/api/admin/properties/:id", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: "property not found" });
    return;
  }
  const summary = deletePropertyState(property.id);
  saveState();
  recordAudit("admin", "Deleted property", `${property.name} deleted with ${summary.workOrders} work orders and ${summary.invoices} invoices.`);
  res.json({ deleted: true, propertyId: property.id, summary });
});

app.post("/api/admin/people", (req, res) => {
  const { name, role, phone, email, pin, propertyId, accountId, unit, trade } = req.body;
  if (!name || !role || !phone || (!propertyId && role !== "Site Admin")) {
    res.status(400).json({ error: "name, role, phone, and propertyId are required" });
    return;
  }
  const canonicalPhone = normalizePhone(phone);
  const existingPhonePerson = peopleForPhone(canonicalPhone)[0];
  if (existingPhonePerson) {
    res.status(409).json({ error: `Phone number already belongs to ${existingPhonePerson.name}. Each person must have a unique phone number.` });
    return;
  }
  const person = {
    id: `${role.toLowerCase().replace(/\s+/g, "-")}-${people.length + 1}`,
    name,
    role,
    phone: canonicalPhone,
    email: email || undefined,
    pin: pin || String(Math.floor(1000 + Math.random() * 9000)),
    propertyIds: propertyId ? [propertyId] : [],
    accountIds: accountId ? [accountId] : undefined,
    unit: role === "Tenant" ? unit : undefined,
    trade: role === "Vendor" ? trade : undefined,
    notify: ["Manager", "Owner"].includes(role) ? { tenantReports: true, everyUpdate: role === "Manager", keyUpdates: true } : undefined
  };
  people.push(person);
  const property = properties.find((item) => item.id === propertyId);
  if (property && role === "Owner") property.ownerId = person.id;
  saveState();
  recordAudit("admin", "Added person", `${name} added as ${role}.`);
  res.json({ person });
});

app.post("/api/admin/work-orders", (req, res) => {
  const { propertyId, unit, tenantId, trade = "General", severity = "Normal", status = "Manager review", estimate = 0, vendorId, issue, access = "", actorName = "Manager", actorRole = "Manager" } = req.body;
  if (!propertyId || !unit || !issue) {
    res.status(400).json({ error: "propertyId, unit, and issue are required" });
    return;
  }
  const order = {
    id: `WO-${Math.floor(3000 + Math.random() * 6000)}`,
    propertyId,
    unit,
    tenantId: tenantId || null,
    trade,
    severity,
    status,
    estimate: Number(estimate || 0),
    vendorId: vendorId || null,
    issue,
    access,
    serviceWindow: severity === "Urgent" ? "ASAP / emergency" : "Next available",
    tenantAvailability: buildTenantAvailability({ access, severity, issue }),
    dispatchStage: "manager_approval",
    vendorOutreach: {
      status: "Not started",
      mode: "Manual",
      outcomes: []
    },
    completionPackage: {
      status: "Not requested",
      photos: [],
      notes: "",
      invoiceDelivery: "Not received"
    },
    managerApproved: false,
    ownerApproved: status !== "Owner approval",
    dispatchFee: {
      status: "Not charged",
      amount: dispatchFeeCents / 100,
      reason: "Charged only when a vendor is booked."
    },
    invoiceId: null,
    timeline: [
      {
        label: `${actorRole} created work order`,
        detail: issue,
        stamp: new Date().toISOString()
      }
    ],
    messages: []
  };
  workOrders.unshift(order);
  saveState();
  recordAudit(actorName, "Created work order", `${order.id} created by ${actorRole}.`);
  res.json({ order });
});

app.post("/api/billing/setup-session", async (req, res) => {
  try {
    const account = accounts.find((item) => item.id === req.body.accountId) || accountForProperty(req.body.propertyId);
    const property = properties.find((item) => item.id === req.body.propertyId);
    if (!account) {
      res.status(404).json({ error: "account not found" });
      return;
    }
    updateBillingPayer({ account, property, payerRole: req.body.payerRole, payerPersonId: req.body.payerPersonId });
    account.billingSetupStatus = "Setup started";
    if (property) property.billingSetupStatus = "Setup started";
    const session = await createStripeSetupSession({
      account,
      successUrl: req.body.successUrl,
      cancelUrl: req.body.cancelUrl
    });
    saveState();
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    res.status(400).json({ error: error.message, stripe: stripeBillingStatus() });
  }
});

app.post("/api/billing/portal-session", async (req, res) => {
  try {
    const account = accounts.find((item) => item.id === req.body.accountId) || accountForProperty(req.body.propertyId);
    if (!account) {
      res.status(404).json({ error: "account not found" });
      return;
    }
    const session = await createStripePortalSession({ account, returnUrl: req.body.returnUrl });
    res.json({ url: session.url });
  } catch (error) {
    res.status(400).json({ error: error.message, stripe: stripeBillingStatus() });
  }
});

app.post("/api/billing/owner-subscription-session", async (req, res) => {
  try {
    const account = accounts.find((item) => item.id === req.body.accountId) || accountForProperty(req.body.propertyId);
    const property = properties.find((item) => item.id === req.body.propertyId);
    if (!account) {
      res.status(404).json({ error: "account not found" });
      return;
    }
    const session = await createStripeOwnerSubscriptionSession({
      account,
      property,
      successUrl: req.body.successUrl,
      cancelUrl: req.body.cancelUrl
    });
    account.ownerSubscriptionStatus = "Checkout started";
    saveState();
    res.json({ url: session.url, sessionId: session.id, amount: ownerSubscriptionCents / 100 });
  } catch (error) {
    res.status(400).json({ error: error.message, stripe: stripeBillingStatus() });
  }
});

app.post("/api/billing/confirm-setup-session", async (req, res) => {
  try {
    const session = await retrieveStripeCheckoutSession(req.body.sessionId);
    if (!session || session.mode !== "setup") {
      res.status(400).json({ error: "setup session not found" });
      return;
    }
    const setupIntent = await retrieveStripeSetupIntent(session.setup_intent);
    if (session.status !== "complete" || setupIntent?.status !== "succeeded" || !setupIntent?.payment_method) {
      res.status(400).json({ error: "payment method setup is not complete" });
      return;
    }
    const account = await completeBillingSetup({
      accountId: session.metadata?.accountId || setupIntent?.metadata?.accountId,
      customerId: session.customer || setupIntent?.customer,
      paymentMethodId: setupIntent?.payment_method
    });
    saveState();
    res.json({ account, status: account?.billingSetupStatus || "Card on file" });
  } catch (error) {
    res.status(400).json({ error: error.message, stripe: stripeBillingStatus() });
  }
});

app.post("/api/billing/confirm-owner-subscription", async (req, res) => {
  try {
    const session = await retrieveStripeCheckoutSession(req.body.sessionId);
    if (!session || session.mode !== "subscription") {
      res.status(400).json({ error: "subscription session not found" });
      return;
    }
    if (session.status !== "complete" || session.payment_status !== "paid" || !session.subscription) {
      res.status(400).json({ error: "owner subscription checkout is not complete" });
      return;
    }
    const account = completeOwnerSubscription({
      accountId: session.metadata?.accountId,
      customerId: session.customer,
      subscriptionId: session.subscription,
      status: session.payment_status === "paid" ? "Active" : "Checkout completed"
    });
    saveState();
    res.json({ account, status: account?.ownerSubscriptionStatus || "Active" });
  } catch (error) {
    res.status(400).json({ error: error.message, stripe: stripeBillingStatus() });
  }
});

app.post("/api/work-orders/:id/book-vendor", async (req, res) => {
  const order = workOrders.find((item) => item.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: "work order not found" });
    return;
  }
  const property = properties.find((item) => item.id === order.propertyId);
  const account = accountForProperty(order.propertyId);
  const vendor = vendors.find((item) => item.id === (req.body.vendorId || order.vendorId));
  if (req.body.vendorId) order.vendorId = req.body.vendorId;
  ensureWorkOrderDispatchFields(order);
  order.status = "Vendor scheduled";
  order.dispatchStage = "vendor_booked";
  order.finalBooking = {
    vendorName: vendor?.name || req.body.vendorName || "Vendor",
    phone: vendor?.phone || req.body.vendorPhone || "",
    serviceWindow: req.body.serviceWindow || order.vendorOutreach?.outcomes?.find((item) => item.selected)?.availability || order.tenantAvailability?.preferredWindows?.[0] || "Needs confirmation",
    tenantConfirmed: req.body.tenantConfirmed !== false,
    bookedAt: new Date().toISOString(),
    notes: req.body.notes || ""
  };
  order.timeline.push({
    label: "Vendor booked",
    detail: `${order.finalBooking.vendorName} was booked for ${order.finalBooking.serviceWindow}. LivingRelay coordination fee applies now.`,
    stamp: new Date().toISOString()
  });
  const billingEvent = await recordDispatchBillingEvent({ account, property, order, actor: req.body.actor || "manager" });
  saveState();
  res.json({ order, billingEvent });
});

app.post("/api/work-orders/:id/vendor-outreach", async (req, res) => {
  try {
    if (req.body.mode === "demo" && !isDemoExperienceRequest(req, res)) return;
    const result = req.body.mode === "demo"
      ? createDemoVendorOutreach(req.params.id, { actor: req.body.actor || "manager" })
      : await startVendorQuoteCalls(req.params.id, {
        actor: req.body.actor || "manager",
        demoFallback: req.body.demoFallback !== false,
        testVendorPhone: req.body.testVendorPhone || "",
        testOnly: req.body.mode === "test" || req.body.testOnly === true
      });
    if (result.error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/work-orders/:id/vendor-outreach/select", (req, res) => {
  const result = selectVendorOutcome(req.params.id, req.body.outcomeId, { actor: req.body.actor || "manager" });
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/work-orders/:id/completion-package", (req, res) => {
  const result = recordVendorCompletion(req.params.id, req.body);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/admin/vendors", (req, res) => {
  const { name, trade, phone, preferred = true } = req.body;
  if (!name || !trade || !phone) {
    res.status(400).json({ error: "name, trade, and phone are required" });
    return;
  }
  const vendor = { id: `v-${vendors.length + 1}`, name, trade, phone, preferred };
  vendors.push(vendor);
  saveState();
  recordAudit("admin", "Added vendor", `${name} added for ${trade}.`);
  res.json({ vendor });
});

app.patch("/api/people/:id/notify", (req, res) => {
  const person = people.find((item) => item.id === req.params.id);
  if (!person) {
    res.status(404).json({ error: "person not found" });
    return;
  }
  person.notify = { ...(person.notify || {}), ...req.body };
  saveState();
  recordAudit(person.name, "Updated notification settings", JSON.stringify(person.notify));
  res.json({ person });
});

app.post("/api/work-orders/:id/invoices", (req, res) => {
  const order = workOrders.find((item) => item.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: "work order not found" });
    return;
  }
  const vendor = vendors.find((item) => item.id === order.vendorId);
  const property = properties.find((item) => item.id === order.propertyId);
  const contacts = getInvoiceRecipient(property);
  const invoice = {
    id: `inv-${invoices.length + 1}`,
    propertyId: order.propertyId,
    orderId: order.id,
    vendor: vendor?.name || "Vendor",
    amount: Number(req.body.amount || order.estimate || 0),
    status: "Unpaid",
    paymentStatus: "Unpaid",
    paymentRail: "Vendor direct",
    recipientName: contacts.name,
    recipientPhone: contacts.phone,
    recipientEmail: contacts.email,
    recipients: contacts.recipients,
    invoiceDeliveryInstructions: contacts.instructions,
    deliveryStatus: contacts.email ? "Ready to email property manager" : "Ready to text property manager",
    taxYear: req.body.taxYear || "2026",
    receivedAt: new Date().toLocaleDateString(),
    note: req.body.note || `Vendor invoice is paid outside LivingRelay. Track payment status here only. Requested invoice recipients: ${contacts.instructions}`
  };
  invoices.unshift(invoice);
  order.invoiceId = invoice.id;
  order.status = "Invoice received";
  order.timeline.push({
    label: "Vendor invoice logged",
    detail: `${invoice.vendor} invoice routed per property instructions: ${contacts.instructions}`,
    stamp: new Date().toISOString()
  });
  saveState();
  recordAudit("manager", "Logged vendor invoice", `${invoice.id} for ${order.id}; payment remains outside LivingRelay.`);
  res.json({ invoice, order });
});

app.patch("/api/work-orders/:id", (req, res) => {
  const order = workOrders.find((item) => item.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: "work order not found" });
    return;
  }
  const allowed = ["status", "managerApproved", "ownerApproved", "vendorId", "dispatchStage"];
  for (const key of allowed) {
    if (req.body[key] !== undefined) order[key] = req.body[key];
  }
  if (req.body.timelineLabel || req.body.timelineDetail) {
    order.timeline = order.timeline || [];
    order.timeline.push({
      label: req.body.timelineLabel || "Updated work order",
      detail: req.body.timelineDetail || "",
      stamp: new Date().toISOString()
    });
  }
  saveState();
  recordAudit(req.body.actor || req.user?.name || "app", "Updated work order", `${order.id} set to ${order.status}.`);
  res.json({ order });
});

app.post("/api/properties/:id/owner-expenses", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: "property not found" });
    return;
  }
  const invoice = {
    id: `inv-${invoices.length + 1}`,
    propertyId: property.id,
    orderId: req.body.orderId || "",
    vendor: req.body.vendor || "Owner uploaded bill",
    amount: Number(req.body.amount || 0),
    status: req.body.status || "Owner uploaded",
    paymentStatus: req.body.paymentStatus || "Paid off platform",
    paymentRail: "Owner direct",
    source: "owner_upload",
    documentName: req.body.documentName || "",
    taxYear: req.body.taxYear || new Date().getFullYear().toString(),
    taxCategory: req.body.taxCategory || "",
    capitalImprovementCandidate: Boolean(req.body.capitalImprovementCandidate),
    receivedAt: req.body.receivedAt || new Date().toLocaleDateString(),
    note: req.body.note || "Owner uploaded maintenance bill for tax summary and sale-basis recordkeeping."
  };
  invoices.unshift(invoice);
  saveState();
  recordAudit("owner", "Uploaded owner expense", `${invoice.vendor} ${formatMoney(invoice.amount)} for ${property.name}.`);
  res.json({ invoice, summary: buildTaxSummary(property.id, invoice.taxYear) });
});

app.get("/api/properties/:id/stale-work-orders", (req, res) => {
  res.json({
    thresholdHours: Number(req.query.thresholdHours || 12),
    staleWorkOrders: getStaleWorkOrders({
      propertyId: req.params.id,
      thresholdHours: req.query.thresholdHours || 12
    })
  });
});

app.post("/api/properties/:id/stale-nudges", async (req, res) => {
  try {
    const result = await nudgeStaleWorkOrders({
      propertyId: req.params.id,
      thresholdHours: req.body.thresholdHours || 12,
      send: req.body.send === true,
      actor: req.body.actor || "manager"
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/work-orders/:id/nudge", async (req, res) => {
  try {
    const result = await nudgeWorkOrder(req.params.id, {
      send: req.body.send === true,
      actor: req.body.actor || "manager"
    });
    if (result.error) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/work-orders/:id/demo-outreach", (req, res) => {
  if (!isDemoExperienceRequest(req, res)) return;
  const result = simulateVendorOutreach(req.params.id);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/work-orders/:id/select-quote", (req, res) => {
  if (!isDemoExperienceRequest(req, res)) return;
  const result = selectDemoQuote(req.params.id, req.body.quoteId);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.get("/api/work-orders/:id/live-calls", (req, res) => {
  const result = getLiveCalls(req.params.id);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/work-orders/:id/live-calls/:callId/listen", (req, res) => {
  const result = listenToCall(req.params.id, req.params.callId, req.body.actorId);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.get("/api/work-orders/:id/live-calls/:callId/media", (req, res) => {
  const order = workOrders.find((item) => item.id === req.params.id);
  const call = order?.vendorCalls?.find((item) => item.id === req.params.callId);
  res.json(getMediaRelayRoom(req.params.id, call?.callKey || req.params.callId));
});

app.post("/api/work-orders/:id/live-calls/:callId/join", async (req, res) => {
  try {
    const result = await dialManagerIntoCall(req.params.id, req.params.callId, req.body.actorId);
    if (result.error) {
      res.status(result.error.includes("requires") ? 400 : 404).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/work-orders/:id/live-calls/:callId/takeover", (req, res) => {
  const result = takeOverCall(req.params.id, req.params.callId, req.body.actorId);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.post("/api/work-orders/:id/full-flow-demo", (req, res) => {
  if (!isDemoExperienceRequest(req, res)) return;
  const result = runFullFlowDemo(req.params.id);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  res.json(result);
});

app.patch("/api/invoices/:id", (req, res) => {
  const invoice = invoices.find((item) => item.id === req.params.id);
  if (!invoice) {
    res.status(404).json({ error: "invoice not found" });
    return;
  }
  Object.assign(invoice, req.body);
  saveState();
  recordAudit("owner", "Updated invoice", `${invoice.id} set to ${invoice.status}.`);
  res.json({ invoice });
});

function accountForProperty(propertyId) {
  const property = properties.find((item) => item.id === propertyId);
  return accounts.find((item) => item.id === property?.accountId);
}

function deleteAccountState(accountId) {
  const accountPropertyIds = properties.filter((property) => property.accountId === accountId).map((property) => property.id);
  const accountPersonIds = new Set(people
    .filter((person) => person.role !== "Site Admin" && (
      person.accountIds?.includes(accountId)
      || person.propertyIds?.some((propertyId) => accountPropertyIds.includes(propertyId))
      || person.managesPropertyIds?.some((propertyId) => accountPropertyIds.includes(propertyId))
    ))
    .map((person) => person.id));
  const propertySummaries = accountPropertyIds.map((propertyId) => deletePropertyState(propertyId));
  const deletedPeople = removeWhere(people, (person) => person.role !== "Site Admin" && accountPersonIds.has(person.id));
  const deletedVendors = removeWhere(vendors, (vendor) => vendor.accountId === accountId || accountPersonIds.has(vendor.personId));
  const deletedAccountBillingEvents = removeWhere(billingEvents, (event) => event.accountId === accountId);
  removeWhere(accounts, (account) => account.id === accountId);
  return propertySummaries.reduce((summary, propertySummary) => ({
    properties: summary.properties + 1,
    people: summary.people,
    vendors: summary.vendors,
    workOrders: summary.workOrders + propertySummary.workOrders,
    invoices: summary.invoices + propertySummary.invoices,
    billingEvents: summary.billingEvents + propertySummary.billingEvents
  }), {
    properties: 0,
    people: deletedPeople,
    vendors: deletedVendors,
    workOrders: 0,
    invoices: 0,
    billingEvents: deletedAccountBillingEvents
  });
}

function deletePropertyState(propertyId) {
  const deletedWorkOrderIds = new Set(workOrders.filter((order) => order.propertyId === propertyId).map((order) => order.id));
  const deletedWorkOrders = removeWhere(workOrders, (order) => order.propertyId === propertyId);
  const deletedInvoices = removeWhere(invoices, (invoice) => invoice.propertyId === propertyId || deletedWorkOrderIds.has(invoice.orderId || invoice.workOrderId));
  const deletedBillingEvents = removeWhere(billingEvents, (event) => event.propertyId === propertyId || deletedWorkOrderIds.has(event.orderId || event.workOrderId));
  for (const person of people) {
    person.propertyIds = (person.propertyIds || []).filter((id) => id !== propertyId);
    person.managesPropertyIds = (person.managesPropertyIds || []).filter((id) => id !== propertyId);
  }
  removeWhere(properties, (property) => property.id === propertyId);
  return {
    workOrders: deletedWorkOrders,
    invoices: deletedInvoices,
    billingEvents: deletedBillingEvents
  };
}

function removeWhere(items, predicate) {
  let removed = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      items.splice(index, 1);
      removed += 1;
    }
  }
  return removed;
}

function peopleForPhone(phone) {
  const normalized = normalizePhone(phone);
  return people.filter((person) => normalizePhone(person.phone) === normalized);
}

function resolveUniquePhoneIdentity(phone) {
  const matches = peopleForPhone(phone).filter((person) => person.role !== "Site Admin");
  if (matches.length === 0) {
    return { status: 401, error: "Invalid phone or PIN" };
  }
  if (matches.length > 1) {
    return {
      status: 409,
      error: "This phone number is assigned to multiple users. Each person must have a unique phone number."
    };
  }
  return { person: matches[0] };
}

function accountForPhonePeople(phonePeople) {
  const explicitAccountId = phonePeople.flatMap((person) => person.accountIds || []).find(Boolean);
  const explicitAccount = accounts.find((account) => account.id === explicitAccountId);
  if (explicitAccount) return explicitAccount;
  const propertyAccountId = phonePeople
    .flatMap((person) => person.propertyIds || [])
    .map((propertyId) => properties.find((property) => property.id === propertyId)?.accountId)
    .find(Boolean);
  return accounts.find((account) => account.id === propertyAccountId);
}

function selectOnboardingPerson(phonePeople, personRole, pin) {
  const reusableRoles = new Set(["Manager", "Owner"]);
  const candidates = phonePeople.filter((person) => reusableRoles.has(person.role));
  if (pin) {
    return candidates.find((person) => person.role === personRole && person.pin === pin)
      || candidates.find((person) => person.pin === pin)
      || null;
  }
  return candidates.find((person) => person.role === personRole) || candidates[0] || null;
}

function addUnique(values = [], value) {
  return values.includes(value) ? values : [...values, value];
}

function getInvoiceRecipient(property) {
  const invoiceDelivery = buildInvoiceDeliveryInstructions(property);
  const person = invoiceDelivery.recipients.find((recipient) => recipient.role === "Property manager") || invoiceDelivery.recipients[0] || {};
  return {
    name: person.name || "Property manager",
    phone: person.phone || "",
    email: person.email || "",
    recipients: invoiceDelivery.recipients,
    instructions: invoiceDelivery.instructions
  };
}

function updateBillingPayer({ account, property, payerRole, payerPersonId }) {
  if (payerRole) {
    account.billingPayerRole = payerRole;
    if (property) property.billingPayerRole = payerRole;
  }
  if (payerPersonId) {
    account.billingPayerPersonId = payerPersonId;
    if (property) property.billingPayerPersonId = payerPersonId;
  }
}

function accountBillingSetupStatus(account) {
  if (!account) return "Needs card";
  return account.billingSetupStatus || (account.stripeCustomerId ? "Card on file" : "Needs card");
}

function formatMoney(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function verifyStripeSignature(req) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const signature = String(req.headers["stripe-signature"] || "");
  const timestamp = signature.match(/t=([^,]+)/)?.[1];
  const signed = signature.match(/v1=([^,]+)/)?.[1];
  if (!timestamp || !signed) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${req.body.toString("utf8")}`).digest("hex");
  return safeEqualHex(signed, expected);
}

function verifyElevenLabsSignature(req) {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const signature = String(req.headers["elevenlabs-signature"] || req.headers["ElevenLabs-Signature"] || "");
  const timestamp = signature.match(/(?:^|,)t=([^,]+)/)?.[1];
  const provided = signature.match(/(?:^|,)v0=([^,]+)/)?.[1];
  if (!timestamp || !provided || !req.rawBody) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${req.rawBody.toString("utf8")}`).digest("hex");
  return safeEqualHex(provided, expected);
}

function parseElevenLabsWebhook(body = {}) {
  const data = body.data || body;
  const dynamicVariables =
    data.conversation_initiation_client_data?.dynamic_variables ||
    body.conversation_initiation_client_data?.dynamic_variables ||
    body.dynamic_variables ||
    {};
  const analysis = data.analysis || body.analysis || {};
  const metadata = data.metadata || body.metadata || {};
  const collected = analysis.data_collection_results || analysis.structured_data || {};
  const callFailure = body.type === "call_initiation_failure";
  const vendor = valueFrom(collected, "vendor_name") || body.vendor_name || body.vendorName || dynamicVariables.vendor_name;
  const phone =
    body.phone ||
    body.to_number ||
    metadata.phone_call?.to_number ||
    metadata.twilio_call_sid ||
    metadata.body?.To ||
    metadata.body?.to;
  return {
    workOrderId: body.work_order_id || body.workOrderId || dynamicVariables.work_order_id,
    call: {
      vendor,
      phone,
      success: !callFailure && body.success !== false,
      quote: body.quote || valueFrom(collected, "quote") || valueFrom(collected, "callout_fee"),
      availability: body.availability || valueFrom(collected, "availability") || valueFrom(collected, "earliest_availability"),
      discount: body.discount || valueFrom(collected, "discount"),
      warranty: body.warranty || valueFrom(collected, "warranty"),
      needsPhotos: body.needs_photos || valueFrom(collected, "needs_photos") || /photo/i.test(String(analysis.transcript_summary || analysis.call_summary || "")),
      invoiceEmail: body.invoice_delivery_instructions || body.invoice_email || valueFrom(collected, "invoice_delivery_instructions") || valueFrom(collected, "invoice_email") || dynamicVariables.invoice_delivery_instructions || dynamicVariables.inbound_invoice_email,
      invoiceRecipients: body.invoice_recipients || [],
      conversationId: body.conversation_id || data.conversation_id,
      callSid: body.call_sid || metadata.phone_call?.call_sid || metadata.body?.CallSid,
      summary: body.summary || analysis.transcript_summary || analysis.call_summary || analysis.summary || body.failure_reason || data.failure_reason,
      status: callFailure ? "failed" : body.status || data.status || "Available",
      transcript: normalizeElevenLabsTranscript(data.transcript || body.transcript || [])
    }
  };
}

function normalizeElevenLabsTranscript(transcript = []) {
  if (!Array.isArray(transcript)) return [];
  return transcript.map((turn) => ({
    speaker: turn.role || turn.speaker || "unknown",
    text: turn.message || turn.text || "",
    time: turn.time_in_call_secs ?? turn.time ?? null
  })).filter((turn) => turn.text);
}

function valueFrom(collection, key) {
  const value = collection?.[key];
  if (value && typeof value === "object") return value.value ?? value.result ?? value.text ?? value.answer;
  return value;
}

function safeEqualHex(left, right) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function envPresence(keys) {
  return keys.map((key) => ({
    key,
    configured: Boolean(process.env[key]),
    value: safeEnvValue(key)
  }));
}

function safeEnvValue(key) {
  if (!process.env[key]) return "";
  if (/KEY|SECRET|TOKEN|PASSWORD|AUTH|_ID$/i.test(key)) return "configured";
  return process.env[key];
}

function safePerson(person = {}) {
  const { pin, ...publicPerson } = person;
  return publicPerson;
}

function maskPhone(phone = "") {
  const value = String(phone);
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value ? "configured" : "";
  return `•••${digits.slice(-4)}`;
}

function isTestLoginPerson(person) {
  const phoneDigits = String(person?.phone || "").replace(/\D/g, "").slice(-10);
  return Boolean(
    (phoneDigits === "5555555555" || phoneDigits.startsWith("55555555"))
    && person?.id?.startsWith("test-")
    && (person.propertyIds || []).includes("p-test")
    && ((person.accountIds || []).includes("acct-test") || person.role === "Tenant")
  );
}

async function handleStripeWebhookEvent(event) {
  if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
    const invoice = event.data?.object || {};
    const billingEvent = billingEvents.find((item) => item.stripeInvoiceId === invoice.id);
    if (!billingEvent) return;
    const paid = event.type === "invoice.payment_succeeded";
    billingEvent.status = paid ? "Paid" : "Payment failed";
    billingEvent.stripeInvoiceUrl = invoice.hosted_invoice_url || billingEvent.stripeInvoiceUrl;
    billingEvent.note = paid ? "Stripe collected the dispatch coordination fee." : "Stripe could not collect the dispatch coordination fee.";
    const order = workOrders.find((item) => item.id === billingEvent.orderId);
    if (order) {
      order.dispatchFee = {
        ...(order.dispatchFee || {}),
        status: billingEvent.status,
        amount: billingEvent.amount,
        billingEventId: billingEvent.id,
        stripeInvoiceId: invoice.id
      };
    }
    recordAudit("stripe", paid ? "Dispatch fee paid" : "Dispatch fee payment failed", `${billingEvent.orderId}: ${billingEvent.status}.`);
  }
  if (event.type === "checkout.session.completed" || event.type === "setup_intent.succeeded") {
    const object = event.data?.object || {};
    if (object.metadata?.billingProduct === "owner_subscription") {
      completeOwnerSubscription({
        accountId: object.metadata?.accountId,
        customerId: object.customer,
        subscriptionId: object.subscription,
        status: object.payment_status === "paid" ? "Active" : "Checkout completed"
      });
      return;
    }
    const accountId = object.metadata?.accountId;
    const setupIntent = event.type === "checkout.session.completed" && object.setup_intent
      ? await retrieveStripeSetupIntent(object.setup_intent)
      : object;
    await completeBillingSetup({
      accountId: accountId || setupIntent?.metadata?.accountId,
      customerId: object.customer || setupIntent?.customer,
      paymentMethodId: setupIntent?.payment_method
    });
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created" || event.type === "customer.subscription.deleted") {
    const subscription = event.data?.object || {};
    completeOwnerSubscription({
      accountId: subscription.metadata?.accountId,
      customerId: subscription.customer,
      subscriptionId: subscription.id,
      status: subscriptionStatusLabel(subscription.status),
      currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : ""
    });
  }
}

async function completeBillingSetup({ accountId, customerId, paymentMethodId }) {
  const account = accounts.find((item) => item.id === accountId || item.stripeCustomerId === customerId);
  if (!account) return null;
  account.billingSetupStatus = "Card on file";
  if (customerId) account.stripeCustomerId = customerId;
  await setCustomerDefaultPaymentMethod({ customerId: account.stripeCustomerId, paymentMethodId });
  properties
    .filter((property) => property.accountId === account.id)
    .forEach((property) => {
      property.billingSetupStatus = "Card on file";
    });
  recordAudit("stripe", "Billing setup completed", account.name || customerId || "Customer payment method saved.");
  return account;
}

function completeOwnerSubscription({ accountId, customerId, subscriptionId, status = "Active", currentPeriodEnd = "" }) {
  const account = accounts.find((item) => item.id === accountId || item.stripeCustomerId === customerId);
  if (!account) return null;
  if (customerId) account.stripeCustomerId = customerId;
  account.ownerSubscriptionStatus = status;
  account.ownerSubscriptionPlan = "Owner Subscription";
  if (subscriptionId) account.ownerSubscriptionStripeId = subscriptionId;
  if (currentPeriodEnd) account.ownerSubscriptionCurrentPeriodEnd = currentPeriodEnd;
  recordAudit("stripe", "Owner Subscription updated", `${account.name}: ${status}.`);
  return account;
}

function subscriptionStatusLabel(status = "") {
  const normalized = String(status).toLowerCase();
  if (normalized === "active") return "Active";
  if (normalized === "trialing") return "Trialing";
  if (normalized === "past_due") return "Past due";
  if (normalized === "canceled") return "Canceled";
  if (normalized === "unpaid") return "Unpaid";
  return normalized ? normalized.replace(/_/g, " ") : "Free";
}

async function recordDispatchBillingEvent({ account, property, order, actor }) {
  const existing = billingEvents.find((event) => event.orderId === order.id && event.type === "dispatch_fee");
  if (existing) return existing;
  const payerRole = property?.billingPayerRole || account?.billingPayerRole || "Owner";
  const billingEvent = {
    id: `bill-${billingEvents.length + 1}`,
    type: "dispatch_fee",
    accountId: account?.id,
    propertyId: property?.id,
    orderId: order.id,
    amount: dispatchFeeCents / 100,
    payerRole,
    status: "Pending",
    note: "$25 coordination fee for intake and vendor outreach once a vendor is booked.",
    createdAt: new Date().toISOString()
  };
  try {
    const stripeInvoice = await chargeStripeDispatchFee({ account, property, order });
    const paid = stripeInvoice.status === "paid" || stripeInvoice.paid === true;
    billingEvent.status = paid ? "Paid" : "Submitted to Stripe";
    billingEvent.stripeInvoiceId = stripeInvoice.id;
    billingEvent.stripeInvoiceUrl = stripeInvoice.hosted_invoice_url;
    billingEvent.note = paid
      ? "Stripe collected the dispatch coordination fee."
      : "Stripe invoice created for the dispatch coordination fee.";
    order.dispatchFee = {
      status: billingEvent.status,
      amount: dispatchFeeCents / 100,
      billingEventId: billingEvent.id,
      stripeInvoiceId: stripeInvoice.id
    };
  } catch (error) {
    billingEvent.status = error.stripeInvoice ? "Payment failed" : "Needs billing setup";
    billingEvent.note = error.message;
    billingEvent.stripeInvoiceId = error.stripeInvoice?.id;
    billingEvent.stripeInvoiceUrl = error.stripeInvoice?.hosted_invoice_url;
    order.dispatchFee = {
      status: billingEvent.status,
      amount: dispatchFeeCents / 100,
      billingEventId: billingEvent.id,
      stripeInvoiceId: error.stripeInvoice?.id,
      reason: error.message
    };
  }
  billingEvents.unshift(billingEvent);
  recordAudit(actor, "Recorded dispatch fee", `${order.id} ${billingEvent.status}: ${billingEvent.note}`);
  return billingEvent;
}

app.post("/api/properties/:id/tax-bundle", (req, res) => {
  try {
    const year = req.body.year || "2026";
    const summary = recordTaxBundleAudit(req.params.id, year);
    res.json({ ...summary, count: summary.invoices.length });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message, ownerSubscriptionRequired: error.statusCode === 402 });
  }
});

app.get("/api/properties/:id/tax-summary", (req, res) => {
  res.json(buildTaxSummary(req.params.id, req.query.year || "2026"));
});

app.get("/api/properties/:id/tax-spreadsheet.csv", (req, res) => {
  const year = req.query.year || "2026";
  if (!canExportOwnerTaxPacket(req.params.id)) {
    res.status(402).json({ error: "Owner Subscription required for spreadsheet exports.", ownerSubscriptionRequired: true });
    return;
  }
  const csv = buildTaxCsv(req.params.id, year);
  res.header("content-type", "text/csv");
  res.attachment(`livingrelay-${req.params.id}-${year}-expenses.csv`);
  res.send(csv);
});

app.post("/api/messages/send", async (req, res) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      res.status(400).json({ error: "to and body are required" });
      return;
    }
    const result = await sendSms({ to, body });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/twilio/inbound", async (req, res) => {
  try {
    const from = req.body.From;
    const body = req.body.Body || "";
    const mediaItems = extractTwilioMedia(req.body);
    const outcome = await handleInboundCommand({ from, body, mediaItems });

    for (const action of outcome.actions) {
      if (action.type === "call_vendor_quotes") {
        const quoteResult = await startVendorQuoteCalls(action.orderId);
        if (!quoteResult.started && quoteResult.reason) {
          console.log(`[Vendor quote calls skipped] ${quoteResult.reason}`);
        }
        continue;
      }
      const outbound = composeActionMessage(action);
      if (outbound) {
        try {
          await sendSms(outbound);
        } catch (error) {
          console.log(`[SMS skipped] ${error.message}`);
        }
      }
    }
    saveState();

    res.type("text/xml").send(`
      <Response>
        <Message>${escapeXml(outcome.response)}</Message>
      </Response>
    `.trim());
  } catch (error) {
    res.type("text/xml").status(500).send(`
      <Response>
        <Message>LivingRelay hit an error processing this message.</Message>
      </Response>
    `.trim());
  }
});

app.post("/api/elevenlabs/vendor-call-result", (req, res) => {
  if (!verifyElevenLabsSignature(req)) {
    res.status(401).json({ error: "invalid ElevenLabs signature" });
    return;
  }
  const parsed = parseElevenLabsWebhook(req.body);
  const orderId = parsed.workOrderId;
  if (!orderId) {
    res.status(400).json({ error: "work_order_id is required" });
    return;
  }
  const result = recordVendorCallResults(orderId, [parsed.call], { actor: "ElevenLabs webhook" });
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  const order = ensureWorkOrderDispatchFields(workOrders.find((item) => item.id === orderId));
  order.vendorOutreach.outcomes = mergeOutcomes(order.vendorOutreach.outcomes, result.outcomes);
  upsertCallAttempt(order, parsed.call, {
    status: parsed.call.status || "completed",
    transcript: parsed.call.transcript || [],
    outcome: parsed.call.summary || "",
    conversationId: parsed.call.conversationId,
    callSid: parsed.call.callSid,
    completedAt: new Date().toISOString()
  });
  saveState();
  res.json({ ok: true, orderId, outcomes: order.vendorOutreach.outcomes });
});

app.post("/api/twilio/elevenlabs/outbound", async (req, res) => {
  try {
    const order = workOrders.find((item) => item.id === req.query.orderId);
    const twiml = await registerTwilioCallWithElevenLabs({
      fromNumber: req.body.From,
      toNumber: req.body.To,
      order,
      vendorName: req.query.vendorName,
      callKey: req.query.callKey
    });
    if (order) {
      order.timeline.push({
        label: "Twilio connected vendor to ElevenLabs",
        detail: `${req.query.vendorName || req.body.To} answered; ElevenLabs agent registered through Twilio.`,
        stamp: new Date().toISOString()
      });
      saveState();
    }
    res.type("text/xml").send(twiml);
  } catch (error) {
    res.type("text/xml").status(500).send(`
      <Response>
        <Say>LivingRelay could not connect the AI coordinator. A manager will follow up.</Say>
        <Hangup />
      </Response>
    `.trim());
  }
});

app.post("/api/twilio/manager-listen", (req, res) => {
  const order = workOrders.find((item) => item.id === req.query.orderId);
  const call = order?.vendorCalls?.find((item) => item.id === req.query.callId);
  if (order && call) {
    call.managerJoinAnsweredAt = new Date().toISOString();
    call.mode = "Manager on standby";
    call.transcript = [
      ...(call.transcript || []),
      { speaker: "LivingRelay", text: "A property manager is available as lead maintenance coordinator if needed.", stamp: new Date().toISOString() }
    ];
    order.timeline.push({
      label: "Manager listen-in answered",
      detail: `${call.listener?.name || "Manager"} joined standby for ${call.vendorName}.`,
      stamp: new Date().toISOString()
    });
    saveState();
  }
  res.type("text/xml").send(`
    <Response>
      <Say>You are joining the LivingRelay vendor call. This first Twilio-owned version places you on standby and records your join in the work order. Full browser audio relay requires the media stream service.</Say>
      <Pause length="30" />
    </Response>
  `.trim());
});

app.post("/api/twilio/voice-status", (req, res) => {
  const order = workOrders.find((item) => item.id === req.query.orderId);
  if (order) {
    const call = order.vendorCalls?.find((item) => item.callSid === req.body.CallSid || item.id === req.query.callId || `${order.id}:${item.phone}` === req.query.callKey);
    if (call) {
      call.twilioStatus = req.body.CallStatus || call.twilioStatus;
      call.lastTwilioStatusAt = new Date().toISOString();
      if (req.body.CallStatus === "completed") call.status = "Completed";
    }
    const attempt = upsertCallAttempt(order, {
      callSid: req.body.CallSid,
      callKey: req.query.callKey,
      phone: req.body.To
    }, {
      status: req.body.CallStatus || "status_update",
      callSid: req.body.CallSid,
      completedAt: req.body.CallStatus === "completed" ? new Date().toISOString() : undefined
    });
    if (attempt.retry?.needed) {
      order.timeline.push({
        label: "Vendor call retry queued",
        detail: `${attempt.vendorName} ${attempt.status}; retry after ${attempt.retry.retryAfter}.`,
        stamp: new Date().toISOString()
      });
    }
    saveState();
  }
  res.json({ ok: true });
});

app.post("/api/work-orders/:id/vendor-outreach/retry-due", async (req, res) => {
  try {
    const order = ensureWorkOrderDispatchFields(workOrders.find((item) => item.id === req.params.id));
    if (!order) {
      res.status(404).json({ error: "work order not found" });
      return;
    }
    const now = new Date();
    const due = (order.vendorOutreach.attempts || []).filter((attempt) =>
      attempt.retry?.needed &&
      attempt.retry.retryAfter &&
      new Date(attempt.retry.retryAfter) <= now
    );
    const results = [];
    for (const attempt of due) {
      attempt.retry.startedAt = new Date().toISOString();
      attempt.retry.needed = false;
      const result = await startVendorQuoteCalls(order.id, {
        actor: req.body.actor || "retry-policy",
        testOnly: req.body.testOnly === true,
        testVendorPhone: req.body.testVendorPhone || "",
        onlyVendorPhone: attempt.phone
      });
      results.push({ attemptId: attempt.id, result });
    }
    saveState();
    res.json({ orderId: order.id, retried: results.length, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(distDir, "index.html"));
});

function extractTwilioMedia(body) {
  const count = Number(body.NumMedia || 0);
  return Array.from({ length: count }).map((_, index) => ({
    url: body[`MediaUrl${index}`],
    contentType: body[`MediaContentType${index}`],
    receivedAt: new Date().toISOString()
  })).filter((item) => item.url);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const server = app.listen(port, () => {
  console.log(`LivingRelay API running on http://127.0.0.1:${port}`);
});
attachMediaRelay(server);
server.ref();
const keepAlive = setInterval(() => {}, 2147483647);
server.on("close", () => clearInterval(keepAlive));
