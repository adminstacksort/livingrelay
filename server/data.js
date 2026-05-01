import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dataFile = path.join(dataDir, "local-state.json");

const seedState = {
  people: [
    { id: "admin-1", name: "Jordan Lee", role: "Admin", phone: "+13105550100", pin: "1111", propertyIds: ["p-1", "p-2"], managesPropertyIds: ["p-1"], notify: { tenantReports: true, everyUpdate: true, keyUpdates: true } },
    { id: "owner-1", name: "Priya Shah", role: "Owner", phone: "+13105550102", pin: "3333", propertyIds: ["p-1"], notify: { tenantReports: true, everyUpdate: false, keyUpdates: true } },
    { id: "tenant-1", name: "Maya Chen", role: "Tenant", phone: "+13105550103", pin: "4444", propertyIds: ["p-1"], unit: "3B" },
    { id: "vendor-1", name: "Carlos Plumbing", role: "Vendor", phone: "+13105550104", pin: "5555", propertyIds: ["p-1"], trade: "Plumbing" }
  ],
  properties: [
    {
      id: "p-1",
      name: "Mar Vista Flats",
      address: "11820 Pacific Ave, Los Angeles, CA",
      subscription: "Active",
      plan: "$149/mo base + $39/property",
      units: ["2A", "3B", "7C"],
      ownerId: "owner-1",
      managerId: "admin-1",
      adminId: "admin-1",
      approvalThreshold: 150,
      rules: "Plumbing under $300 goes to Carlos first. Unit 3B needs owner approval above $150. HVAC always requires manager review. Emergencies: active water, gas smell, sparking, no lock."
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
      unit: "3B",
      tenantId: "tenant-1",
      trade: "Plumbing",
      severity: "Urgent",
      status: "Needs owner approval",
      estimate: 325,
      vendorId: "v-1",
      issue: "Water is dripping under the kitchen sink and the cabinet floor is wet.",
      access: "Anytime after 1 PM. Text before entering.",
      managerApproved: true,
      ownerApproved: false,
      invoiceId: "inv-1",
      timeline: [
        event("Tenant texted issue", "Maya reported active water under kitchen sink."),
        event("AI asked follow-up", "Requested access notes and photo."),
        event("Manager approved", "Owner approval needed because Unit 3B estimate is above $150.")
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
      status: "Awaiting owner approval",
      taxYear: "2026",
      receivedAt: "Apr 30",
      note: "Estimate only. Payment will happen off platform."
    }
  ],
  auditLog: [
    audit("system", "Seeded local state", "Initial demo data loaded.")
  ]
};

export const state = loadState();
export const people = state.people;
export const properties = state.properties;
export const vendors = state.vendors;
export const workOrders = state.workOrders;
export const invoices = state.invoices;
export const auditLog = state.auditLog;

export function saveState() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}

export function recordAudit(actor, action, detail) {
  auditLog.unshift(audit(actor, action, detail));
  saveState();
}

export function event(label, detail) {
  return { label, detail, stamp: new Date().toISOString() };
}

export function message(from, text) {
  return { from, text, stamp: new Date().toISOString() };
}

function loadState() {
  if (!fs.existsSync(dataFile)) return seedState;
  try {
    const loaded = JSON.parse(fs.readFileSync(dataFile, "utf8"));
    return {
      ...seedState,
      ...loaded,
      auditLog: loaded.auditLog || []
    };
  } catch {
    return seedState;
  }
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
