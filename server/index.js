import "dotenv/config";
import express from "express";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accessRequests, accounts, auditLog, billingEvents, event, invoices, message, notifications, people, platformSettings, properties, prospectingLeads, recordAudit, referrals, saveState, vendors, waitForStatePersistence, workOrders } from "./data.js";
import { composeActionMessage, handleInboundCommand, normalizePhone } from "./smsLogic.js";
import { getTwilioStatus, sendSms } from "./twilioClient.js";
import { sendEmail } from "./emailClient.js";
import { generateProspectingLeadBatches, generateProspectingLeads } from "./prospectingResearch.js";
import { registerTwilioCallWithElevenLabs, startVendorQuoteCalls } from "./elevenLabsCalls.js";
import { runFullFlowDemo, selectDemoQuote, simulateVendorOutreach } from "./demoOutreach.js";
import { createDemoScenario, listDemoScenarios } from "./demoScenarios.js";
import { getStaleWorkOrders, nudgeStaleWorkOrders, nudgeWorkOrder } from "./staleNudges.js";
import { dialManagerIntoCall, getLiveCalls, listenToCall, takeOverCall } from "./liveCallControl.js";
import { buildTaxCsv, buildTaxSummary, canExportOwnerTaxPacket, recordTaxBundleAudit } from "./taxExports.js";
import { getGooglePlacesApiKey, getReadiness } from "./config.js";
import { getRuntimeEnvironment, getStateId } from "./postgresState.js";
import { chargeStripeDispatchFee, createStripeOwnerSubscriptionSession, createStripePortalSession, createStripeSetupSession, dispatchFeeCents, ownerSubscriptionCents, retrieveStripeCheckoutSession, retrieveStripeSetupIntent, setCustomerDefaultPaymentMethod, stripeBillingStatus } from "./stripeBilling.js";
import { attachMediaRelay, getMediaRelayRoom } from "./mediaRelay.js";
import { consumeVerifiedPhoneToken, createPhoneChallenge, verifyPhoneChallenge } from "./phoneVerification.js";
import { defaultNotifyForRole, dispatchNotification, mergeNotifySettings, notificationCatalog, registerPushDevice } from "./notifications.js";
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
const siteAdminSessionCookieName = "lr_site_admin";
const siteAdminSessionMaxAgeMs = 1000 * 60 * 60 * 24 * 30;
const siteAdminSessions = new Set();
const appSessions = new Map();
const publicInviteTemplates = {
  "adopt-livingrelay": {
    issue: "Can we use LivingRelay for this rental?",
    access: "It gives renters one text-first place for maintenance while owners and property managers get approvals, vendor coordination, and records without hunting through separate threads."
  },
  "owner-manager-loop": {
    issue: "I would like the owner and property manager to use LivingRelay together.",
    access: "It keeps repair requests, access notes, approvals, vendor updates, and invoices visible to the right people after everyone logs in."
  },
  "cleaner-process": {
    issue: "Could we set up LivingRelay before the next maintenance issue?",
    access: "That way future requests go through the app instead of scattered texts, and everyone can see status, approvals, vendor booking, and repair history."
  }
};

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
app.get("/favicon.ico", (req, res) => {
  res.redirect(302, "/favicon.svg");
});
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
    accounts: includeSiteAdmin ? accounts : accounts.map(({ id, name, status, plan, stripeCustomerId, billingPayerRole, billingPayerPersonId, billingSetupStatus, ownerSubscriptionStatus, ownerSubscriptionPlan, ownerSubscriptionStripeId, ownerSubscriptionCurrentPeriodEnd, referralRewards, productionVendorCallsEnabled }) => ({
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
      referralRewards: publicReferralRewards(referralRewards),
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
    notifications: includeSiteAdmin ? notifications : notifications.slice(0, 20),
    notificationCatalog: notificationCatalog(),
    referrals: includeSiteAdmin ? referrals : referrals.map(publicReferral),
    prospectingLeads: includeSiteAdmin ? prospectingLeads : [],
    accessRequests: includeSiteAdmin ? accessRequests : [],
    auditLog,
    twilio: getTwilioStatus(),
    stripe: stripeBillingStatus(),
    demoScenarios: includeDemo ? listDemoScenarios() : [],
    staleWorkOrders: getStaleWorkOrders({ thresholdHours: 12 })
  });
});

app.get("/api/places/autocomplete", async (req, res) => {
  const apiKey = getGooglePlacesApiKey();
  const input = String(req.query.input || "").trim();
  if (input.length < 3) {
    res.json({ predictions: [] });
    return;
  }
  if (!apiKey) {
    res.status(503).json({ predictions: [], error: "Google Places API key is not configured" });
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

app.get("/api/vendors/autocomplete", async (req, res) => {
  const input = String(req.query.input || "").trim();
  const trade = String(req.query.trade || "").trim();
  const propertyId = String(req.query.propertyId || "").trim();
  const property = properties.find((item) => item.id === propertyId);
  if (input.length < 2) {
    res.json({ predictions: [] });
    return;
  }

  const query = input.toLowerCase();
  const accountId = property?.accountId || "";
  const localPredictions = vendors
    .filter((vendor) => {
      const text = `${vendor.name || ""} ${vendor.trade || ""} ${vendor.phone || ""}`.toLowerCase();
      const scoped = !accountId || !vendor.accountId || vendor.accountId === accountId || vendor.propertyIds?.includes(propertyId);
      return scoped && text.includes(query);
    })
    .slice(0, 6)
    .map((vendor) => ({
      source: "local",
      id: vendor.id,
      name: vendor.name,
      trade: vendor.trade || trade || "General",
      phone: vendor.phone || "",
      description: [vendor.trade, vendor.phone].filter(Boolean).join(" · "),
      placeId: ""
    }));

  const apiKey = getGooglePlacesApiKey();
  if (!apiKey) {
    res.json({ predictions: localPredictions, googleConfigured: false });
    return;
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.types,places.primaryType"
      },
      body: JSON.stringify({
        textQuery: [input, trade, property?.address ? `near ${property.address}` : ""].filter(Boolean).join(" "),
        maxResultCount: 6,
        regionCode: "US"
      })
    });
    const data = await response.json();
    const googlePredictions = response.ok
      ? (data.places || [])
        .map((place) => ({
          source: "google",
          placeId: place.id,
          name: place.displayName?.text || "",
          trade: inferTradeFromGoogleTypes(place.types || [], trade || "General"),
          phone: place.nationalPhoneNumber || place.internationalPhoneNumber || "",
          description: place.formattedAddress || "",
          websiteUri: place.websiteUri || ""
        }))
      : [];
    res.json({ predictions: [...localPredictions, ...googlePredictions].slice(0, 10), googleConfigured: true });
  } catch (error) {
    res.json({ predictions: localPredictions, googleConfigured: true, error: error.message });
  }
});

app.get("/api/places/:placeId", async (req, res) => {
  const apiKey = getGooglePlacesApiKey();
  const placeId = String(req.params.placeId || "").trim();
  if (!placeId) {
    res.status(404).json({ error: "place not found" });
    return;
  }
  if (!apiKey) {
    res.status(503).json({ error: "Google Places API key is not configured" });
    return;
  }

  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,addressComponents,location,nationalPhoneNumber,internationalPhoneNumber,websiteUri,types,primaryType"
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
      nationalPhoneNumber: data.nationalPhoneNumber || "",
      internationalPhoneNumber: data.internationalPhoneNumber || "",
      websiteUri: data.websiteUri || "",
      types: data.types || [],
      primaryType: data.primaryType || "",
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
    const loginIdentity = resolveLoginIdentity(phone, pin);
    if (loginIdentity.error) {
      res.status(loginIdentity.status).json({ error: loginIdentity.error });
      return;
    }
    const person = loginIdentity.person;
    if (!loginIdentity.acceptedTestAlias && person.pin !== pin) {
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
    const loginIdentity = resolveLoginIdentity(req.body.phone, req.body.pin);
    if (loginIdentity.error) {
      res.status(loginIdentity.status).json({ error: loginIdentity.error });
      return;
    }
    const person = loginIdentity.person;
    if (!loginIdentity.acceptedTestAlias && person.pin !== req.body.pin) {
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
  const siteAdminToken = bearerToken(req) || cookieValue(req, siteAdminSessionCookieName);
  if (siteAdminToken) siteAdminSessions.delete(siteAdminToken);
  res.clearCookie("lr_session");
  res.clearCookie(siteAdminSessionCookieName);
  res.json({ ok: true });
});

app.post("/api/onboarding/property", (req, res) => {
  const { propertyName, address = "", managerName, managerPhone, role = "Property manager", pin, phoneVerificationToken, referralToken = "" } = req.body;
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
    person.notify = defaultNotifyForRole(person.role, person.notify || {});
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
      notify: defaultNotifyForRole(personRole)
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
  const referral = claimReferralForProperty({
    referralToken,
    referredPerson: person,
    referredAccount: account,
    property
  });

  saveState();
  recordAudit("self-serve", reconciled ? "Added property to existing account" : "Created property", `${managerName} created ${property.name}${reconciled ? " on an existing phone account" : ""}${referral ? " from a referral invite" : ""}.`);
  const token = createAppSession(person);
  setAppSessionCookie(res, token);
  res.json({ account, person, property, reconciled, referral, phoneVerified: true, token });
});

app.use("/api/site-admin", requireSiteAdminHost);

app.post("/api/site-admin/login", (req, res) => {
  const { password, remember = true } = req.body;
  const siteAdmin = people.find((person) => person.role === "Site Admin");
  if (!siteAdmin || password !== (process.env.SITE_ADMIN_PASSWORD || "owner-console")) {
    res.status(401).json({ error: "Invalid admin console password" });
    return;
  }
  const token = createSiteAdminSession(siteAdmin, { remember });
  siteAdminSessions.add(token);
  setSiteAdminSessionCookie(res, token, { remember });
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
  const token = bearerToken(req) || cookieValue(req, siteAdminSessionCookieName);
  return Boolean(token && (token.includes(".") ? verifySiteAdminSession(token) : siteAdminSessions.has(token)));
}

function createSiteAdminSession(person, { remember = true } = {}) {
  const expiresAt = Date.now() + (remember ? siteAdminSessionMaxAgeMs : 1000 * 60 * 60 * 12);
  const payload = `v1.${person.id}.${expiresAt}.${randomUUID()}`;
  const signature = signSiteAdminSession(payload);
  return `${payload}.${signature}`;
}

function verifySiteAdminSession(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return false;
  const [, userId, expiresAt] = parts;
  const expiresAtMs = Number(expiresAt);
  if (!people.some((person) => person.id === userId && person.role === "Site Admin")) return false;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now()) return false;
  const payload = parts.slice(0, 4).join(".");
  return safeEqualHex(signSiteAdminSession(payload), parts[4]);
}

function signSiteAdminSession(payload) {
  return createHmac("sha256", siteAdminSessionSecret()).update(payload).digest("hex");
}

function siteAdminSessionSecret() {
  return process.env.SESSION_SECRET || process.env.SITE_ADMIN_PASSWORD || "owner-console";
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

function setSiteAdminSessionCookie(res, token, { remember = true } = {}) {
  res.cookie(siteAdminSessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: siteAdminSessionMaxAgeMs } : {})
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
  if (path === "/api/admin/vendors" && req.method === "POST") return ownerManagerRoles.has(role);
  if (path.startsWith("/api/admin")) return managerRoles.has(role);
  if (path.startsWith("/api/billing")) return ownerManagerRoles.has(role);
  if (path.startsWith("/api/referrals")) return ownerManagerRoles.has(role);
  if (path.startsWith("/api/invoices")) return ownerManagerRoles.has(role);
  if (path.startsWith("/api/properties")) return ownerManagerRoles.has(role);
  if (path.startsWith("/api/people")) return managerRoles.has(role) || path.includes(`/${user.id}/`);
  if (path.startsWith("/api/work-orders")) return ["Tenant", "Manager", "Admin", "Owner", "Vendor"].includes(role);
  return true;
}

app.use([
  "/api/admin",
  "/api/billing",
  "/api/referrals",
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

const qaScenarios = {
  leak_owner_approval: {
    title: "Leak needs owner approval",
    trade: "Plumbing",
    severity: "Urgent",
    estimate: 325,
    issue: "Kitchen sink is leaking and water is pooling under the cabinet. Please send someone today if possible.",
    access: "Tenant is home after 1 PM. Text before entering.",
    expected: ["work_order_created", "owner_approval_required", "sms_attempted", "email_attempted", "vendor_call_attempted"]
  },
  hvac_no_heat: {
    title: "No heat urgent HVAC",
    trade: "HVAC",
    severity: "Urgent",
    estimate: 425,
    issue: "The heat is not turning on and the garden flat is cold. Thermostat is blank.",
    access: "Tenant can do today between 3 PM and 7 PM.",
    expected: ["work_order_created", "owner_approval_required", "sms_attempted", "email_attempted", "vendor_call_attempted"]
  },
  electrical_spark: {
    title: "Electrical spark",
    trade: "Electrical",
    severity: "Urgent",
    estimate: 185,
    issue: "Bedroom outlet sparked once and the lights in the room are out.",
    access: "Tenant is available all afternoon.",
    expected: ["work_order_created", "manager_review", "sms_attempted", "email_attempted", "vendor_call_attempted"]
  }
};

app.get("/api/site-admin/qa/scenarios", (req, res) => {
  res.json({
    scenarios: Object.entries(qaScenarios).map(([id, scenario]) => ({
      id,
      title: scenario.title,
      trade: scenario.trade,
      severity: scenario.severity,
      estimate: scenario.estimate,
      issue: scenario.issue,
      expected: scenario.expected
    }))
  });
});

app.post("/api/site-admin/qa/run", async (req, res) => {
  try {
    const scenario = qaScenarios[req.body.scenarioId] || qaScenarios.leak_owner_approval;
    const qaPhone = normalizePhone(req.body.phone || platformSettings.vendorCallTestNumber || process.env.VENDOR_CALL_TEST_NUMBER || "");
    const qaEmail = String(req.body.email || "").trim().toLowerCase();
    const property = properties.find((item) => item.id === "p-test") || properties[0];
    const tenant = people.find((person) => person.role === "Tenant" && person.propertyIds?.includes(property.id)) || people.find((person) => person.role === "Tenant");
    const vendor = vendors.find((item) => item.trade === scenario.trade) || vendors[0];
    const runId = `qa-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const startedAt = new Date().toISOString();
    const order = {
      id: `QA-${Math.floor(3000 + Math.random() * 6000)}`,
      qaRunId: runId,
      propertyId: property.id,
      unit: tenant?.unit || property.units?.[0] || "QA unit",
      tenantId: tenant?.id || null,
      trade: scenario.trade,
      severity: scenario.severity,
      status: scenario.estimate > Number(property.approvalThreshold || 250) ? "Needs owner approval" : "Manager review",
      estimate: scenario.estimate,
      vendorId: vendor?.id || null,
      issue: scenario.issue,
      access: scenario.access,
      serviceWindow: scenario.severity === "Urgent" ? "ASAP / emergency" : "Next available",
      tenantAvailability: buildTenantAvailability({ access: scenario.access, severity: scenario.severity, issue: scenario.issue }),
      dispatchStage: "qa_review",
      vendorOutreach: {
        status: "Not started",
        mode: "QA test call",
        outcomes: []
      },
      completionPackage: {
        status: "Not requested",
        photos: [],
        notes: "",
        invoiceDelivery: "Not received"
      },
      managerApproved: false,
      ownerApproved: scenario.estimate <= Number(property.approvalThreshold || 250),
      dispatchFee: {
        status: "Not charged",
        amount: dispatchFeeCents / 100,
        reason: "QA run only. Charged only when a vendor is booked."
      },
      invoiceId: null,
      timeline: [
        event("QA scenario started", `${scenario.title}: ${scenario.issue}`),
        event("QA tenant intake", scenario.access)
      ],
      messages: [
        message("tenant", scenario.issue),
        message("relay", `QA opened ${runId}. Manager and owner routing will be checked.`)
      ],
      createdAt: startedAt
    };
    workOrders.unshift(order);

    const deliveries = [];
    if (qaPhone) {
      try {
        const sms = await sendSms({
          to: qaPhone,
          body: `[LivingRelay QA] ${scenario.title}: ${order.id} opened for ${property.name}. ${scenario.issue}`
        });
        deliveries.push({
          channel: "sms",
          to: maskPhone(qaPhone),
          sent: sms.sent,
          providerId: sms.sid || "",
          status: sms.status || "",
          reason: sms.error || sms.status || "sent"
        });
      } catch (error) {
        deliveries.push({ channel: "sms", to: maskPhone(qaPhone), sent: false, reason: error.message });
      }
    }
    if (qaEmail) {
      try {
        const email = await sendEmail({
          to: qaEmail,
          subject: `[LivingRelay QA] ${scenario.title}`,
          text: `QA run ${runId}\nWork order ${order.id}\n${scenario.issue}\nAccess: ${scenario.access}`
        });
        deliveries.push({
          channel: "email",
          to: maskEmail(qaEmail),
          sent: email.sent,
          providerId: email.id || "",
          reason: email.reason || email.id || "sent"
        });
      } catch (error) {
        deliveries.push({ channel: "email", to: maskEmail(qaEmail), sent: false, reason: error.message });
      }
    }

    const callResult = await startVendorQuoteCalls(order.id, {
      actor: "QA panel",
      demoFallback: req.body.demoFallback !== false,
      testVendorPhone: qaPhone,
      testOnly: true
    });
    const issues = qaIssuesForRun({ scenario, order, property, qaPhone, qaEmail, deliveries, callResult });
    order.timeline.push(event("QA run completed", `${issues.length} issue${issues.length === 1 ? "" : "s"} found.`));
    saveState();
    recordAudit("site-admin", "Ran QA scenario", `${scenario.title} created ${order.id}; ${issues.length} issue${issues.length === 1 ? "" : "s"} found.`);
    res.json({
      run: {
        id: runId,
        startedAt,
        completedAt: new Date().toISOString(),
        scenarioId: req.body.scenarioId || "leak_owner_approval",
        scenarioTitle: scenario.title,
        property: { id: property.id, name: property.name },
        workOrderId: order.id,
        status: issues.some((issue) => issue.severity === "error") ? "Issues found" : "Passed with warnings check",
        issues,
        deliveries,
        calls: (callResult.calls || []).map((call) => ({
          vendor: call.vendor,
          to: maskPhone(call.phone),
          success: call.success !== false,
          provider: call.provider || (call.conversation_id ? "elevenlabs_native" : call.demo ? "demo" : "unknown"),
          callSid: call.callSid || call.call_sid || "",
          conversationId: call.conversation_id || call.conversationId || "",
          status: call.twilioStatus || call.status || "",
          reason: call.error || call.reason || call.summary || ""
        })),
        callResult: {
          started: callResult.started !== false,
          demo: Boolean(callResult.demo),
          testMode: Boolean(callResult.testMode),
          reason: callResult.reason || callResult.error || ""
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/site-admin/prospecting-leads", (req, res) => {
  try {
    const result = upsertProspectingLead(req.body || {}, "site-admin");
    res.status(result.created ? 201 : 200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/site-admin/prospecting-refresh", async (req, res) => {
  try {
    const market = sanitizeText(req.body.market || "San Francisco");
    const limit = Math.max(1, Math.min(Number(req.body.limit || 12), 25));
    const research = await generateProspectingLeads({ market, limit, existingLeads: prospectingLeads });
    const results = research.leads.map((lead) => upsertProspectingLead({
      ...lead,
      status: lead.status || "Ready to contact",
      sourceName: lead.sourceName || `Automated prospecting ${research.market}`,
      notes: [lead.notes, `Generated by automated prospecting refresh on ${new Date(research.searchedAt).toLocaleDateString("en-US")}.`].filter(Boolean).join(" ")
    }, "prospecting-refresh"));
    const created = results.filter((result) => result.created).length;
    const updated = results.length - created;
    recordAudit("prospecting-refresh", "Generated prospecting leads", `${created} added, ${updated} updated for ${research.market}.`);
    res.json({
      market: research.market,
      searchedAt: research.searchedAt,
      sourceCount: research.sourceCount,
      added: created,
      updated,
      leads: results.map((result) => result.lead)
    });
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

app.post("/api/site-admin/prospecting-refresh/stream", async (req, res) => {
  const market = sanitizeText(req.body.market || "San Francisco");
  const limit = Math.max(1, Math.min(Number(req.body.limit || 12), 25));
  let added = 0;
  let updated = 0;
  let sourceCount = 0;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  writeSse(res, "progress", { message: `Starting ${market} lead generation...`, added, updated });
  try {
    for await (const event of generateProspectingLeadBatches({ market, limit, existingLeads: prospectingLeads })) {
      if (event.type === "progress") {
        writeSse(res, "progress", { ...event, added, updated });
        continue;
      }
      sourceCount += Number(event.sourceCount || 0);
      const results = event.leads.map((lead) => upsertProspectingLead({
        ...lead,
        status: lead.status || "Ready to contact",
        sourceName: lead.sourceName || `Automated prospecting ${event.market}`,
        notes: [lead.notes, `Generated by automated prospecting refresh on ${new Date(event.searchedAt).toLocaleDateString("en-US")}.`].filter(Boolean).join(" ")
      }, "prospecting-refresh"));
      added += results.filter((result) => result.created).length;
      updated += results.filter((result) => !result.created).length;
      writeSse(res, "leads", {
        market: event.market,
        batch: event.batch,
        batches: event.batches,
        added,
        updated,
        leads: results.map((result) => result.lead)
      });
    }
    recordAudit("prospecting-refresh", "Generated prospecting leads", `${added} added, ${updated} updated for ${market}.`);
    writeSse(res, "done", { market, added, updated, sourceCount });
  } catch (error) {
    writeSse(res, "error", { error: error.message });
  } finally {
    res.end();
  }
});

app.patch("/api/site-admin/prospecting-leads/:id", (req, res) => {
  const lead = prospectingLeads.find((item) => item.id === req.params.id);
  if (!lead) {
    res.status(404).json({ error: "Prospecting lead not found" });
    return;
  }
  const allowed = ["notes", "fit", "contactName", "contactRole", "email", "phone", "website", "listingUrl", "rentalAddress", "market", "unitCount", "sourceName"];
  for (const key of allowed) {
    if (Object.hasOwn(req.body, key)) lead[key] = sanitizeText(req.body[key]);
  }
  if (Object.hasOwn(req.body, "status")) lead.status = normalizeLeadStatus(req.body.status);
  if (Object.hasOwn(req.body, "priority")) lead.priority = normalizeLeadPriority(req.body.priority);
  lead.updatedAt = new Date().toISOString();
  recordAudit("site-admin", "Updated prospecting lead status", `${lead.name} marked ${lead.status || "Updated"}.`);
  res.json({ lead });
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

app.post("/api/site-admin/referrals/:id/validate", (req, res) => {
  const referral = referrals.find((item) => item.id === req.params.id);
  if (!referral) {
    res.status(404).json({ error: "referral not found" });
    return;
  }
  const result = validateReferral(referral, {
    actor: req.user?.name || "site-admin",
    legitimate: req.body.legitimate !== false,
    note: req.body.note || "Property legitimacy validated by LivingRelay."
  });
  saveState();
  res.json(result);
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

app.post("/api/properties/:id/vendor-team/copy", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  const sourceProperty = properties.find((item) => item.id === req.body.sourcePropertyId);
  if (!property || !sourceProperty) {
    res.status(404).json({ error: "property not found" });
    return;
  }
  if (property.accountId !== sourceProperty.accountId) {
    res.status(400).json({ error: "vendor teams can only be reused within the same customer account" });
    return;
  }
  const sourceSettings = {
    ...defaultDispatchSettings(),
    ...(sourceProperty.dispatchSettings || {}),
    vendorPreferences: {
      ...defaultDispatchSettings().vendorPreferences,
      ...(sourceProperty.dispatchSettings?.vendorPreferences || {})
    }
  };
  const nextSettings = {
    ...defaultDispatchSettings(),
    ...(property.dispatchSettings || {}),
    vendorPreferences: {
      ...defaultDispatchSettings().vendorPreferences,
      ...sourceSettings.vendorPreferences
    }
  };
  property.dispatchSettings = nextSettings;
  const preferredNames = Object.values(nextSettings.vendorPreferences).flat().map((name) => String(name).toLowerCase());
  for (const vendor of vendors) {
    if (preferredNames.includes(String(vendor.name || "").toLowerCase()) && !vendor.propertyIds?.includes(property.id)) {
      vendor.propertyIds = [...(vendor.propertyIds || []), property.id];
      vendor.accountId = vendor.accountId || property.accountId;
    }
  }
  saveState();
  recordAudit(req.user?.name || "admin", "Copied vendor team", `${sourceProperty.name} team reused for ${property.name}.`);
  res.json({ property, sourceProperty, vendorPreferences: nextSettings.vendorPreferences });
});

app.patch("/api/properties/:id/vendor-team", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: "property not found" });
    return;
  }
  const settings = {
    ...defaultDispatchSettings(),
    ...(property.dispatchSettings || {}),
    vendorPreferences: {
      ...defaultDispatchSettings().vendorPreferences,
      ...(req.body.vendorPreferences || {})
    }
  };
  property.dispatchSettings = settings;
  property.rules = buildOperatingRules(property.rules, settings.vendorPreferences);
  saveState();
  recordAudit(req.user?.name || "app", "Updated vendor team", `${property.name} vendor team updated.`);
  res.json({ property, vendorPreferences: settings.vendorPreferences });
});

app.post("/api/properties/:id/vendors", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: "property not found" });
    return;
  }
  const { name, trade = "General", phone = "", preferred = true, placement = "primary", useFor = "", notes = "" } = req.body;
  if (!name || !trade) {
    res.status(400).json({ error: "name and trade are required" });
    return;
  }
  const existingVendor = vendors.find((vendor) =>
    String(vendor.name || "").toLowerCase() === String(name).toLowerCase()
    && (!vendor.accountId || vendor.accountId === property.accountId)
  );
  const vendor = existingVendor || {
    id: `v-${vendors.length + 1}`,
    name,
    trade,
    phone: phone ? normalizePhone(phone) : "",
    preferred,
    preApproved: placement === "backup",
    propertyIds: [property.id],
    accountId: property.accountId,
    useFor: useFor || undefined,
    notes: notes || undefined
  };
  if (!existingVendor) vendors.push(vendor);
  if (!vendor.propertyIds?.includes(property.id)) vendor.propertyIds = [...(vendor.propertyIds || []), property.id];
  vendor.accountId = vendor.accountId || property.accountId;
  if (phone && !vendor.phone) vendor.phone = normalizePhone(phone);
  const settings = {
    ...defaultDispatchSettings(),
    ...(property.dispatchSettings || {}),
    vendorPreferences: {
      ...defaultDispatchSettings().vendorPreferences,
      ...(property.dispatchSettings?.vendorPreferences || {})
    }
  };
  const existing = settings.vendorPreferences[trade] || [];
  const withoutName = existing.filter((item) => String(item).toLowerCase() !== String(name).toLowerCase());
  settings.vendorPreferences[trade] = placement === "backup" ? [...withoutName, name] : [name, ...withoutName];
  property.dispatchSettings = settings;
  property.rules = buildOperatingRules(property.rules, settings.vendorPreferences);
  saveState();
  recordAudit(req.user?.name || "app", placement === "backup" ? "Added backup vendor" : "Added primary vendor", `${name} added for ${trade} at ${property.name}.`);
  res.json({ vendor, property, vendorPreferences: settings.vendorPreferences });
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
    notify: defaultNotifyForRole(role)
  };
  people.push(person);
  const property = properties.find((item) => item.id === propertyId);
  if (property && role === "Owner") property.ownerId = person.id;
  saveState();
  recordAudit("admin", "Added person", `${name} added as ${role}.`);
  res.json({ person: safePerson(person) });
});

app.post("/api/admin/work-orders", async (req, res) => {
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
  await dispatchNotification("tenant_report", { order });
  if (order.ownerApproved === false || order.status.toLowerCase().includes("owner")) {
    await dispatchNotification("owner_approval", { order });
  }
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

app.post("/api/referrals", async (req, res) => {
  try {
    const referrer = req.user;
    const property = properties.find((item) => item.id === req.body.propertyId)
      || properties.find((item) => (referrer.propertyIds || []).includes(item.id));
    const account = accounts.find((item) => item.id === req.body.accountId)
      || accounts.find((item) => item.id === property?.accountId)
      || accounts.find((item) => (referrer.accountIds || []).includes(item.id));
    if (!account) {
      res.status(404).json({ error: "account not found" });
      return;
    }
    const referredName = String(req.body.referredName || "").trim().slice(0, 100);
    const referredEmail = String(req.body.referredEmail || "").trim().toLowerCase();
    const referredRole = normalizeReferralRole(req.body.referredRole);
    if (!referredName || !validEmail(referredEmail)) {
      res.status(400).json({ error: "referredName and a valid referredEmail are required" });
      return;
    }
    const token = createReferralToken();
    const referral = {
      id: `ref-${Date.now()}-${randomUUID().slice(0, 8)}`,
      token,
      program: "dispatch_and_owner_subscription",
      referrerPersonId: referrer.id,
      referrerAccountId: account.id,
      referrerName: referrer.name,
      referredName,
      referredEmail,
      referredRole,
      status: "Invite sent",
      inviteDelivery: { sent: false, reason: "email_not_configured" },
      rewardSummary: referralRewardSummary(referrer.role, referredRole),
      createdAt: new Date().toISOString()
    };
    const inviteUrl = referralInviteUrl(req, token);
    referral.inviteUrl = inviteUrl;
    referral.inviteDelivery = await sendLivingRelayInviteEmail({
      to: referredEmail,
      subject: `${referrer.name} invited you to LivingRelay`,
      text: buildReferralInviteEmail({ referrer, referredName, referredRole, inviteUrl, token })
    });
    referrals.unshift(referral);
    saveState();
    recordAudit(referrer.name, "Sent referral invite", `${referredName} invited for ${referral.rewardSummary}`);
    res.json({ referral: publicReferral(referral) });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
  await dispatchNotification("vendor_booked", { order, property, vendor, billingEvent });
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
    const order = workOrders.find((item) => item.id === req.params.id);
    if (order) await dispatchNotification("vendor_contacted", { order });
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

app.post("/api/work-orders/:id/completion-package", async (req, res) => {
  const result = recordVendorCompletion(req.params.id, req.body);
  if (result.error) {
    res.status(404).json(result);
    return;
  }
  await dispatchNotification("issue_resolved", { order: result.order });
  res.json(result);
});

app.post("/api/admin/vendors", (req, res) => {
  const { name, trade, phone, preferred = true, propertyId = "", accountId = "", useFor = "", notes = "" } = req.body;
  if (!name || !trade || !phone) {
    res.status(400).json({ error: "name, trade, and phone are required" });
    return;
  }
  const property = propertyId ? properties.find((item) => item.id === propertyId) : null;
  const vendor = {
    id: `v-${vendors.length + 1}`,
    name,
    trade,
    phone: normalizePhone(phone),
    preferred,
    propertyIds: propertyId ? [propertyId] : [],
    accountId: accountId || property?.accountId || undefined,
    useFor: useFor || undefined,
    notes: notes || undefined
  };
  vendors.push(vendor);
  if (property) {
    const settings = {
      ...defaultDispatchSettings(),
      ...(property.dispatchSettings || {}),
      vendorPreferences: {
        ...defaultDispatchSettings().vendorPreferences,
        ...(property.dispatchSettings?.vendorPreferences || {})
      }
    };
    const existing = settings.vendorPreferences[trade] || [];
    settings.vendorPreferences[trade] = [name, ...existing.filter((item) => String(item).toLowerCase() !== String(name).toLowerCase())];
    property.dispatchSettings = settings;
  }
  saveState();
  recordAudit("admin", "Added vendor", `${name} added for ${trade}${property ? ` at ${property.name}` : ""}.`);
  res.json({ vendor });
});

app.patch("/api/people/:id/notify", (req, res) => {
  const person = people.find((item) => item.id === req.params.id);
  if (!person) {
    res.status(404).json({ error: "person not found" });
    return;
  }
  if (req.body.email !== undefined) {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (email && !validEmail(email)) {
      res.status(400).json({ error: "valid email required" });
      return;
    }
    person.email = email || undefined;
  }
  person.notify = mergeNotifySettings(person, req.body);
  saveState();
  recordAudit(person.name, "Updated notification settings", JSON.stringify(person.notify));
  res.json({ person: safePerson(person) });
});

app.post("/api/people/:id/push-devices", (req, res) => {
  const person = people.find((item) => item.id === req.params.id);
  if (!person) {
    res.status(404).json({ error: "person not found" });
    return;
  }
  const result = registerPushDevice(person, req.body);
  if (result.error) {
    res.status(400).json(result);
    return;
  }
  res.json({ person: safePerson(result.person), device: result.device });
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

app.patch("/api/work-orders/:id", async (req, res) => {
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
  if (["closed", "completed", "resolved", "tenant resolved"].some((status) => String(order.status || "").toLowerCase().includes(status))) {
    await dispatchNotification("issue_resolved", { order });
  }
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

app.post("/api/properties/:id/owner-operating-system", (req, res) => {
  const property = properties.find((item) => item.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: "property not found" });
    return;
  }
  const result = buildOwnerOperatingSystemFromText(property, req.body.text || "", {
    taxYear: req.body.taxYear || "2026"
  });
  saveState();
  recordAudit("owner", "Built operating system", `${property.name}: ${result.vendors.length} vendors inferred and ${result.invoices.length} records added.`);
  res.json({ ...result, property, summary: buildTaxSummary(property.id, req.body.taxYear || "2026") });
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

app.post("/api/work-orders/:id/live-calls/:callId/takeover", async (req, res) => {
  try {
    const result = await takeOverCall(req.params.id, req.params.callId, req.body.actorId);
    if (result.error) {
      res.status(result.error.includes("requires") || result.error.includes("phone") ? 400 : 404).json(result);
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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

app.patch("/api/invoices/:id", async (req, res) => {
  const invoice = invoices.find((item) => item.id === req.params.id);
  if (!invoice) {
    res.status(404).json({ error: "invoice not found" });
    return;
  }
  const wasPaid = String(invoice.paymentStatus || invoice.status || "").toLowerCase().includes("paid");
  Object.assign(invoice, req.body);
  saveState();
  recordAudit("owner", "Updated invoice", `${invoice.id} set to ${invoice.status}.`);
  const isPaid = String(invoice.paymentStatus || invoice.status || "").toLowerCase().includes("paid");
  if (!wasPaid && isPaid) {
    const order = workOrders.find((item) => item.id === invoice.orderId);
    await dispatchNotification("owner_paid", { order, invoice, propertyId: invoice.propertyId });
  }
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

function resolveLoginIdentity(phone, pin) {
  const testAlias = testLoginAliasPerson(phone, pin);
  if (testAlias) return { person: testAlias, acceptedTestAlias: true };
  return resolveUniquePhoneIdentity(phone);
}

function testLoginAliasPerson(phone, pin) {
  const phoneDigits = String(phone || "").replace(/\D/g, "").slice(-10);
  if (phoneDigits !== "5555555555") return null;
  const testLoginPins = {
    1111: "test-manager",
    3333: "test-owner",
    4444: "test-tenant"
  };
  const person = people.find((item) => item.id === testLoginPins[String(pin || "")]);
  return person && isTestLoginPerson(person) ? person : null;
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

function publicReferralRewards(rewards = {}) {
  return {
    dispatchCredits: Number(rewards.dispatchCredits || 0),
    ownerSecondYearPending: Number(rewards.ownerSecondYearPending || 0),
    ownerSecondYearCredits: Number(rewards.ownerSecondYearCredits || 0)
  };
}

function ensureReferralRewards(account) {
  if (!account) return { dispatchCredits: 0, ownerSecondYearPending: 0, ownerSecondYearCredits: 0 };
  account.referralRewards = {
    dispatchCredits: 0,
    ownerSecondYearPending: 0,
    ownerSecondYearCredits: 0,
    ...(account.referralRewards || {})
  };
  return account.referralRewards;
}

function publicReferral(referral = {}) {
  return {
    ...referral,
    referredEmail: maskEmail(referral.referredEmail),
    token: referral.token,
    inviteUrl: referral.inviteUrl
  };
}

function referralRewardSummary(referrerRole, referredRole) {
  const ownerEligible = referrerRole === "Owner" || referredRole === "Owner";
  return ownerEligible
    ? "Both accounts get one free dispatch after validation, plus a free second owner subscription year after each pays for the first year."
    : "Both accounts get one free dispatch after LivingRelay validates the referred property.";
}

function createReferralToken() {
  return `LR-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function normalizeReferralRole(role = "") {
  return String(role).toLowerCase().includes("owner") ? "Owner" : "Property manager";
}

function referralInviteUrl(req, token) {
  const base = process.env.APP_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  const url = new URL(base);
  url.pathname = `/ref/${encodeURIComponent(token)}`;
  url.search = "";
  url.searchParams.set("ref", token);
  url.searchParams.set("mode", "create");
  return url.toString();
}

function buildReferralInviteEmail({ referrer, referredName, referredRole, inviteUrl, token }) {
  return [
    `Hi ${referredName},`,
    "",
    `${referrer.name} invited you to try LivingRelay for your rental maintenance workflow as a ${referredRole.toLowerCase()}.`,
    "",
    "When you create a property and LivingRelay validates that it is legitimate, both of you get your first vendor dispatch coordination fee covered.",
    "If this is an owner-to-owner or owner-to-property-manager referral, both accounts also become eligible for a free second year of the $99 Owner Subscription after each account pays for the first year.",
    "",
    `Start here: ${inviteUrl}`,
    `Referral code: ${token}`
  ].join("\n");
}

function claimReferralForProperty({ referralToken, referredPerson, referredAccount, property }) {
  const token = String(referralToken || "").trim().toUpperCase();
  if (!token) return null;
  const referral = referrals.find((item) => String(item.token || "").toUpperCase() === token);
  if (!referral || referral.status === "Validated" || referral.status === "Reward granted") return null;
  referral.status = "Property created";
  referral.referredPersonId = referredPerson.id;
  referral.referredAccountId = referredAccount.id;
  referral.referredPropertyId = property.id;
  referral.referredPropertyName = property.name;
  referral.propertyCreatedAt = new Date().toISOString();
  referral.validationStatus = "Needs LivingRelay review";
  recordAudit(referredPerson.name, "Claimed referral invite", `${property.name} is awaiting referral validation.`);
  return publicReferral(referral);
}

function validateReferral(referral, { actor, legitimate, note }) {
  referral.validationStatus = legitimate ? "Legitimate property" : "Rejected";
  referral.validationNote = note;
  referral.validatedAt = new Date().toISOString();
  if (!legitimate) {
    referral.status = "Rejected";
    recordAudit(actor, "Rejected referral", `${referral.referredPropertyName || referral.referredEmail}: ${note}`);
    return { referral };
  }
  if (referral.rewardsGrantedAt) return { referral, alreadyGranted: true };
  const referrerAccount = accounts.find((item) => item.id === referral.referrerAccountId);
  const referredAccount = accounts.find((item) => item.id === referral.referredAccountId);
  for (const account of [referrerAccount, referredAccount].filter(Boolean)) {
    const rewards = ensureReferralRewards(account);
    rewards.dispatchCredits += 1;
  }
  const referrer = people.find((person) => person.id === referral.referrerPersonId);
  const ownerSecondYearEligible = referrer?.role === "Owner" || referral.referredRole === "Owner";
  if (ownerSecondYearEligible) {
    for (const account of [referrerAccount, referredAccount].filter(Boolean)) {
      const rewards = ensureReferralRewards(account);
      rewards.ownerSecondYearPending += 1;
    }
  }
  referral.status = "Reward granted";
  referral.rewardsGrantedAt = new Date().toISOString();
  referral.rewards = {
    dispatchCreditsPerAccount: 1,
    ownerSecondYearEligible
  };
  recordAudit(actor, "Validated referral", `${referral.referredPropertyName || referral.referredEmail}: rewards granted.`);
  return { referral, referrerAccount, referredAccount };
}

function buildOwnerOperatingSystemFromText(property, rawText, { taxYear = "2026" } = {}) {
  const lines = String(rawText || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const settings = {
    ...defaultDispatchSettings(),
    ...(property.dispatchSettings || {}),
    vendorPreferences: {
      ...defaultDispatchSettings().vendorPreferences,
      ...(property.dispatchSettings?.vendorPreferences || {})
    }
  };
  const discoveredVendors = [];
  const createdInvoices = [];
  const accountId = property.accountId;

  for (const line of lines) {
    const parsed = parseOwnerOperatingLine(line, taxYear);
    if (!parsed.vendor) continue;
    const existingVendor = vendors.find((vendor) =>
      vendor.accountId === accountId
      && String(vendor.name || "").toLowerCase() === parsed.vendor.toLowerCase()
    ) || vendors.find((vendor) => String(vendor.name || "").toLowerCase() === parsed.vendor.toLowerCase());
    const vendor = existingVendor || {
      id: `v-${vendors.length + 1}`,
      name: parsed.vendor,
      trade: parsed.trade,
      phone: parsed.phone ? normalizePhone(parsed.phone) : "",
      preferred: true,
      propertyIds: [property.id],
      accountId,
      source: "Owner operating system import",
      notes: parsed.note
    };
    if (!existingVendor) vendors.push(vendor);
    if (!vendor.propertyIds?.includes(property.id)) vendor.propertyIds = [...(vendor.propertyIds || []), property.id];
    if (!vendor.trade || vendor.trade === "General") vendor.trade = parsed.trade;
    if (parsed.phone && !vendor.phone) vendor.phone = normalizePhone(parsed.phone);
    const existingPreference = settings.vendorPreferences[parsed.trade] || [];
    settings.vendorPreferences[parsed.trade] = [
      vendor.name,
      ...existingPreference.filter((item) => String(item).toLowerCase() !== vendor.name.toLowerCase())
    ];
    discoveredVendors.push({ name: vendor.name, trade: parsed.trade, phone: vendor.phone || "", useFor: parsed.useFor });
    if (parsed.amount || parsed.invoiceLike) {
      const invoice = {
        id: `inv-${invoices.length + createdInvoices.length + 1}`,
        propertyId: property.id,
        orderId: "",
        vendor: vendor.name,
        amount: parsed.amount || 0,
        status: "Owner uploaded",
        paymentStatus: "Paid off platform",
        paymentRail: "Owner direct",
        source: "owner_text_import",
        documentName: parsed.documentName,
        taxYear: parsed.taxYear,
        taxCategory: parsed.taxCategory,
        capitalImprovementCandidate: parsed.capitalImprovementCandidate,
        receivedAt: "Owner import",
        note: parsed.note
      };
      invoices.unshift(invoice);
      createdInvoices.push(invoice);
    }
  }
  property.dispatchSettings = settings;
  property.rules = buildOperatingRules(property.rules, settings.vendorPreferences);
  return {
    vendors: dedupeBy(discoveredVendors, (vendor) => `${vendor.trade}:${vendor.name}`),
    invoices: createdInvoices,
    vendorPreferences: settings.vendorPreferences,
    rules: property.rules
  };
}

function parseOwnerOperatingLine(line, taxYear) {
  const amountText = (line.match(/\$\s*([0-9][0-9,]*(?:\.\d{2})?)/) || line.match(/\b(?:paid|total|amount|invoice)\D{0,12}([0-9][0-9,]*(?:\.\d{2})?)\b/i) || [])[1];
  const amount = Number(amountText?.replace(/,/g, "") || 0);
  const phone = (line.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) || [])[0] || "";
  const trade = inferTradeFromText(line);
  const taxCategory = inferOwnerTaxCategory(line, trade);
  const vendor = inferVendorNameFromText(line, trade);
  const lower = line.toLowerCase();
  return {
    vendor,
    trade,
    phone,
    amount,
    taxYear: String((line.match(/\b(20\d{2})\b/) || [])[1] || taxYear),
    taxCategory,
    capitalImprovementCandidate: /replace|replacement|upgrade|new roof|roof|water heater|hvac system|remodel|renovation|flooring|windows/i.test(line),
    invoiceLike: /\binvoice|receipt|bill|paid|service|repair|fixed|installed|replaced\b/i.test(line),
    documentName: (line.match(/\b[\w.-]+\.(?:pdf|jpg|jpeg|png|heic)\b/i) || [])[0] || "",
    useFor: lower.includes("emergency") ? "Emergency dispatch" : `${trade} work`,
    note: line.slice(0, 500)
  };
}

function inferTradeFromText(text) {
  const lower = String(text || "").toLowerCase();
  const trades = [
    ["Plumbing", ["plumb", "leak", "drain", "toilet", "sink", "water heater", "pipe", "sewer"]],
    ["HVAC", ["hvac", "heat", "furnace", "air conditioning", " ac ", "thermostat", "cooling"]],
    ["Electrical", ["electric", "outlet", "breaker", "panel", "spark", "light fixture"]],
    ["Appliance", ["appliance", "washer", "dryer", "fridge", "refrigerator", "dishwasher", "oven", "stove"]],
    ["Cleaning", ["clean", "janitor", "maid", "turnover"]],
    ["Painting", ["paint", "drywall", "patch"]],
    ["Roofing", ["roof", "gutter"]],
    ["Landscaping", ["landscape", "lawn", "yard", "tree"]],
    ["Handyman", ["handyman", "general repair", "door", "lock", "cabinet"]]
  ];
  return trades.find(([, words]) => words.some((word) => lower.includes(word)))?.[0] || "General";
}

function inferTradeFromGoogleTypes(types = [], fallback = "General") {
  const text = types.join(" ").toLowerCase();
  if (text.includes("plumber")) return "Plumbing";
  if (text.includes("hvac") || text.includes("air_conditioning") || text.includes("heating")) return "HVAC";
  if (text.includes("electrician")) return "Electrical";
  if (text.includes("roof")) return "Roofing";
  if (text.includes("painter")) return "Painting";
  if (text.includes("landscap")) return "Landscaping";
  if (text.includes("clean")) return "Cleaning";
  if (text.includes("appliance")) return "Appliance";
  return fallback || "General";
}

function inferOwnerTaxCategory(text, trade) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("insurance")) return "insurance";
  if (lower.includes("property tax") || lower.includes("tax bill")) return "taxes";
  if (lower.includes("management") || lower.includes("manager")) return "managementFees";
  if (lower.includes("legal") || lower.includes("accountant") || lower.includes("bookkeep")) return "legalProfessional";
  if (lower.includes("supplies") || lower.includes("materials")) return "supplies";
  if (["Cleaning", "Landscaping"].includes(trade)) return "cleaningMaintenance";
  return "repairs";
}

function inferVendorNameFromText(text, trade) {
  const cleaned = String(text || "")
    .replace(/\b(20\d{2})\b/g, "")
    .replace(/\$?\s*[0-9][0-9,]*(?:\.\d{2})?/g, "")
    .replace(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "")
    .replace(/^\s*(?:use|call|preferred|first choice|vendor)\s+/i, "")
    .trim();
  const labeled = cleaned.match(/(?:vendor|contractor|plumber|hvac|electrician|roofer|handyman)\s*[:=-]\s*([^,;|]+)/i)?.[1];
  const candidate = labeled || cleaned.split(/\s[-–—:|,]\s|,|\s+(?:for|to fix|fixed|repair|service|spring service|paid|invoice|receipt)\b/i)[0] || "";
  return candidate
    .replace(/\b(invoice|receipt|paid|bill|for|to|from|used|use|call|first|preferred|past|old)\b/gi, "")
    .replace(/\b(spring|annual|service|repair|fixed|installed|replaced)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function buildOperatingRules(existingRules = "", vendorPreferences = {}) {
  const baseRules = String(existingRules || "").replace(/\s*Owner vendor operating system:.*$/i, "").trim();
  const teamRules = Object.entries(vendorPreferences)
    .filter(([, names]) => names?.length)
    .map(([trade, names]) => `${trade}: use ${names.join(", ")} in that order.`)
    .join(" ");
  return [baseRules, teamRules ? `Owner vendor operating system: ${teamRules}` : ""].filter(Boolean).join(" ");
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

function qaIssuesForRun({ scenario, order, property, qaPhone, qaEmail, deliveries, callResult }) {
  const issues = [];
  const add = (severity, area, detail) => issues.push({ severity, area, detail });
  if (!order?.id) add("error", "Work order", "QA scenario did not create a work order.");
  if (scenario.estimate > Number(property?.approvalThreshold || 250) && order.ownerApproved !== false) {
    add("error", "Approvals", "Scenario should require owner approval, but ownerApproved was not false.");
  }
  if (!order.tenantAvailability?.preferredWindows?.length) {
    add("warn", "Tenant intake", "Tenant availability was not parsed into preferred windows.");
  }
  if (!qaPhone) {
    add("warn", "SMS and calls", "No QA phone was provided, so real SMS and test vendor call delivery were skipped or could not start.");
  }
  if (!qaEmail) {
    add("warn", "Email", "No QA email was provided, so real email delivery was skipped.");
  }
  const smsDelivery = deliveries.find((item) => item.channel === "sms");
  if (qaPhone && !smsDelivery) add("error", "SMS", "SMS delivery was requested but no SMS attempt was recorded.");
  if (smsDelivery && !smsDelivery.sent) add("error", "SMS", smsDelivery.reason || "SMS provider reported failure.");
  const emailDelivery = deliveries.find((item) => item.channel === "email");
  if (qaEmail && !emailDelivery) add("error", "Email", "Email delivery was requested but no email attempt was recorded.");
  if (emailDelivery && !emailDelivery.sent) add("warn", "Email", emailDelivery.reason || "Email provider reported failure.");
  if (callResult?.started === false) {
    add("error", "Vendor calls", callResult.reason || callResult.error || "Vendor call flow did not start.");
  }
  if (callResult?.started !== false && !(callResult?.calls || []).length) {
    add("warn", "Vendor calls", "Vendor call flow started but no call attempts were returned.");
  }
  for (const call of callResult?.calls || []) {
    if (call.success === false) add("error", "Vendor calls", `${call.vendor || "Vendor"} failed: ${call.error || "unknown provider failure"}`);
  }
  if (!issues.length) add("ok", "QA", "No blocking issues found in this scenario.");
  return issues;
}

function safeEnvValue(key) {
  if (!process.env[key]) return "";
  if (/KEY|SECRET|TOKEN|PASSWORD|AUTH|_ID$/i.test(key)) return "configured";
  return process.env[key];
}

function safePerson(person = {}) {
  const { pin, ...publicPerson } = person;
  return {
    ...publicPerson,
    notify: defaultNotifyForRole(person.role, person.notify || {})
  };
}

function maskPhone(phone = "") {
  const value = String(phone);
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return value ? "configured" : "";
  return `•••${digits.slice(-4)}`;
}

function maskEmail(email = "") {
  const [name = "", domain = ""] = String(email).split("@");
  if (!name || !domain) return email ? "configured" : "";
  return `${name.slice(0, 2)}***@${domain}`;
}

function validEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function buildPublicLivingRelayInvite(body) {
  const channels = {
    text: body.textChannel !== false,
    email: body.emailChannel !== false
  };
  if (!channels.text && !channels.email) return { error: "Choose text, email, or both." };
  const template = publicInviteTemplates[body.templateId] || publicInviteTemplates["adopt-livingrelay"];
  const renterName = String(body.renterName || "your renter").trim().slice(0, 80);
  const rentalAddress = String(body.rentalAddress || "my rental").trim().slice(0, 140);
  const unit = String(body.unit || "").trim().slice(0, 60);
  const address = [rentalAddress, unit].filter(Boolean).join(", ");
  const customMessage = String(body.message || "").trim().slice(0, 900);
  const defaultMessage = `Hi, this is ${renterName} at ${address}. ${template.issue} ${template.access}`;
  const message = customMessage || defaultMessage;
  const recipients = [
    body.sendOwner !== false && {
      role: "Owner",
      name: String(body.ownerName || "Owner").trim().slice(0, 80),
      phone: body.ownerPhone ? normalizePhone(body.ownerPhone) : "",
      email: String(body.ownerEmail || "").trim().toLowerCase()
    },
    body.sendManager !== false && {
      role: "Property manager",
      name: String(body.managerName || "Property manager").trim().slice(0, 80),
      phone: body.managerPhone ? normalizePhone(body.managerPhone) : "",
      email: String(body.managerEmail || "").trim().toLowerCase()
    }
  ].filter(Boolean).map((recipient) => ({
    ...recipient,
    phone: recipient.phone && recipient.phone.replace(/\D/g, "").length >= 10 ? recipient.phone : "",
    email: validEmail(recipient.email) ? recipient.email : ""
  }));
  if (!recipients.length) return { error: "Choose an owner, property manager, or both." };
  const deliverable = recipients.some((recipient) => (channels.text && recipient.phone) || (channels.email && recipient.email));
  if (!deliverable) return { error: "Add at least one phone number or email for the selected channel." };
  return {
    renterName,
    rentalAddress,
    unit,
    templateId: template.id || body.templateId || "adopt-livingrelay",
    channels,
    recipients,
    message,
    subject: `LivingRelay invite for ${rentalAddress}`
  };
}

async function sendLivingRelayInviteEmail({ to, subject, text }) {
  return sendEmail({ to, subject, text, from: process.env.INVITE_FROM_EMAIL });
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
    if (paid) {
      await dispatchNotification("owner_paid", { order, billingEvent, propertyId: billingEvent.propertyId });
    }
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
  const rewards = ensureReferralRewards(account);
  if (status === "Active" && rewards.ownerSecondYearPending > 0) {
    rewards.ownerSecondYearCredits += rewards.ownerSecondYearPending;
    rewards.ownerSecondYearPending = 0;
    account.ownerSubscriptionStatus = "Active + second year referral credit";
  }
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
  const rewards = ensureReferralRewards(account);
  if (rewards.dispatchCredits > 0) {
    rewards.dispatchCredits -= 1;
    const billingEvent = {
      id: `bill-${billingEvents.length + 1}`,
      type: "dispatch_fee",
      accountId: account?.id,
      propertyId: property?.id,
      orderId: order.id,
      amount: 0,
      standardAmount: dispatchFeeCents / 100,
      payerRole,
      status: "Referral credit applied",
      note: "First dispatch free referral reward covered the LivingRelay coordination fee.",
      createdAt: new Date().toISOString()
    };
    order.dispatchFee = {
      status: billingEvent.status,
      amount: 0,
      standardAmount: dispatchFeeCents / 100,
      billingEventId: billingEvent.id,
      reason: billingEvent.note
    };
    billingEvents.unshift(billingEvent);
    recordAudit(actor, "Applied referral dispatch credit", `${order.id}: first dispatch free.`);
    return billingEvent;
  }
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

app.post("/api/public/livingrelay-invite", async (req, res) => {
  try {
    const payload = buildPublicLivingRelayInvite(req.body || {});
    if (payload.error) {
      res.status(400).json({ error: payload.error });
      return;
    }
    const results = [];
    for (const recipient of payload.recipients) {
      if (payload.channels.text && recipient.phone) {
        try {
          const smsResult = await sendSms({ to: recipient.phone, body: payload.message });
          results.push({
            channel: "text",
            role: recipient.role,
            to: maskPhone(recipient.phone),
            sent: smsResult.sent,
            reason: smsResult.error || smsResult.status || "sent"
          });
        } catch (error) {
          results.push({
            channel: "text",
            role: recipient.role,
            to: maskPhone(recipient.phone),
            sent: false,
            reason: error.message
          });
        }
      }
      if (payload.channels.email && recipient.email) {
        try {
          const emailResult = await sendLivingRelayInviteEmail({
            to: recipient.email,
            subject: payload.subject,
            text: payload.message
          });
          results.push({
            channel: "email",
            role: recipient.role,
            to: maskEmail(recipient.email),
            sent: emailResult.sent,
            reason: emailResult.reason || emailResult.id || "sent"
          });
        } catch (error) {
          results.push({
            channel: "email",
            role: recipient.role,
            to: maskEmail(recipient.email),
            sent: false,
            reason: error.message
          });
        }
      }
    }
    const sent = results.filter((item) => item.sent).length;
    const accessRequest = {
      id: `access-${Date.now()}-${randomUUID().slice(0, 8)}`,
      renterName: payload.renterName,
      rentalAddress: payload.rentalAddress,
      unit: payload.unit,
      templateId: payload.templateId,
      message: payload.message,
      channels: payload.channels,
      recipients: payload.recipients,
      deliveryResults: results,
      sent,
      deliveryCount: results.length,
      status: sent > 0 ? "Sent" : "Delivery pending",
      source: "public_request_access",
      createdAt: new Date().toISOString()
    };
    accessRequests.unshift(accessRequest);
    saveState();
    recordAudit(payload.renterName || "renter", "Requested LivingRelay invite", `${sent}/${results.length} invite deliveries sent for ${payload.rentalAddress || "rental property"}.`);
    res.json({ ok: sent > 0, sent, results, accessRequestId: accessRequest.id });
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
        await dispatchNotification("vendor_contacted", { orderId: action.orderId, skipSms: true });
        continue;
      }
      const notificationEvent = notificationEventForAction(action);
      if (notificationEvent) {
        await dispatchNotification(notificationEvent, { orderId: action.orderId, skipSms: true });
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

function notificationEventForAction(action = {}) {
  if (["notify_tenant_report", "notify_manager_guidance_started"].includes(action.type)) return "tenant_report";
  if (action.type === "notify_billing_setup_required") return "billing_required";
  if (action.type === "notify_owner_approval") return "owner_approval";
  if (action.type === "notify_tenant_closed") return "issue_resolved";
  if (["notify_manager_vendor_accepted", "notify_manager_vendor_declined", "notify_manager_vendor_issue"].includes(action.type)) return "vendor_contacted";
  if (action.type === "notify_manager_owner_approved") return "vendor_contacted";
  return "";
}

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

app.post("/api/twilio/takeover-conference", (req, res) => {
  const order = workOrders.find((item) => item.id === req.query.orderId);
  const call = order?.vendorCalls?.find((item) => item.id === req.query.callId);
  const role = req.query.role === "manager" ? "manager" : "vendor";
  const conferenceName = sanitizeConferenceName(req.query.conference || `livingrelay-${req.query.orderId}-${req.query.callId}`);
  if (order && call) {
    call.status = "Manager takeover";
    call.mode = role === "manager" ? "Manager connected to takeover" : "Vendor transferred to manager";
    call.takeover = {
      ...(call.takeover || {}),
      conferenceName,
      [`${role}JoinedAt`]: new Date().toISOString()
    };
    call.transcript = [
      ...(call.transcript || []),
      {
        speaker: "LivingRelay",
        text: role === "manager"
          ? "The manager joined the live vendor takeover conference."
          : "The vendor was moved into the manager takeover conference.",
        stamp: new Date().toISOString()
      }
    ];
    order.timeline.push({
      label: role === "manager" ? "Manager joined takeover" : "Vendor moved to takeover",
      detail: `${role === "manager" ? call.takeover?.name || "Manager" : call.vendorName} joined ${conferenceName}.`,
      stamp: new Date().toISOString()
    });
    saveState();
  }
  const intro = role === "manager"
    ? "You are now taking over the LivingRelay vendor call."
    : "Please hold while LivingRelay connects you to the property manager.";
  res.type("text/xml").send(`
    <Response>
      <Say>${escapeTwimlText(intro)}</Say>
      <Dial>
        <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="${role === "manager" ? "true" : "false"}">${escapeTwimlText(conferenceName)}</Conference>
      </Dial>
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
    if (req.query.manager !== "1") {
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

function writeSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function normalizeProspectingLead(input) {
  const now = new Date().toISOString();
  const name = sanitizeText(input.name || input.company || input.propertyName);
  const email = sanitizeText(input.email).toLowerCase();
  const phone = sanitizeText(input.phone);
  const website = sanitizeText(input.website);
  const listingUrl = sanitizeText(input.listingUrl || input.sourceUrl);
  if (!name) throw new Error("Lead name is required");
  if (!email && !phone && !website && !listingUrl) throw new Error("At least one public contact or source URL is required");
  return {
    id: sanitizeText(input.id) || `lead-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name,
    segment: normalizeLeadSegment(input.segment),
    status: normalizeLeadStatus(input.status),
    priority: normalizeLeadPriority(input.priority),
    fit: sanitizeText(input.fit || input.reason),
    contactName: sanitizeText(input.contactName),
    contactRole: sanitizeText(input.contactRole),
    email,
    phone,
    website,
    listingUrl,
    sourceName: sanitizeText(input.sourceName || input.source),
    rentalAddress: sanitizeText(input.rentalAddress || input.address),
    market: sanitizeText(input.market || input.city),
    unitCount: sanitizeText(input.unitCount || input.portfolioSize),
    notes: sanitizeText(input.notes),
    firstSeenAt: sanitizeText(input.firstSeenAt) || now,
    createdAt: sanitizeText(input.createdAt) || now,
    updatedAt: now
  };
}

function upsertProspectingLead(input, actor = "site-admin") {
  const lead = normalizeProspectingLead(input);
  const existing = findExistingProspectingLead(lead);
  if (existing) {
    Object.assign(existing, {
      ...existing,
      ...lead,
      id: existing.id,
      createdAt: existing.createdAt || lead.createdAt,
      firstSeenAt: existing.firstSeenAt || lead.firstSeenAt,
      updatedAt: new Date().toISOString()
    });
    recordAudit(actor, "Updated prospecting lead", `${existing.name} refreshed from ${existing.sourceName || "prospecting source"}.`);
    return { lead: existing, created: false };
  }
  prospectingLeads.unshift(lead);
  recordAudit(actor, "Added prospecting lead", `${lead.name} added from ${lead.sourceName || "prospecting source"}.`);
  return { lead, created: true };
}

function findExistingProspectingLead(lead) {
  const email = lead.email && lead.email.toLowerCase();
  const phone = lead.phone && normalizePhone(lead.phone);
  const listingUrl = normalizeUrlKey(lead.listingUrl);
  const website = normalizeUrlKey(lead.website);
  return prospectingLeads.find((item) =>
    (email && String(item.email || "").toLowerCase() === email) ||
    (phone && normalizePhone(item.phone || "") === phone) ||
    (listingUrl && normalizeUrlKey(item.listingUrl) === listingUrl) ||
    (website && normalizeUrlKey(item.website) === website)
  );
}

function normalizeLeadSegment(value) {
  const text = sanitizeText(value).toLowerCase();
  if (text.includes("owner")) return "Small owner";
  if (text.includes("landlord")) return "Small landlord";
  if (text.includes("apartment")) return "Apartment rental";
  return "Property manager";
}

function normalizeLeadStatus(value) {
  const allowed = new Set(["New", "Researching", "Ready to contact", "Contacted", "Replied", "Not a fit", "Do not contact"]);
  const text = sanitizeText(value);
  return allowed.has(text) ? text : "New";
}

function normalizeLeadPriority(value) {
  const allowed = new Set(["High", "Medium", "Low"]);
  const text = sanitizeText(value);
  return allowed.has(text) ? text : "Medium";
}

function sanitizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 1000);
}

function normalizeUrlKey(value) {
  const text = sanitizeText(value).toLowerCase();
  if (!text) return "";
  try {
    const url = new URL(text.startsWith("http") ? text : `https://${text}`);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return text.replace(/\/$/, "");
  }
}

const server = app.listen(port, () => {
  console.log(`LivingRelay API running on http://127.0.0.1:${port}`);
});
attachMediaRelay(server);
server.ref();
const keepAlive = setInterval(() => {}, 2147483647);
server.on("close", () => clearInterval(keepAlive));
