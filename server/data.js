import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDurablePersistenceRequired, loadStateFromPostgres, saveStateToPostgres } from "./postgresState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDir, "local-state.json");
let pendingStateSave = Promise.resolve();
let lastStateSaveError = null;

const seedState = {
  platformSettings: {
    vendorCallTestMode: true,
    productionVendorCallsEnabled: true,
    vendorCallTestNumber: process.env.VENDOR_CALL_TEST_NUMBER || "",
    updatedAt: "2026-05-02T12:00:00.000Z"
  },
  accounts: [
    {
      id: "acct-1",
      name: "Shah Property Group",
      status: "Active",
      plan: "$0/property + $25 vendor dispatch",
      stripeCustomerId: "",
      billingPayerRole: "Owner",
      billingPayerPersonId: "owner-1",
      billingSetupStatus: "Needs card",
      ownerSubscriptionStatus: "Free",
      ownerSubscriptionPlan: "Owner Subscription",
      referralRewards: {
        dispatchCredits: 0,
        ownerSecondYearPending: 0,
        ownerSecondYearCredits: 0
      },
      productionVendorCallsEnabled: true,
      createdAt: "2026-04-01T12:00:00.000Z"
    },
    {
      id: "acct-test",
      name: "LivingRelay Test Account",
      status: "Test",
      plan: "$0/property + $25 vendor dispatch",
      stripeCustomerId: "",
      billingPayerRole: "Owner",
      billingPayerPersonId: "test-owner",
      billingSetupStatus: "Needs card",
      ownerSubscriptionStatus: "Free",
      ownerSubscriptionPlan: "Owner Subscription",
      referralRewards: {
        dispatchCredits: 0,
        ownerSecondYearPending: 0,
        ownerSecondYearCredits: 0
      },
      productionVendorCallsEnabled: true,
      createdAt: "2026-05-02T12:00:00.000Z"
    }
  ],
  people: [
    { id: "site-admin-1", name: "Avery Stone", role: "Site Admin", phone: "+13105550199", pin: "9999", propertyIds: [], accountIds: ["acct-1"], notify: { platformAlerts: true } },
    { id: "admin-1", name: "Jordan Lee", role: "Manager", phone: "+13105550100", email: "jordan@shahproperty.example", pin: "1111", propertyIds: ["p-1", "p-2"], managesPropertyIds: ["p-1"], notify: { tenantReports: true, everyUpdate: true, keyUpdates: true } },
    { id: "owner-1", name: "Priya Shah", role: "Owner", phone: "+13105550102", email: "priya@shahproperty.example", pin: "3333", propertyIds: ["p-1"], notify: { tenantReports: true, everyUpdate: false, keyUpdates: true } },
    { id: "tenant-1", name: "Maya Chen", role: "Tenant", phone: "+13105550103", pin: "4444", propertyIds: ["p-1"], unit: "Garden flat", defaultAvailability: "Any time with text before entry." },
    { id: "vendor-1", name: "Carlos Plumbing", role: "Vendor", phone: "+13105550104", pin: "5555", propertyIds: ["p-1"], trade: "Plumbing" },
    { id: "test-manager", name: "Test Manager", role: "Manager", phone: "+15555555551", email: "manager@test.livingrelay.com", pin: "1111", propertyIds: ["p-test"], managesPropertyIds: ["p-test"], accountIds: ["acct-test"], notify: { tenantReports: true, everyUpdate: true, keyUpdates: true } },
    { id: "test-owner", name: "Test Owner", role: "Owner", phone: "+15555555552", email: "owner@test.livingrelay.com", pin: "3333", propertyIds: ["p-test"], accountIds: ["acct-test"], notify: { tenantReports: true, everyUpdate: false, keyUpdates: true } },
    { id: "test-tenant", name: "Test Tenant", role: "Tenant", phone: "+15555555553", pin: "4444", propertyIds: ["p-test"], unit: "Test unit" }
  ],
  properties: [
    {
      id: "p-1",
      accountId: "acct-1",
      name: "Noe Valley Duplex",
      address: "11820 Sanchez St, San Francisco, CA",
      subscription: "Active",
      plan: "$0/property + $25 only when a vendor is booked",
      units: ["Garden flat", "Upper home"],
      ownerId: "owner-1",
      managerId: "admin-1",
      adminId: "admin-1",
      billingPayerRole: "Owner",
      billingPayerPersonId: "owner-1",
      billingSetupStatus: "Needs card",
      approvalThreshold: 150,
      rules: "Plumbing under $300 goes to Carlos first. Any repair above $150 needs owner approval. HVAC always requires manager review. Emergencies: active water, gas smell, sparking, no lock.",
      dispatchSettings: {
        vendorOutreachMode: "manager_approval",
        autoOutreachAfterTenantConfirmed: false,
        emergencyOutreachMode: "manager_approval",
        maxVendorsToCall: 5,
        requireTenantAvailabilityBeforeBooking: true,
        inboundInvoiceEmail: "invoices@livingrelay.com",
        invoiceRecipientPolicy: "manager_owner_system",
        productionVendorCallsEnabled: true,
        vendorPreferences: {
          Plumbing: ["Carlos Plumbing"],
          HVAC: ["Nova HVAC"],
          Electrical: ["Spark Right Electric"],
          Painting: [],
          General: []
        }
      }
    },
    {
      id: "p-test",
      accountId: "acct-test",
      name: "LivingRelay Test Home",
      address: "555 Test Ave, Los Angeles, CA",
      subscription: "Test",
      plan: "$0/property + $25 only when a vendor is booked",
      units: ["Test unit"],
      ownerId: "test-owner",
      managerId: "test-manager",
      adminId: "test-manager",
      billingPayerRole: "Owner",
      billingPayerPersonId: "test-owner",
      billingSetupStatus: "Needs card",
      approvalThreshold: 250,
      rules: "Test account for production smoke checks. No vendor dispatch happens unless a real work order is created.",
      dispatchSettings: {
        vendorOutreachMode: "manager_approval",
        autoOutreachAfterTenantConfirmed: false,
        emergencyOutreachMode: "manager_approval",
        maxVendorsToCall: 5,
        requireTenantAvailabilityBeforeBooking: true,
        inboundInvoiceEmail: "invoices@livingrelay.com",
        invoiceRecipientPolicy: "manager_owner_system",
        productionVendorCallsEnabled: true
      }
    }
  ],
  vendors: [
    { id: "v-1", personId: "vendor-1", name: "Carlos Plumbing", trade: "Plumbing", phone: "+13105550104", preferred: true },
    { id: "v-2", name: "Nova HVAC", trade: "HVAC", phone: "+14245550195", preferred: true },
    { id: "v-3", name: "Spark Right Electric", trade: "Electrical", phone: "+13105550119", preferred: true }
  ],
  workOrders: [
    {
      id: "WO-2481",
      propertyId: "p-1",
      unit: "Garden flat",
      tenantId: "tenant-1",
      trade: "Plumbing",
      severity: "Urgent",
      status: "Needs owner approval",
      estimate: 325,
      vendorId: "v-1",
      issue: "Water is dripping under the kitchen sink and the cabinet floor is wet.",
      access: "Anytime after 1 PM. Text before entering.",
      serviceWindow: "ASAP / emergency",
      tenantAvailability: {
        serviceWindow: "ASAP / emergency",
        preferredWindows: ["Anytime after 1 PM"],
        accessNotes: "Anytime after 1 PM. Text before entering.",
        permissionToEnter: true,
        needsFollowUp: false,
        updatedAt: "2026-04-30T12:00:00.000Z"
      },
      vendorOutreach: {
        status: "Not started",
        mode: "Manual",
        questions: [
          "Are you available for this job, and what is your earliest arrival window?",
          "What callout, diagnostic, emergency, after-hours, or minimum labor fee applies?",
          "Can you offer any repeat-customer or small-property discount?",
          "What warranty do you provide on labor and parts?",
          "Do you need tenant photos, access instructions, parking, gate code, or shutoff details before dispatch?",
          "Unless the property manager gives different instructions, can you send the invoice to the property manager, owner, and LivingRelay recordkeeping inbox?"
        ],
        outcomes: []
      },
      completionPackage: {
        status: "Not requested",
        photos: [],
        notes: "",
        invoiceDelivery: "Not received"
      },
      managerApproved: true,
      ownerApproved: false,
      dispatchFee: {
        status: "Not charged",
        amount: 25,
        reason: "Vendor has not been booked yet."
      },
      invoiceId: "inv-1",
      timeline: [
        event("Tenant texted issue", "Maya reported active water under kitchen sink."),
        event("AI asked follow-up", "Requested access notes and photo."),
        event("Manager approved", "Owner approval needed because the repair estimate is above $150.")
      ],
      messages: [
        message("tenant", "Water is dripping under my kitchen sink."),
        message("relay", "Thanks Maya. Is water actively leaking right now? Please send a photo and access notes.")
      ]
    }
  ],
  invoices: [
    {
      id: "inv-1",
      propertyId: "p-1",
      orderId: "WO-2481",
      vendor: "Carlos Plumbing",
      amount: 325,
      status: "Unpaid",
      paymentStatus: "Unpaid",
      paymentRail: "Vendor direct",
      recipientName: "Jordan Lee",
      recipientPhone: "+13105550100",
      recipientEmail: "jordan@shahproperty.example",
      recipients: [
        { role: "Property manager", name: "Jordan Lee", email: "jordan@shahproperty.example", phone: "+13105550100" },
        { role: "Owner", name: "Priya Shah", email: "priya@shahproperty.example", phone: "+13105550102" },
        { role: "LivingRelay records", name: "LivingRelay records", email: "invoices@livingrelay.com", phone: "" }
      ],
      invoiceDeliveryInstructions: "Unless otherwise instructed, send the vendor invoice to Property manager: jordan@shahproperty.example; Owner: priya@shahproperty.example; LivingRelay records: invoices@livingrelay.com.",
      taxYear: "2026",
      receivedAt: "Apr 30",
      note: "Vendor invoice is paid outside LivingRelay. Track payment status here only."
    }
  ],
  billingEvents: [
    {
      id: "bill-1",
      type: "dispatch_fee",
      accountId: "acct-1",
      propertyId: "p-1",
      orderId: "WO-2481",
      amount: 25,
      status: "Not charged",
      payerRole: "Owner",
      note: "Coordination fee is charged only after a vendor is booked.",
      createdAt: "2026-04-30T12:00:00.000Z"
    }
  ],
  referrals: [
    {
      id: "ref-demo-1",
      token: "LR-DEMO-1",
      program: "dispatch_and_owner_subscription",
      referrerPersonId: "owner-1",
      referrerAccountId: "acct-1",
      referrerName: "Priya Shah",
      referredName: "Nina Patel",
      referredEmail: "nina@propertyowner.example",
      referredRole: "Owner",
      status: "Invite sent",
      inviteDelivery: { sent: false, reason: "Demo seed" },
      rewardSummary: "If Nina creates and validates a legitimate property, both accounts get one free dispatch and owner subscription second-year eligibility.",
      createdAt: "2026-05-02T12:00:00.000Z"
    }
  ],
  prospectingLeads: [],
  accessRequests: [],
  notifications: [],
  qaRuns: [],
  auditLog: [
    audit("system", "Seeded local state", "Initial demo data loaded.")
  ]
};

export const state = await loadState();
export const platformSettings = state.platformSettings;
export const accounts = state.accounts;
export const people = state.people;
export const properties = state.properties;
export const vendors = state.vendors;
export const workOrders = state.workOrders;
export const invoices = state.invoices;
export const billingEvents = state.billingEvents;
export const referrals = state.referrals || (state.referrals = []);
export const prospectingLeads = state.prospectingLeads || (state.prospectingLeads = []);
export const accessRequests = state.accessRequests;
export const notifications = state.notifications || (state.notifications = []);
export const qaRuns = state.qaRuns || (state.qaRuns = []);
export const auditLog = state.auditLog;

export function saveState() {
  if (!isDurablePersistenceRequired()) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
  }
  const saveTask = pendingStateSave
    .catch(() => {})
    .then(() => saveStateToPostgres(state))
    .then(() => {
      lastStateSaveError = null;
    })
    .catch((error) => {
      lastStateSaveError = error;
      if (isDurablePersistenceRequired()) {
        console.error(`[Postgres save failed] ${error.message}`);
      } else {
        console.log(`[Postgres save skipped] ${error.message}`);
      }
      throw error;
    });
  saveTask.catch(() => {});
  pendingStateSave = saveTask;
  return saveTask;
}

export async function waitForStatePersistence() {
  await pendingStateSave;
  if (lastStateSaveError) throw lastStateSaveError;
}

export function recordAudit(actor, action, detail) {
  auditLog.unshift(audit(redactSensitiveText(actor), action, redactSensitiveText(detail)));
  saveState();
}

export function event(label, detail) {
  return { label, detail, stamp: new Date().toISOString() };
}

export function message(from, text) {
  return { from, text, stamp: new Date().toISOString() };
}

async function loadState() {
  const postgresState = await loadStateFromPostgres();
  if (postgresState) return mergeLoadedState(postgresState);
  if (!fs.existsSync(dataFile)) return seedState;
  try {
    const loaded = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return mergeLoadedState(loaded);
  } catch {
    return seedState;
  }
}

function mergeLoadedState(loaded) {
  const requiredAccounts = seedState.accounts.filter((account) => account.id === "acct-test");
  const requiredPeople = seedState.people.filter((person) => person.id.startsWith("test-"));
  const requiredProperties = seedState.properties.filter((property) => property.id === "p-test");
  const platformSettings = {
    vendorCallTestMode: loaded.platformSettings?.vendorCallTestMode ?? true,
    productionVendorCallsEnabled: loaded.platformSettings?.productionVendorCallsEnabled ?? true,
    vendorCallTestNumber: loaded.platformSettings?.vendorCallTestNumber ?? process.env.VENDOR_CALL_TEST_NUMBER ?? "",
    updatedAt: loaded.platformSettings?.updatedAt || new Date().toISOString()
  };
  const accounts = upsertRequiredById(loaded.accounts?.length ? loaded.accounts : seedState.accounts, requiredAccounts).map((account) => ({
    ...account,
    stripeCustomerId: isDemoStripeCustomer(account.stripeCustomerId) ? "" : account.stripeCustomerId,
    plan: account.plan?.includes("$149") ? "$0/property + $25 vendor dispatch" : account.plan || "$0/property + $25 vendor dispatch",
    billingPayerRole: account.billingPayerRole || "Owner",
    billingSetupStatus: isDemoStripeCustomer(account.stripeCustomerId) ? "Needs card" : account.billingSetupStatus || (account.stripeCustomerId ? "Card on file" : "Needs card"),
    ownerSubscriptionStatus: account.ownerSubscriptionStatus || "Free",
    ownerSubscriptionPlan: account.ownerSubscriptionPlan || "Owner Subscription",
    referralRewards: {
      dispatchCredits: 0,
      ownerSecondYearPending: 0,
      ownerSecondYearCredits: 0,
      ...(account.referralRewards || {})
    },
    productionVendorCallsEnabled: account.productionVendorCallsEnabled !== false
  }));
  const people = upsertRequiredById(ensureSiteAdmin(loaded.people || seedState.people, accounts), requiredPeople)
    .map((person) => person.role === "Admin" ? { ...person, role: "Manager" } : person);
  const properties = upsertRequiredById(loaded.properties || seedState.properties, requiredProperties).map((property) => {
    const accountId = property.accountId || accounts[0]?.id || "acct-1";
    const account = accounts.find((item) => item.id === accountId);
    const billingSetupStatus = account?.billingSetupStatus === "Card on file"
      ? property.billingSetupStatus || "Card on file"
      : "Needs card";
    return {
      ...property,
      accountId,
      plan: property.plan?.includes("$149") || property.plan?.includes("Payment required")
        ? "$0/property + $25 only when a vendor is booked"
        : property.plan || "$0/property + $25 only when a vendor is booked",
      billingPayerRole: property.billingPayerRole || "Owner",
      billingSetupStatus,
      launchNotificationStatus: property.launchNotificationStatus || "Pending setup",
      dispatchSettings: {
        vendorOutreachMode: "manager_approval",
        autoOutreachAfterTenantConfirmed: false,
        emergencyOutreachMode: "manager_approval",
        maxVendorsToCall: 5,
        requireTenantAvailabilityBeforeBooking: true,
        inboundInvoiceEmail: process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com",
        productionVendorCallsEnabled: true,
        ...(property.dispatchSettings || {})
      },
      rules: String(property.rules || "").replace(/\badmin review\b/gi, "manager review")
    };
  });
  const workOrders = (loaded.workOrders || seedState.workOrders).map((order) => ({
    ...order,
    demoFlow: order.demoFlow?.map((step) => ({
      ...step,
      persona: step.persona === "Admin / manager" ? "Manager" : step.persona
    }))
  }));
  return {
    ...seedState,
    ...loaded,
    platformSettings,
    accounts,
    people,
    properties,
    vendors: loaded.vendors || seedState.vendors,
    workOrders,
    invoices: loaded.invoices || seedState.invoices,
    billingEvents: loaded.billingEvents || seedState.billingEvents,
    referrals: loaded.referrals || seedState.referrals,
    prospectingLeads: loaded.prospectingLeads || seedState.prospectingLeads,
    accessRequests: loaded.accessRequests || seedState.accessRequests,
    notifications: loaded.notifications || seedState.notifications,
    qaRuns: loaded.qaRuns || seedState.qaRuns,
    auditLog: loaded.auditLog || []
  };
}

function upsertRequiredById(records = [], required = []) {
  const existing = records.map((record) => {
    const requiredRecord = required.find((item) => item.id === record.id);
    return requiredRecord ? { ...record, ...requiredRecord } : record;
  });
  const ids = new Set(existing.map((record) => record.id));
  return [...existing, ...required.filter((record) => !ids.has(record.id))];
}

function isDemoStripeCustomer(customerId = "") {
  return String(customerId).startsWith("cus_demo");
}

function ensureSiteAdmin(loadedPeople, accounts) {
  if (loadedPeople.some((person) => person.role === "Site Admin")) return loadedPeople;
  return [
    {
      id: "site-admin-1",
      name: "Avery Stone",
      role: "Site Admin",
      phone: "+13105550199",
      pin: "9999",
      propertyIds: [],
      accountIds: accounts.map((account) => account.id),
      notify: { platformAlerts: true }
    },
    ...loadedPeople
  ];
}

function audit(actor, action, detail) {
  return {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    actor,
    action,
    detail,
    stamp: new Date().toISOString()
  };
}

function redactSensitiveText(value = "") {
  return String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]")
    .replace(/\b(pin|password|token|authorization)\s*[:=]\s*[^,;\s}]+/gi, "$1=[redacted]");
}
