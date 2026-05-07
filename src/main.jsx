import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
  Bot,
  Building2,
  Check,
  ChevronRight,
  Clock,
  ClipboardList,
  CreditCard,
  Database,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Mail,
  MapPin,
  Home,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Radio,
  Target,
  Trash2,
  Upload,
  UserRound,
  Users,
  Wrench
} from "lucide-react";
import heroImage from "../assets/livingrelay-hero.png";
import { initializeAnalytics, trackPageView } from "./analytics";
import "./styles.css";

initializeAnalytics();

const people = [
  { id: "site-admin-1", name: "Avery Stone", role: "Site Admin", phone: "(310) 555-0199", pin: "9999", propertyIds: [], accountIds: ["acct-1"] },
  { id: "admin-1", name: "Jordan Lee", role: "Manager", phone: "(310) 555-0100", pin: "1111", propertyIds: ["p-1", "p-2"], managesPropertyIds: ["p-1"] },
  { id: "owner-1", name: "Priya Shah", role: "Owner", phone: "(310) 555-0102", pin: "3333", propertyIds: ["p-1"] },
  { id: "tenant-1", name: "Maya Chen", role: "Tenant", phone: "(310) 555-0103", pin: "4444", propertyIds: ["p-1"], unit: "Garden flat", defaultAvailability: "Any time with text before entry." },
  { id: "vendor-1", name: "Carlos Plumbing", role: "Vendor", phone: "(310) 555-0104", pin: "5555", propertyIds: ["p-1"], trade: "Plumbing" },
  { id: "test-manager", name: "Test Manager", role: "Manager", phone: "+15555555551", pin: "1111", propertyIds: ["p-test"], managesPropertyIds: ["p-test"], accountIds: ["acct-test"] },
  { id: "test-owner", name: "Test Owner", role: "Owner", phone: "+15555555552", pin: "3333", propertyIds: ["p-test"], accountIds: ["acct-test"] },
  { id: "test-tenant", name: "Test Tenant", role: "Tenant", phone: "+15555555553", pin: "4444", propertyIds: ["p-test"], unit: "Test unit" }
];

const accounts = [
  { id: "acct-1", name: "Shah Property Group", status: "Active", plan: "$0/property + $25 vendor dispatch", stripeCustomerId: "", billingPayerRole: "Owner", billingPayerPersonId: "owner-1", billingSetupStatus: "Needs card" },
  { id: "acct-test", name: "LivingRelay Test Account", status: "Test", plan: "$0/property + $25 vendor dispatch", stripeCustomerId: "", billingPayerRole: "Owner", billingPayerPersonId: "test-owner", billingSetupStatus: "Needs card" }
];

const properties = [
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
    rules: "Plumbing under $300 goes to Carlos first. Any repair above $150 needs owner approval. HVAC always requires manager review. Emergencies: active water, gas smell, sparking, no lock.",
    dispatchSettings: {
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
    rules: "Test account for production smoke checks. No vendor dispatch happens unless a real work order is created."
  },
  {
    id: "p-2",
    accountId: "acct-1",
    name: "Brooklyn Brownstone",
    address: "420 Dean St, Brooklyn, NY",
    subscription: "Ready, no monthly charge",
    plan: "$0/property + $25 only when a vendor is booked",
    units: ["Parlor floor", "Garden level"],
    ownerId: "owner-1",
    managerId: "admin-1",
    adminId: "admin-1",
    billingPayerRole: "Owner",
    billingPayerPersonId: "owner-1",
    billingSetupStatus: "Needs card",
    rules: "All dispatches need manager review until vendors are configured."
  }
];

const vendors = [
  { id: "v-1", name: "Carlos Plumbing", trade: "Plumbing", phone: "(310) 555-0104", preferred: true, payment: "Off platform" },
  { id: "v-2", name: "Nova HVAC", trade: "HVAC", phone: "(424) 555-0195", preferred: true, payment: "Off platform" },
  { id: "v-3", name: "Spark Right Electric", trade: "Electrical", phone: "(310) 555-0119", preferred: true, payment: "Off platform" }
];

const seedOrders = [
  {
    id: "WO-2481",
    propertyId: "p-1",
    unit: "Garden flat",
    tenantId: "tenant-1",
    trade: "Plumbing",
    severity: "Urgent",
    status: "Owner approval",
    estimate: 325,
    vendorId: "v-1",
    issue: "Water is dripping under the kitchen sink and the cabinet floor is wet.",
    access: "Anytime after 1 PM. Text before entering.",
    managerApproved: true,
    ownerApproved: false,
    dispatchFee: { status: "Not charged", amount: 25, reason: "Vendor has not been booked yet." },
    invoiceId: "inv-1",
    timeline: [
      event("Tenant texted issue", "Maya reported active water under kitchen sink."),
      event("AI asked follow-up", "Requested access notes and photo."),
      event("Manager approved", "Owner approval needed because the repair estimate is above $150.")
    ],
    messages: [
      sms("tenant", "Water is dripping under my kitchen sink."),
      sms("relay", "Thanks Maya. Is water actively leaking right now? Please send a photo and access notes."),
      sms("tenant", "Yes, still dripping. I can do after 1 PM."),
      sms("relay", "Manager is reviewing now. We will keep this thread updated.")
    ]
  },
  {
    id: "WO-2482",
    propertyId: "p-1",
    unit: "Main house",
    tenantId: "tenant-1",
    trade: "Electrical",
    severity: "Normal",
    status: "Vendor scheduled",
    estimate: 185,
    vendorId: "v-3",
    issue: "Bedroom outlet sparked once and the lights in the room are out.",
    access: "Today until 6 PM.",
    managerApproved: true,
    ownerApproved: true,
    invoiceId: null,
    timeline: [
      event("Tenant submitted", "Issue classified as electrical."),
      event("Manager approved", "Spark Right Electric selected."),
      event("Vendor scheduled", "Vendor confirmed tomorrow 10 AM to 1 PM.")
    ],
    messages: [
      sms("tenant", "The bedroom outlet sparked and the lights are out."),
      sms("relay", "We are sending this to Spark Right Electric. Please avoid using the outlet until inspected.")
    ]
  }
];

const seedInvoices = [
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
    recipientPhone: "(310) 555-0100",
    recipientEmail: "jordan@shahproperty.example",
    recipients: [
      { role: "Property manager", name: "Jordan Lee", email: "jordan@shahproperty.example", phone: "(310) 555-0100" },
      { role: "Owner", name: "Priya Shah", email: "priya@shahproperty.example", phone: "(310) 555-0102" },
      { role: "LivingRelay records", name: "LivingRelay records", email: "invoices@livingrelay.com", phone: "" }
    ],
    invoiceDeliveryInstructions: "Unless otherwise instructed, send the vendor invoice to Property manager: jordan@shahproperty.example; Owner: priya@shahproperty.example; LivingRelay records: invoices@livingrelay.com.",
    taxYear: "2026",
    receivedAt: "Apr 30",
    note: "Vendor invoice is paid outside LivingRelay. Track payment status here only."
  },
  {
    id: "inv-2",
    propertyId: "p-1",
    orderId: "WO-2409",
    vendor: "Nova HVAC",
    amount: 210,
    status: "Paid",
    paymentStatus: "Paid",
    paymentRail: "Vendor direct",
    recipientName: "Jordan Lee",
    recipientPhone: "(310) 555-0100",
    recipientEmail: "jordan@shahproperty.example",
    recipients: [
      { role: "Property manager", name: "Jordan Lee", email: "jordan@shahproperty.example", phone: "(310) 555-0100" },
      { role: "Owner", name: "Priya Shah", email: "priya@shahproperty.example", phone: "(310) 555-0102" },
      { role: "LivingRelay records", name: "LivingRelay records", email: "invoices@livingrelay.com", phone: "" }
    ],
    invoiceDeliveryInstructions: "Unless otherwise instructed, send the vendor invoice to Property manager: jordan@shahproperty.example; Owner: priya@shahproperty.example; LivingRelay records: invoices@livingrelay.com.",
    taxYear: "2026",
    receivedAt: "Apr 12",
    note: "Spring service call. Paid directly to vendor."
  }
];

const seedBillingEvents = [
  {
    id: "bill-1",
    type: "dispatch_fee",
    accountId: "acct-1",
    propertyId: "p-1",
    orderId: "WO-2481",
    amount: 25,
    payerRole: "Owner",
    status: "Not charged",
    note: "Coordination fee is charged only after a vendor is booked.",
    createdAt: "Today"
  }
];

const defaultRequest = {
  unit: "Garden flat",
  issue: "",
  access: "",
  mediaFiles: [],
  mediaError: "",
  escalationChoice: "self_solve",
  useDefaultAvailability: true,
  saveDefaultAvailability: false,
  defaultAvailability: ""
};

const notificationEvents = [
  ["tenant_report", "Tenant logged request", ["Manager", "Owner"]],
  ["vendor_contacted", "Vendors being contacted", ["Manager", "Owner"]],
  ["vendor_booked", "Vendor booked", ["Manager", "Owner", "Tenant", "Vendor"]],
  ["issue_resolved", "Issue resolved", ["Manager", "Owner", "Tenant"]],
  ["owner_paid", "Owner paid", ["Manager"]],
  ["owner_approval", "Owner approval", ["Owner"]],
  ["billing_required", "Billing setup", ["Manager", "Owner"]]
];

function defaultNotify(role, notify = {}) {
  const defaults = {
    Manager: { tenant_report: true, vendor_contacted: true, vendor_booked: true, issue_resolved: true, owner_paid: true, owner_approval: false, billing_required: true },
    Owner: { tenant_report: true, vendor_contacted: false, vendor_booked: true, issue_resolved: true, owner_paid: false, owner_approval: true, billing_required: true },
    Tenant: { tenant_report: false, vendor_contacted: false, vendor_booked: true, issue_resolved: true, owner_paid: false, owner_approval: false, billing_required: false },
    Vendor: { tenant_report: false, vendor_contacted: false, vendor_booked: true, issue_resolved: false, owner_paid: false, owner_approval: false, billing_required: false }
  };
  return {
    channels: {
      sms: notify.channels?.sms ?? true,
      email: notify.channels?.email ?? true,
      push: notify.channels?.push ?? true
    },
    events: {
      ...(defaults[role] || {}),
      ...(notify.events || {})
    }
  };
}

function event(label, detail) {
  return { label, detail, stamp: "Today" };
}

function sms(from, text) {
  return { from, text, stamp: "Now" };
}

function formatMoney(value) {
  return `$${value.toLocaleString()}`;
}

function formatDateTime(value) {
  if (!value) return "Not yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function referralTokenFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get("ref") || params.get("referral") || params.get("referral_code") || "";
  const pathToken = window.location.pathname.match(/^\/ref\/([^/?#]+)/i)?.[1] || "";
  return decodeURIComponent(queryToken || pathToken).trim().toUpperCase();
}

function isSiteAdminConsoleHost() {
  const host = window.location.hostname.toLowerCase();
  const adminPreview = new URLSearchParams(window.location.search).get("console") === "site-admin" || window.location.pathname.startsWith("/admin");
  return host === "admin.livingrelay.com" || (adminPreview && ["staging.livingrelay.com", "localhost", "127.0.0.1", "::1"].includes(host));
}

function isDemoExperienceHost() {
  const host = window.location.hostname.toLowerCase();
  const localDemoPreview = new URLSearchParams(window.location.search).get("demo") === "1" || window.location.pathname.startsWith("/demo");
  return host === "demo.livingrelay.com" || host === "admin.livingrelay.com" || (localDemoPreview && ["staging.livingrelay.com", "localhost", "127.0.0.1", "::1"].includes(host));
}

function isDemoLoginShortcutsHost() {
  return isDemoExperienceHost();
}

const publicSitePages = {
  "/about": "about",
  "/support": "support",
  "/marketing": "marketing",
  "/sales": "sales",
  "/talk-to-sales": "sales",
  "/contact-sales": "sales",
  "/maintenance-workflow-audit": "workflowAudit",
  "/rental-maintenance-workflow-audit": "workflowAudit",
  "/rental-maintenance-intake-kit": "maintenanceKit",
  "/maintenance-kit": "maintenanceKit",
  "/rental-maintenance-software": "rentalMaintenanceSoftware",
  "/property-maintenance-coordination": "propertyMaintenanceCoordination",
  "/tenant-maintenance-texts": "tenantMaintenanceTexts",
  "/try-livingrelay": "tryLivingRelay",
  "/pilot": "tryLivingRelay",
  "/resources": "resourceIndex",
  "/privacy": "privacy",
  "/privacy-policy": "privacy",
  "/terms": "terms",
  "/terms-and-conditions": "terms",
  "/ios": "ios",
  "/ios-app": "ios",
  "/referral-program": "referral",
  "/property-maintenance": "maintenanceIndex"
};

const propertyMaintenanceCities = [
  {
    city: "New York City",
    state: "NY",
    slug: "new-york-city-property-maintenance",
    title: "New York City Property Maintenance",
    climate: "steam heat, aging risers, roof drainage, elevator coordination, and tight building access",
    stock: "co-ops, condos, brownstones, small mixed-use buildings, and prewar walk-ups",
    issue: "radiator noise, recurring drain backups, intercom failures, leaks that travel through several apartments, and vendor access windows that disappear fast",
    approach: "triage by building system first, separate emergency water or heat calls from cosmetic repairs, and keep super, board, owner, tenant, and vendor notes in one thread",
    decade: "Over the last 10 years, package volume, remote owners, Local Law energy work, and tighter insurance expectations have made documentation as important as the repair itself.",
    providers: "Managers often compare local licensed plumbers and electricians with marketplace options such as Angi, Thumbtack, Yelp, Taskrabbit for small jobs, and national brands like Roto-Rooter or Mr. Rooter when coverage matters.",
    costs: "Small handyman visits often land around $175 to $700, routine plumbing or electrical work often starts in the low hundreds, and elevator, facade, boiler, or after-hours leak response can move into four figures quickly."
  },
  {
    city: "Los Angeles",
    state: "CA",
    slug: "los-angeles-property-maintenance",
    title: "Los Angeles Property Maintenance",
    climate: "dry heat, hillside drainage, older galvanized plumbing, seismic concerns, and intense wear on roofs and stucco",
    stock: "bungalows, duplexes, courtyard apartments, hillside rentals, and mid-century multifamily buildings",
    issue: "slow leaks, AC strain, gate and garage access problems, pest entry points, appliance failures, and damage from deferred exterior maintenance",
    approach: "capture photos early, verify whether the home is rent-stabilized or under HOA rules, and schedule vendors around traffic, parking, and tenant access",
    decade: "The last decade brought more remote ownership, more accessory dwelling units, higher tenant expectations, and sharper scrutiny around habitability timelines.",
    providers: "Many owners benchmark local trades against Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, Mr. Rooter, and large HVAC brands like One Hour Heating & Air Conditioning.",
    costs: "A simple handyman job can stay under $300, but plumbing, electrical, HVAC, roofing, and emergency response commonly reach $300 to $2,000 depending on access, licensing, and parts."
  },
  {
    city: "Chicago",
    state: "IL",
    slug: "chicago-property-maintenance",
    title: "Chicago Property Maintenance",
    climate: "freeze-thaw cycles, lake-effect moisture, flat roofs, masonry movement, and heavy boiler season",
    stock: "two-flats, three-flats, courtyard buildings, condos, greystones, and vintage walk-ups",
    issue: "radiator imbalance, roof membrane leaks, tuckpointing, frozen hose bibs, slow drains, and doors that shift after winter",
    approach: "separate weather emergencies from seasonal maintenance, document heat complaints carefully, and plan roof, masonry, and gutter work before the first cold snap",
    decade: "In the last 10 years, owners have become more proactive about winterization, camera-documented repairs, and energy upgrades because one missed freeze can create a very expensive week.",
    providers: "Chicago managers often blend neighborhood trades with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and HVAC networks that can staff peak heating calls.",
    costs: "Budget a few hundred dollars for small repairs, more for licensed plumbing or electrical, and four figures for boiler, masonry, roof, or water-damage work that needs fast labor."
  },
  {
    city: "Houston",
    state: "TX",
    slug: "houston-property-maintenance",
    title: "Houston Property Maintenance",
    climate: "humidity, heavy rain, hurricanes, slab movement, pests, and long cooling seasons",
    stock: "single-family rentals, townhomes, garden apartments, and fast-growing suburban portfolios",
    issue: "AC failures, roof leaks, clogged condensate lines, fence damage, pest intrusion, drainage problems, and post-storm vendor scarcity",
    approach: "rank AC, active water, electrical, and security issues first, keep storm photos organized, and maintain backup vendors before hurricane season",
    decade: "The last decade has pushed Houston owners toward better storm readiness, stronger insurance documentation, and faster tenant communication during extreme weather.",
    providers: "Teams commonly compare local HVAC and roofing companies with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and national restoration brands after major storms.",
    costs: "Routine repairs may start in the low hundreds, AC service often runs higher during heat waves, and roof, water mitigation, or major HVAC work can escalate from $1,000 to several thousand dollars."
  },
  {
    city: "Phoenix",
    state: "AZ",
    slug: "phoenix-property-maintenance",
    title: "Phoenix Property Maintenance",
    climate: "extreme heat, dust, hard water, sun-baked roofs, irrigation wear, and year-round AC dependence",
    stock: "single-family rentals, condos, patio homes, and large master-planned community rentals",
    issue: "AC failures, water heater scale, irrigation leaks, cracked exterior seals, appliance stress, and garage door trouble",
    approach: "treat cooling problems as urgent, schedule preventive HVAC service before summer, and keep HOA access and gate notes attached to every work order",
    decade: "Over the last 10 years, summer reliability has become the central maintenance story as heat waves, population growth, and parts delays raised the cost of slow response.",
    providers: "Owners often compare local HVAC contractors with Angi, Thumbtack, Yelp, Home Depot Pro Referral, One Hour Heating & Air Conditioning, Roto-Rooter, and Mr. Rooter.",
    costs: "A small repair may cost a few hundred dollars, while HVAC diagnostics, capacitor replacement, refrigerant issues, roof repairs, or water heater work can run from several hundred to several thousand."
  },
  {
    city: "Philadelphia",
    state: "PA",
    slug: "philadelphia-property-maintenance",
    title: "Philadelphia Property Maintenance",
    climate: "rowhouse age, freeze-thaw movement, flat roofs, basement moisture, and old plumbing stacks",
    stock: "rowhomes, duplexes, small apartment buildings, converted homes, and mixed-use rentals",
    issue: "roof leaks, sewer line problems, plaster damage, radiator heat complaints, brick pointing, and narrow-access repairs",
    approach: "document the exact room and wall path for leaks, distinguish habitability issues from finish repairs, and keep owner approvals moving before water damage spreads",
    decade: "The last decade has brought more investor-owned rowhomes and more remote decision-making, making repair records and tenant updates much harder to manage by text alone.",
    providers: "Philadelphia operators often compare neighborhood roofers, plumbers, and electricians with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and Taskrabbit for small turns.",
    costs: "Expect small jobs in the low hundreds, licensed trades often in the mid hundreds, and roof, sewer, masonry, or plaster restoration to climb into four figures."
  },
  {
    city: "San Antonio",
    state: "TX",
    slug: "san-antonio-property-maintenance",
    title: "San Antonio Property Maintenance",
    climate: "heat, hard water, foundation movement, seasonal storms, and heavy AC use",
    stock: "single-family rentals, duplexes, small multifamily buildings, and newer suburban homes",
    issue: "HVAC strain, water heater sediment, slab plumbing concerns, fence repairs, roof wear, and pest entry after storms",
    approach: "log photos, age of equipment, access notes, and warranty status before dispatch so vendors can quote cleanly",
    decade: "Growth over the last 10 years has made vendor availability more uneven, especially during heat waves and after hail or wind events.",
    providers: "Owners often check local licensed contractors against Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and national HVAC service networks.",
    costs: "Basic repairs may sit under $400, but HVAC, roof, foundation-adjacent plumbing, or emergency work can quickly require $750 to $3,000 or more."
  },
  {
    city: "San Diego",
    state: "CA",
    slug: "san-diego-property-maintenance",
    title: "San Diego Property Maintenance",
    climate: "coastal air, marine corrosion, dry summers, hillside drainage, and HOA-managed communities",
    stock: "condos, small apartment buildings, beach rentals, single-family homes, and townhomes",
    issue: "window corrosion, slow leaks, exterior rot, garage access, appliance repairs, and plumbing wear in older coastal units",
    approach: "confirm HOA responsibilities early, photograph moisture and corrosion, and separate tenant-caused wear from salt-air deterioration",
    decade: "In the last 10 years, rising rents and owner distance have made prompt, well-documented repairs a trust signal for tenants and property managers.",
    providers: "San Diego teams often compare local trades with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, and Mr. Rooter.",
    costs: "Small maintenance can land in the low hundreds, while plumbing, electrical, appliance, HOA compliance, or coastal exterior work often moves higher because access and materials matter."
  },
  {
    city: "Dallas",
    state: "TX",
    slug: "dallas-property-maintenance",
    title: "Dallas Property Maintenance",
    climate: "heat, hail, clay soil movement, hard water, and storm-driven roof claims",
    stock: "single-family rentals, townhomes, duplexes, garden apartments, and newer infill properties",
    issue: "AC failures, roof and gutter damage, slab movement symptoms, fence repairs, electrical panel concerns, and irrigation leaks",
    approach: "triage safety and cooling first, attach photos for roof or fence claims, and keep tenant updates clear when storms create vendor backlogs",
    decade: "The last decade has made Dallas maintenance more operational: growth brought more vendors, but storms and heat spikes still compress response windows.",
    providers: "Owners commonly benchmark local roofers, HVAC techs, and plumbers against Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and One Hour Heating & Air Conditioning.",
    costs: "Simple work may stay under $300, while HVAC, roofing, electrical, or drainage repairs can reach $500 to $3,000 depending on urgency and materials."
  },
  {
    city: "Jacksonville",
    state: "FL",
    slug: "jacksonville-property-maintenance",
    title: "Jacksonville Property Maintenance",
    climate: "humidity, hurricanes, salt air near the coast, pests, drainage, and long cooling seasons",
    stock: "single-family rentals, townhomes, garden apartments, and coastal or river-adjacent homes",
    issue: "AC condensate clogs, roof leaks, exterior rot, pest intrusion, storm damage, and plumbing backups",
    approach: "prepare before hurricane season, track photos and invoices for insurance, and treat AC, water, and security issues as first-response items",
    decade: "Jacksonville's growth over the last 10 years has increased demand for reliable vendors, especially after storms when every owner is calling at once.",
    providers: "Operators often compare local HVAC, roofing, and mitigation companies with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and national restoration brands.",
    costs: "Routine items may cost a few hundred dollars, while water mitigation, roof repairs, or HVAC replacement can move from $1,000 into several thousand."
  },
  {
    city: "Fort Worth",
    state: "TX",
    slug: "fort-worth-property-maintenance",
    title: "Fort Worth Property Maintenance",
    climate: "heat, hail, clay soil, high winds, and rapid suburban growth",
    stock: "single-family rentals, duplexes, townhomes, and newer build-to-rent communities",
    issue: "AC outages, fence damage, roof claims, irrigation problems, garage doors, and foundation movement warning signs",
    approach: "keep equipment ages, warranty status, and storm photos tied to each property so vendors can move faster",
    decade: "Over the last 10 years, Fort Worth moved from secondary market to core rental market, and maintenance expectations rose with that growth.",
    providers: "Managers often blend local relationships with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and large HVAC service networks.",
    costs: "Small jobs can be modest, but cooling, roof, fence, irrigation, and emergency plumbing work often lands between several hundred and several thousand dollars."
  },
  {
    city: "San Jose",
    state: "CA",
    slug: "san-jose-property-maintenance",
    title: "San Jose Property Maintenance",
    climate: "high labor costs, aging suburban homes, seismic considerations, drought-aware landscaping, and tech-worker expectations",
    stock: "single-family rentals, condos, duplexes, townhomes, and small apartment buildings",
    issue: "appliance failures, plumbing leaks, electrical upgrades, garage doors, irrigation, and access scheduling across busy households",
    approach: "document scope tightly, get approval thresholds clear, and avoid vague dispatches because Bay Area labor time is expensive",
    decade: "The last 10 years increased both owner distance and tenant expectations, so fast communication now prevents many avoidable escalations.",
    providers: "San Jose owners often compare local licensed trades with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, Mr. Rooter, and larger HVAC groups.",
    costs: "Even routine visits can cost more than national averages; expect low-hundreds for small tasks and much higher totals for licensed trade work, parts, and repeat visits."
  },
  {
    city: "Austin",
    state: "TX",
    slug: "austin-property-maintenance",
    title: "Austin Property Maintenance",
    climate: "heat, hard water, flash flooding, tree growth, and pressure from fast rental-market expansion",
    stock: "single-family rentals, condos, duplexes, new townhomes, and small multifamily buildings",
    issue: "AC failures, sewer line backups, appliance delays, fence repairs, tree damage, and smart-home device confusion",
    approach: "rank cooling and water issues first, capture model numbers early, and keep owner approvals fast when vendors are scarce",
    decade: "Over the last 10 years, Austin's growth changed maintenance from informal handyman calls to a capacity-planning problem.",
    providers: "Owners often compare local trades with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, Mr. Rooter, and large HVAC networks.",
    costs: "Small jobs may be a few hundred dollars, but AC, plumbing, tree, fence, and appliance work can rise quickly when demand peaks."
  },
  {
    city: "Charlotte",
    state: "NC",
    slug: "charlotte-property-maintenance",
    title: "Charlotte Property Maintenance",
    climate: "humidity, storms, clay soil, tree cover, and mixed old-new housing stock",
    stock: "single-family rentals, townhomes, condos, garden apartments, and renovated older homes",
    issue: "HVAC humidity problems, crawlspace moisture, roof leaks, appliance repairs, drainage, and exterior wood rot",
    approach: "separate moisture source from cosmetic damage, document crawlspace or attic photos, and schedule preventive HVAC and gutter work before storm season",
    decade: "Charlotte's growth over the last decade has raised expectations for professional, trackable repair handling across small portfolios.",
    providers: "Managers often compare local HVAC, plumbing, and restoration vendors with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and Taskrabbit.",
    costs: "Routine repair visits often start in the low hundreds, while crawlspace, HVAC, roof, and water intrusion work can reach four figures."
  },
  {
    city: "Columbus",
    state: "OH",
    slug: "columbus-property-maintenance",
    title: "Columbus Property Maintenance",
    climate: "freeze-thaw winters, humid summers, basement moisture, and student-rental turnover",
    stock: "single-family rentals, duplexes, townhomes, student rentals, and small apartment buildings",
    issue: "furnace failures, sump pump issues, basement seepage, drain backups, door and window drafts, and appliance turnover repairs",
    approach: "winterize early, track recurring basement moisture, and use move-in photos to separate tenant damage from normal wear",
    decade: "In the last 10 years, Columbus has grown into a more competitive rental market, and tenants expect clearer repair status than a voicemail chain can provide.",
    providers: "Owners commonly use local trades alongside Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, Mr. Rooter, and regional HVAC companies.",
    costs: "Small maintenance can be manageable, but furnace, sump, sewer, electrical, and turnover work commonly moves from a few hundred dollars to several thousand."
  },
  {
    city: "Indianapolis",
    state: "IN",
    slug: "indianapolis-property-maintenance",
    title: "Indianapolis Property Maintenance",
    climate: "cold winters, humid summers, basements, tree cover, and broad single-family rental geography",
    stock: "single-family homes, duplexes, townhomes, and small multifamily rentals",
    issue: "furnace outages, roof leaks, sewer line issues, foundation moisture, appliance repair, and exterior trim wear",
    approach: "group routine work by geography, escalate heat and security issues immediately, and keep repeat-problem history visible before dispatch",
    decade: "Investor ownership grew over the last 10 years, making consistent vendor coordination and audit trails more valuable for scattered portfolios.",
    providers: "Indianapolis managers often compare local trades with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, Mr. Rooter, and national HVAC brands.",
    costs: "Routine jobs often start in the low hundreds, while HVAC, sewer, roof, and moisture repairs can move into four figures when diagnostics or materials stack up."
  },
  {
    city: "San Francisco",
    state: "CA",
    slug: "san-francisco-property-maintenance",
    title: "San Francisco Property Maintenance",
    climate: "coastal moisture, fog, hills, old plumbing, tight access, and high labor costs",
    stock: "Victorians, Edwardians, condos, TICs, small apartment buildings, and hillside homes",
    issue: "window leaks, soft drywall, old sewer laterals, knob-and-tube surprises, roof drainage, and vendor parking constraints",
    approach: "collect photos and exact location notes before dispatch, confirm HOA or building rules, and move owner approvals fast because repeat trips are costly",
    decade: "Over the last 10 years, San Francisco maintenance became more documentation-heavy as remote ownership, tenant protections, and high trade costs changed the pace of decisions.",
    providers: "Owners often compare trusted local specialists with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, Mr. Rooter, and Bay Area HVAC or electrical firms.",
    costs: "A small job can still cost a few hundred dollars, while plumbing, electrical, roofing, or moisture repairs can reach $1,000 to $5,000 faster than owners expect."
  },
  {
    city: "Seattle",
    state: "WA",
    slug: "seattle-property-maintenance",
    title: "Seattle Property Maintenance",
    climate: "rain, moss, drainage, older electrical systems, steep lots, and moisture-sensitive interiors",
    stock: "single-family rentals, townhomes, condos, small apartment buildings, and craftsman homes",
    issue: "roof leaks, clogged gutters, deck rot, basement moisture, heat pump issues, and window condensation",
    approach: "treat drainage as a system, document exterior water paths, and schedule gutter, roof, and deck work before long wet stretches",
    decade: "In the last 10 years, infill townhomes, remote work, and higher tenant expectations have made repair coordination more precise and less forgiving.",
    providers: "Seattle owners often compare local roof, drain, and HVAC vendors with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, Mr. Rooter, and regional restoration firms.",
    costs: "Handyman work may start in the low hundreds, while drainage, roof, deck, electrical, or heat pump repairs can move into four figures."
  },
  {
    city: "Denver",
    state: "CO",
    slug: "denver-property-maintenance",
    title: "Denver Property Maintenance",
    climate: "snow, hail, sun exposure, freeze-thaw swings, dry air, and expanding rental neighborhoods",
    stock: "single-family homes, duplexes, condos, townhomes, and small apartment buildings",
    issue: "furnace problems, roof and gutter damage, irrigation blowouts, sewer line issues, cracked exterior caulk, and fence repairs",
    approach: "plan seasonal maintenance around snow and irrigation cycles, document hail damage quickly, and keep furnace age visible in every heating work order",
    decade: "Denver's last decade of growth pushed owners to professionalize maintenance, especially for remote landlords who cannot inspect storm damage in person.",
    providers: "Managers commonly compare local HVAC, roof, and sewer vendors with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and national restoration brands.",
    costs: "Routine repairs may be a few hundred dollars, while roof, sewer, HVAC, and storm-related work often climbs from $1,000 to several thousand."
  },
  {
    city: "Oklahoma City",
    state: "OK",
    slug: "oklahoma-city-property-maintenance",
    title: "Oklahoma City Property Maintenance",
    climate: "heat, wind, hail, tornado-season storms, clay soil, and long driving distances between properties",
    stock: "single-family rentals, duplexes, small multifamily buildings, and suburban homes",
    issue: "roof damage, fence repairs, HVAC strain, drainage, slab movement, and appliance replacements",
    approach: "keep storm photos, insurance notes, and vendor estimates organized, then group non-urgent repairs by route to reduce trip charges",
    decade: "The last 10 years have made storm documentation and fast tenant messaging more central to maintenance planning.",
    providers: "Owners often compare local roofers, HVAC techs, and plumbers with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and restoration companies.",
    costs: "Small repairs can stay affordable, but roof, fence, HVAC, and water damage work commonly reaches several hundred to several thousand dollars."
  },
  {
    city: "Nashville",
    state: "TN",
    slug: "nashville-property-maintenance",
    title: "Nashville Property Maintenance",
    climate: "humidity, storms, tree cover, crawlspaces, and rapid neighborhood redevelopment",
    stock: "single-family rentals, duplexes, townhomes, renovated cottages, and small apartment buildings",
    issue: "HVAC humidity problems, crawlspace moisture, roof leaks, appliance issues, deck repairs, and plumbing in renovated homes",
    approach: "document what is original versus recently renovated, separate moisture problems from finish damage, and verify short-term rental or HOA rules where relevant",
    decade: "Nashville's last decade of growth raised both repair volume and owner expectations for real-time visibility.",
    providers: "Managers often compare local HVAC, plumbing, and crawlspace vendors with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and Taskrabbit.",
    costs: "Routine work may start in the low hundreds, while HVAC, crawlspace, deck, roof, or plumbing repairs can run into the thousands."
  },
  {
    city: "Washington",
    state: "DC",
    slug: "washington-dc-property-maintenance",
    title: "Washington DC Property Maintenance",
    climate: "humid summers, freeze-thaw winters, rowhouse age, strict permitting, and condo association rules",
    stock: "rowhouses, condos, English basements, small apartment buildings, and mixed-use rentals",
    issue: "roof leaks, basement moisture, radiator or heat pump issues, brick and stair repairs, pest entry, and access coordination",
    approach: "confirm building responsibility, permit needs, and tenant access early, then keep owners informed before small water problems become legal problems",
    decade: "Over the last 10 years, more professionalized rentals and stricter documentation habits have made repair records central to owner and tenant trust.",
    providers: "DC managers often compare licensed local trades with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, Mr. Rooter, and regional restoration firms.",
    costs: "Basic visits often start in the low hundreds, while roof, masonry, moisture, electrical, and HVAC repairs can become four-figure projects quickly."
  },
  {
    city: "El Paso",
    state: "TX",
    slug: "el-paso-property-maintenance",
    title: "El Paso Property Maintenance",
    climate: "desert heat, dust, hard water, roof sun exposure, and cooling season stress",
    stock: "single-family rentals, duplexes, townhomes, and low-rise apartment communities",
    issue: "AC strain, evaporative cooler issues, water heater scale, stucco cracks, roof coating, and appliance wear",
    approach: "track equipment age, schedule cooling service before peak heat, and keep parts notes handy for repeat HVAC calls",
    decade: "The last 10 years have made preventive cooling maintenance more important as hotter summers and tenant expectations narrow the response window.",
    providers: "Owners commonly compare local HVAC and plumbing vendors with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and national HVAC brands.",
    costs: "Small jobs may remain modest, but cooling, roof coating, plumbing, and water heater work often ranges from a few hundred to several thousand dollars."
  },
  {
    city: "Las Vegas",
    state: "NV",
    slug: "las-vegas-property-maintenance",
    title: "Las Vegas Property Maintenance",
    climate: "extreme heat, hard water, dust, sun exposure, irrigation rules, and heavy AC dependence",
    stock: "single-family rentals, condos, townhomes, and HOA-heavy communities",
    issue: "AC failures, water heater scale, appliance stress, garage doors, irrigation leaks, and cracked exterior seals",
    approach: "treat cooling as urgent, verify HOA requirements, and collect appliance model numbers before sending a vendor",
    decade: "Las Vegas maintenance changed over the last 10 years as remote investors, hotter summers, and short vendor windows made speed and documentation essential.",
    providers: "Managers often compare local HVAC, plumbing, and appliance vendors with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Roto-Rooter, Mr. Rooter, and One Hour Heating & Air Conditioning.",
    costs: "Routine repairs can start in the low hundreds, while HVAC, water heater, appliance, and emergency cooling work can reach $500 to several thousand dollars."
  },
  {
    city: "Boston",
    state: "MA",
    slug: "boston-property-maintenance",
    title: "Boston Property Maintenance",
    climate: "old housing, snow, freeze-thaw cycles, coastal moisture, student turns, and high labor costs",
    stock: "triple-deckers, brownstones, condos, small apartment buildings, and converted homes",
    issue: "steam heat, frozen pipes, roof ice, old electrical, plaster damage, drain backups, and September turnover repairs",
    approach: "document heat and water issues immediately, plan turn work well before lease changeover, and keep owner approvals tight when licensed trades are needed",
    decade: "Over the last 10 years, Boston owners have dealt with higher trade costs, stricter tenant expectations, and less tolerance for scattered maintenance records.",
    providers: "Owners often compare local licensed trades with Angi, Thumbtack, Yelp, Home Depot Pro Referral, Taskrabbit, Roto-Rooter, Mr. Rooter, and regional HVAC or restoration firms.",
    costs: "A small visit can run a few hundred dollars, while heat, plumbing, electrical, roof, or turn-season work can quickly become a four-figure expense."
  }
];

const publicFooterCityLinks = propertyMaintenanceCities.filter((city) =>
  ["san-francisco-property-maintenance", "boston-property-maintenance", "new-york-city-property-maintenance", "los-angeles-property-maintenance", "chicago-property-maintenance", "houston-property-maintenance"].includes(city.slug)
);

const siteOrigin = "https://livingrelay.com";
const productFaqs = [
  {
    question: "What is LivingRelay?",
    answer: "LivingRelay is rental repair coordination software for small property managers and rental owners. It turns tenant maintenance messages into structured work orders with approval history, vendor outreach, status updates, and invoice records."
  },
  {
    question: "Who is LivingRelay built for?",
    answer: "LivingRelay is built for small rental property operators, including property managers, owners, tenants, and service vendors who need a cleaner repair process without an enterprise maintenance department."
  },
  {
    question: "How does LivingRelay handle tenant maintenance requests?",
    answer: "Tenants can report issues from their phone. LivingRelay captures symptoms, unit details, photos, access notes, urgency, and repair history so managers and owners can make the next decision with context."
  },
  {
    question: "Does LivingRelay process vendor repair payments?",
    answer: "Vendor repair payments are handled off platform. LivingRelay keeps invoice status, repair totals, tax-year records, and coordination history organized by property."
  }
];

const marketingUseCases = [
  {
    title: "For Property Managers",
    text: "Convert tenant maintenance texts into work orders, classify the issue, collect photos and access notes, route owner approvals, and keep vendor updates tied to the property."
  },
  {
    title: "For Rental Owners",
    text: "Review repair context before approving spend, see estimate history, track vendor invoices, and keep property-level maintenance records ready for tax season or portfolio review."
  },
  {
    title: "For Tenants",
    text: "Report repairs from a phone, provide the details managers need, and receive clearer status updates without repeating the same issue in separate conversations."
  },
  {
    title: "For Vendors",
    text: "Receive cleaner scopes with the property, unit, trade, access window, photos, estimate context, and invoice delivery instructions before committing to a job."
  }
];

const seoPageIdeas = [
  ["After-Hours Maintenance Request Template", "after hours maintenance request template", "Find a safe non-emergency intake process for nighttime rental requests", "/resources/after-hours-maintenance-request-template", "A plain workflow for capturing after-hours details, routing the next business decision, and telling tenants to call local emergency services first for immediate danger.", "LivingRelay turns after-hours texts into structured intake, manager review, tenant updates, and work-order records.", "medium"],
  ["Tenant Maintenance Request Template", "tenant maintenance request template", "Copy a tenant-facing request form or message", "/resources/tenant-maintenance-request-template", "A reusable intake structure for issue, location, photos, access windows, and preferred contact details.", "LivingRelay collects these fields by SMS and keeps them attached to the repair.", "low"],
  ["Rental Property Maintenance Log", "rental property maintenance log", "Set up a simple repair history log", "/resources/rental-property-maintenance-log", "A practical log format for repair dates, vendors, status, invoices, owner decisions, and follow-up notes.", "LivingRelay keeps logs by property and work order instead of scattered spreadsheets.", "low"],
  ["Landlord Maintenance Checklist", "landlord maintenance checklist", "Organize recurring rental maintenance tasks", "/resources/landlord-maintenance-checklist", "A seasonal and move-in maintenance organization checklist without technical repair instructions.", "LivingRelay helps turn checklist findings into trackable requests and vendor coordination.", "medium"],
  ["Property Manager Vendor Checklist", "property manager vendor checklist", "Evaluate and coordinate vendor information", "/resources/property-manager-vendor-checklist", "A vendor coordination checklist for trade, service area, availability, invoice delivery, closeout photos, and warranty notes.", "LivingRelay stores preferred vendor details and outreach outcomes with each repair.", "low"],
  ["Owner Approval Maintenance Template", "owner approval maintenance template", "Send owners repair context before approval", "/templates/owner-approval-maintenance-template", "A copy/paste owner update that summarizes issue, estimate, vendor recommendation, access, and decision needed.", "LivingRelay automates approval context and preserves the response on the work order.", "low"],
  ["Maintenance Status Update Text Message", "maintenance status update text message", "Send tenants calm routine status updates", "/templates/maintenance-status-update-text-message", "SMS wording for received, reviewing, vendor contacted, scheduled, delayed, and closed updates.", "LivingRelay sends role-aware SMS updates as the work order moves.", "low"],
  ["Remote Landlord Maintenance Coordination", "remote landlord maintenance coordination", "Build a process for rentals managed from away", "/resources/remote-landlord-maintenance-coordination", "A guide to intake, photos, access notes, vendor outreach, approvals, and records for remote owners.", "LivingRelay gives remote owners visibility without making them chase every thread.", "low"],
  ["Small Property Manager Maintenance System", "small property manager maintenance system", "Choose an operational maintenance process", "/resources/small-property-manager-maintenance-system", "A lightweight system for intake, triage categories, owner updates, vendors, and invoice records.", "LivingRelay is the SMS-first workflow layer for that system.", "low"],
  ["Rental Maintenance Photo Checklist", "rental maintenance photo checklist", "Ask tenants or vendors for useful photos", "/templates/rental-maintenance-photo-checklist", "A safe photo checklist for wide, close-up, location, model label, and access photos where appropriate.", "LivingRelay keeps photos attached to the request and vendor scope.", "low"],
  ["Move-In Maintenance Expectations Template", "move in maintenance expectations template", "Set repair communication norms at move-in", "/templates/move-in-maintenance-expectations-template", "Friendly move-in language explaining how to report routine maintenance and what details help.", "LivingRelay gives tenants one text-first path for routine requests.", "medium"],
  ["Vendor Invoice Collection Checklist", "vendor invoice collection checklist", "Collect invoice and closeout details consistently", "/templates/vendor-invoice-collection-checklist", "A checklist for invoice amount, vendor, work order, completion notes, photos, warranty, and payment status.", "LivingRelay tracks invoice delivery and off-platform payment status.", "low"],
  ["Maintenance Handoff Checklist", "maintenance handoff checklist property manager", "Hand off open repairs between team members", "/templates/maintenance-handoff-checklist", "A shift or portfolio handoff template for open work orders, pending approvals, vendor ETAs, and tenant follow-ups.", "LivingRelay keeps the record live so handoffs are less dependent on memory.", "low"],
  ["Work Order Status Update Template", "work order status update template", "Standardize routine repair updates", "/templates/maintenance-status-update-text-message", "Status language for tenant, owner, and internal updates across common non-emergency states.", "LivingRelay ties status updates to the repair timeline.", "low"],
  ["Non-Emergency Triage Category Examples", "non emergency maintenance triage categories", "Create internal sorting labels for maintenance", "/resources/tenant-maintenance-request-template", "Examples of routine, time-sensitive, owner approval, vendor needed, and tenant info needed categories.", "LivingRelay helps classify incoming SMS requests without making legal or safety determinations.", "medium"],
  ["Seasonal Rental Maintenance Planning Checklist", "seasonal rental maintenance checklist landlord", "Plan seasonal inspections and vendor scheduling", "/resources/landlord-maintenance-checklist", "A non-technical planning checklist for records, reminders, vendor capacity, and tenant notices.", "LivingRelay can turn seasonal findings into documented work orders.", "medium"],
  ["Tenant Maintenance Communication Templates", "tenant maintenance communication template", "Send clearer tenant maintenance messages", "/templates/maintenance-status-update-text-message", "Copy/paste wording for routine intake, clarification, scheduling, and closeout.", "LivingRelay keeps tenant communications inside the repair history.", "low"],
  ["Owner Repair Update Template", "owner repair update template", "Keep owners informed without long threads", "/templates/owner-approval-maintenance-template", "A concise owner-facing summary for status, spend, estimate, schedule, and next decision.", "LivingRelay sends owner updates with context and recordkeeping.", "low"],
  ["Small Landlord Maintenance Organization Guide", "small landlord maintenance organization", "Move from ad hoc texts to a repeatable workflow", "/resources/small-property-manager-maintenance-system", "A simple operating model for one to twenty units that need better records and less message chasing.", "LivingRelay provides the shared SMS-first workspace.", "low"],
  ["Rental Repair Access Notes Template", "rental repair access notes template", "Collect vendor entry and scheduling details", "/resources/tenant-maintenance-request-template", "A safe template for preferred windows, pets, parking, gate codes, contact method, and permission notes.", "LivingRelay asks for access details during intake and includes them in vendor scope.", "low"]
].map(([title, keyword, intent, slug, summary, angle, risk]) => ({ title, keyword, intent, slug, summary, angle, risk }));

const downloadableTemplateIdeas = [
  { name: "Tenant Maintenance Request Intake Sheet", forWhom: "Self-managing landlords and small managers", fields: "Tenant name, property, unit, issue, location, started date, photos, access windows, contact preference", cta: "Use LivingRelay to collect these fields by SMS and create a work order.", disclaimer: "For routine maintenance intake only. Immediate danger should be directed to 911 or local emergency services first." },
  { name: "After-Hours Maintenance Intake Card", forWhom: "Operators who receive nighttime texts", fields: "Issue, active now, immediate danger reminder, photo request, access notes, manager review status", cta: "Use LivingRelay to route after-hours messages into a review queue with tenant updates.", disclaimer: "Not an emergency-response protocol." },
  { name: "Owner Approval Request Template", forWhom: "Managers who need owner signoff", fields: "Issue summary, estimate, vendor, recommendation, timing, access, decision needed", cta: "Use LivingRelay to send approvals and preserve owner responses.", disclaimer: "" },
  { name: "Vendor Coordination Checklist", forWhom: "Small property managers", fields: "Trade, service area, availability, estimate range, insurance/licensing notes if normally collected, invoice contact, warranty, closeout photos", cta: "Use LivingRelay to compare vendor outreach outcomes in one work order.", disclaimer: "Does not replace your vendor qualification process." },
  { name: "Rental Maintenance Photo Checklist", forWhom: "Tenants, managers, and vendors", fields: "Wide photo, close photo, location marker, model label, surrounding area, completed work photo", cta: "Use LivingRelay to keep photos attached to the repair.", disclaimer: "Photos should only be taken from a safe location." },
  { name: "Property Maintenance Log Spreadsheet", forWhom: "Remote owners and small landlords", fields: "Date, property, unit, category, vendor, status, cost, invoice, owner notes, follow-up", cta: "Use LivingRelay when the spreadsheet becomes too much to maintain manually.", disclaimer: "" },
  { name: "Maintenance Status Update SMS Pack", forWhom: "Managers sending routine updates", fields: "Received, reviewing, need photos, vendor contacted, scheduled, delayed, closed", cta: "Use LivingRelay for automated role-aware text updates.", disclaimer: "Avoid using templates for emergencies or disputes." },
  { name: "Move-In Maintenance Expectations Handout", forWhom: "Landlords setting communication norms", fields: "How to report, what to include, photos, access windows, after-hours note, emergency reminder", cta: "Use LivingRelay as the single reporting path.", disclaimer: "Do not use as a lease clause or legal notice." },
  { name: "Vendor Invoice Collection Checklist", forWhom: "Owners and managers tracking off-platform payment", fields: "Invoice number, vendor, work order, amount, tax year, delivery recipients, paid status", cta: "Use LivingRelay to track invoice receipt and paid status.", disclaimer: "Not tax, accounting, or financial advice." },
  { name: "Maintenance Handoff Checklist", forWhom: "Managers handing off open repairs", fields: "Open requests, pending approvals, vendor ETAs, tenant replies needed, invoice follow-up", cta: "Use LivingRelay so handoffs happen from live records.", disclaimer: "" }
];

const seoArticles = [
  {
    slug: "tenant-maintenance-request-template",
    eyebrow: "Tenant Intake",
    h1: "Tenant Maintenance Request Template",
    metaTitle: "Tenant Maintenance Request Template",
    metaDescription: "Copy a practical tenant maintenance request template for rental repairs, photos, access notes, and follow-up.",
    summary: "A practical tenant maintenance request template for small landlords and property managers who want clearer repair intake.",
    keyword: "tenant maintenance request template",
    sections: [
      ["Why The Intake Template Matters", "Most maintenance confusion starts before a vendor is ever contacted. A tenant sends a short text, the manager asks two follow-up questions, the owner wants a photo, and the vendor needs the same details again. A tenant maintenance request template gives everyone a common starting point. It does not need to be formal or complicated. It simply needs to capture the facts that help a manager understand the issue, decide the next step, and keep a clean record. For small operators, the best template is plain, repeatable, and easy enough to use from a phone."],
      ["Fields To Capture Every Time", "Start with the basics: tenant name, property, unit, preferred contact method, issue location, and a short description. Then ask when the issue started, whether it is active now, and whether photos are available. For routine maintenance, access notes matter as much as the description. Ask for preferred windows, parking instructions, gate or building notes, pets, and whether the tenant wants a text before entry. Avoid asking tenants to diagnose technical systems. The goal is to collect observable details, not turn a tenant into a plumber, electrician, or HVAC technician."],
      ["A Simple Tenant-Facing Version", "Use language that sounds like a helpful operator, not a claims department. Example: “Thanks for reporting this. Please send the property/unit, where the issue is located, one close photo, one wider photo, when it started, and any access windows that work this week. If there is immediate danger, call 911 or local emergency services first.” This gives the tenant a clear next step while keeping the message safe. It also makes it easier to compare requests when several tenants text at once."],
      ["How Managers Should Use The Request", "Once the details arrive, sort the request into an operational bucket: needs more tenant information, manager review, owner approval, vendor outreach, scheduled, delayed, or closed. These are workflow labels, not legal or safety determinations. Keep the tenant updated when the request is received, when a vendor is being contacted, when scheduling changes, and when the work is complete. If you collect photos, keep them with the request so the vendor and owner do not have to ask for them again."]
    ],
    checklistTitle: "Tenant Maintenance Intake Checklist",
    checklist: ["Tenant name and contact", "Property and unit", "Issue location and short description", "When it started and whether it is active now", "Close photo and wider photo when safe", "Access windows, pets, parking, gate, or entry notes", "Status update sent to tenant"],
    cta: "LivingRelay turns this template into an SMS-first workflow: tenant intake, manager review, vendor-ready scope, owner updates, and repair records in one place.",
    faqs: [
      ["What should a tenant maintenance request include?", "It should include property, unit, issue location, short description, timing, photos when safe, access windows, and preferred contact details."],
      ["Should tenants troubleshoot repairs?", "Keep troubleshooting minimal and safe. Ask for observable details and photos, not technical repair work."],
      ["Can this be used by self-managing landlords?", "Yes. It is designed for small operators who need a repeatable intake process without a large maintenance team."],
      ["Is this legal advice?", "No. This is an operational communication template, not legal, safety, insurance, or habitability advice."]
    ],
    disclaimer: "This template is for routine maintenance coordination. It is not legal, safety, insurance, or emergency-services advice."
  },
  {
    slug: "after-hours-maintenance-request-template",
    eyebrow: "After Hours",
    h1: "After-Hours Maintenance Request Template",
    metaTitle: "After-Hours Maintenance Template",
    metaDescription: "Use a calm after-hours maintenance request template for rental intake, tenant updates, and next-business-day review.",
    summary: "A safe after-hours maintenance intake page for small rental operators who need clear information without giving emergency advice.",
    keyword: "after hours maintenance request template",
    sections: [
      ["What After-Hours Intake Should Do", "After-hours maintenance messages are stressful because the person receiving them may be tired, away from the property, or unsure how urgent the issue is. The template should do three things: remind the tenant to call 911 or local emergency services first if there is immediate danger, collect observable details, and explain when the request will be reviewed. It should not promise emergency response, make legal determinations, or tell a tenant how to repair electrical, plumbing, HVAC, gas, fire, or security systems."],
      ["The Safe Opening Line", "A useful after-hours message starts with a boundary: “If anyone is in immediate danger, call 911 or local emergency services first.” Then ask for the issue, unit, photos from a safe location, whether the problem is active now, and access notes. This keeps the operator focused on coordination, not emergency handling. For problems that are not immediate danger, the message can say the request has been received and will be reviewed according to the operator’s maintenance process."],
      ["What To Capture Before Morning", "The most useful overnight details are simple: property, unit, issue location, what the tenant sees, when it started, whether it is getting worse, whether photos are available, and whether there is a safe access window. If the issue involves active water, heat, locks, power, or anything that sounds dangerous, the operator should use their normal escalation process and professional judgment. The template should not provide DIY instructions. It should preserve the record and support the next responsible decision."],
      ["How To Follow Up", "After review, send a status update even if nothing has changed yet. Tenants mainly want to know the request was seen and what happens next. Use labels such as received, under review, vendor being contacted, scheduled, awaiting owner approval, delayed, or closed. For small operators, this simple vocabulary prevents a late-night text from becoming a long thread that nobody can reconstruct later."]
    ],
    checklistTitle: "After-Hours Intake Checklist",
    checklist: ["Immediate danger reminder included", "Tenant name, property, and unit captured", "Issue and location captured", "Active now or stopped", "Photos requested only from a safe location", "Access notes collected", "Review status sent"],
    cta: "LivingRelay helps turn after-hours texts into structured requests with tenant replies, manager review, vendor outreach, owner updates, and records attached to the property.",
    faqs: [
      ["What should an after-hours template say first?", "It should tell the tenant to call 911 or local emergency services first if there is immediate danger."],
      ["Should the template include repair instructions?", "No. Avoid DIY instructions for technical or hazardous systems. Collect details and coordinate the next step."],
      ["Can I use this for emergencies?", "This is not an emergency-response protocol. It is routine intake language with a clear emergency-services reminder."],
      ["What status updates help after hours?", "Received, under review, vendor contacted, scheduled, delayed, and closed are usually enough for routine coordination."]
    ],
    disclaimer: "This is not emergency, legal, safety, insurance, or repair advice. For immediate danger, tenants should call 911 or local emergency services first."
  },
  {
    slug: "rental-property-maintenance-log",
    eyebrow: "Records",
    h1: "Rental Property Maintenance Log",
    metaTitle: "Rental Property Maintenance Log",
    metaDescription: "Build a simple rental property maintenance log for work orders, vendors, invoices, owner notes, and status updates.",
    summary: "A practical maintenance log structure for rental owners and managers who need repair history without reconstructing text threads.",
    keyword: "rental property maintenance log",
    sections: [
      ["Why A Maintenance Log Matters", "A rental property maintenance log is less about paperwork and more about memory. Small operators often carry repair history in text messages, email threads, invoices, and mental notes. That works until a vendor asks what happened last time, an owner wants to know why a repair cost more, or a tenant reports the same issue again. A simple log gives each property a repair timeline: what was reported, what happened next, who was contacted, what was approved, what invoice arrived, and whether any follow-up remains."],
      ["Core Fields For A Useful Log", "A good log captures date reported, property, unit, issue category, description, tenant contact, photos, assigned vendor, owner approval status, estimate, invoice amount, payment status, closeout notes, and next follow-up. If you manage multiple units, add a work order ID so the repair can be referenced without exposing private details in every message. Keep the categories operational: plumbing, HVAC, electrical, appliance, access, exterior, general, and other. Avoid using the log to make legal, insurance, or code determinations unless you are adding a professional record from the appropriate source."],
      ["How Often To Update It", "Update the log when the request arrives, when the status changes, when a vendor is contacted, when an estimate or approval is received, when work is scheduled, and when the invoice is collected. That may sound like a lot, but each entry can be short. The point is not to write a novel; it is to avoid losing the decision trail. For remote owners, the log also becomes the source of truth for what is happening at a property they cannot easily inspect."],
      ["When A Spreadsheet Stops Working", "A spreadsheet is a fine starting point for one property or a few low-volume units. It becomes harder when photos, SMS updates, owner approvals, vendor notes, and invoices live somewhere else. At that point, the log may show the final status but not the proof behind it. A workflow system can keep the record closer to the communication that created it."]
    ],
    checklistTitle: "Maintenance Log Columns",
    checklist: ["Work order ID", "Date reported", "Property and unit", "Issue category", "Tenant summary", "Photos or attachments", "Vendor contacted", "Owner approval status", "Estimate and invoice", "Payment status", "Closeout notes"],
    cta: "LivingRelay keeps maintenance logs by property automatically as tenant messages, vendor updates, owner approvals, invoices, and closeout notes move through the workflow.",
    faqs: [
      ["What should I track in a rental maintenance log?", "Track date, property, unit, issue, status, vendor, estimate, approval, invoice, payment status, and follow-up notes."],
      ["Is a spreadsheet enough?", "A spreadsheet can work at low volume, but it becomes difficult when photos, texts, approvals, and invoices are scattered elsewhere."],
      ["Should I include tenant communications?", "Keep relevant operational updates with the work order so the repair history is understandable later."],
      ["Is this tax advice?", "No. This is operational recordkeeping guidance, not tax, accounting, financial, or legal advice."]
    ],
    disclaimer: "This page is for operational organization only. It is not legal, tax, accounting, insurance, or financial advice."
  },
  {
    slug: "property-manager-vendor-checklist",
    eyebrow: "Vendors",
    h1: "Property Manager Vendor Checklist",
    metaTitle: "Property Manager Vendor Checklist",
    metaDescription: "Use a vendor coordination checklist for rental maintenance outreach, availability, estimates, invoices, and closeout notes.",
    summary: "A vendor coordination checklist for small property managers who need cleaner outreach and less back-and-forth.",
    keyword: "property manager vendor checklist",
    sections: [
      ["Why Vendor Coordination Needs A Checklist", "Vendor coordination is where many rental repairs slow down. The manager has a tenant description, the vendor wants photos, the owner wants an estimate, and nobody remembers whether access instructions were sent. A vendor checklist prevents avoidable repeat calls. It does not replace your vendor qualification process, local rules, or professional judgment. It simply gives every outreach attempt the same useful packet of context."],
      ["Information To Send Before Dispatch", "Send the vendor the property, unit, issue summary, location, photos, access windows, parking or gate notes, tenant contact rules, and any known equipment model information that is safe and relevant to share. Include whether owner approval is needed before work above a threshold. For routine work, ask for service area, earliest availability, trip fee, rough range if they provide one, parts constraints, warranty or closeout notes, and where invoices should be sent."],
      ["Comparing Vendor Responses", "Small operators do not always need the cheapest option; they need the best fit for the job. Compare availability, clarity, service area, likely repeat visits, invoice process, communication quality, and whether the vendor can handle the specific property constraints. Keep notes neutral and factual. “Can arrive Tuesday morning and requested model number” is more useful than “seems better.”"],
      ["Closeout And Invoice Collection", "The job is not fully coordinated when the vendor says it is done. Ask for completion notes, invoice, any warranty note, photos when appropriate, and whether follow-up is needed. Then update the owner and tenant using a short status message. For off-platform payments, track whether the invoice was received and whether the owner or manager marked it paid."]
    ],
    checklistTitle: "Vendor Coordination Checklist",
    checklist: ["Property, unit, and issue summary", "Photos and access notes", "Trade and service area", "Earliest availability", "Trip fee or estimate signal", "Owner approval threshold", "Invoice delivery contact", "Completion notes and warranty", "Closeout photo when appropriate"],
    cta: "LivingRelay helps managers send vendor-ready scopes, compare outreach outcomes, coordinate tenant access, and keep invoice records attached to each work order.",
    faqs: [
      ["What should I send a vendor for a rental repair?", "Send a concise issue summary, location, photos, access notes, timing, approval constraints, and invoice delivery instructions."],
      ["Should I collect vendor licensing or insurance details?", "Use your normal vendor qualification process and local requirements. This checklist is only for coordination."],
      ["How should I compare vendor options?", "Compare availability, fit, clarity, access constraints, estimate signal, and closeout process, not just price."],
      ["Does LivingRelay pay vendors?", "No. Vendor repair payments remain off platform; LivingRelay tracks coordination and invoice status."]
    ],
    disclaimer: "This checklist supports operational coordination and does not replace vendor qualification, legal, insurance, licensing, or compliance review."
  },
  {
    slug: "remote-landlord-maintenance-coordination",
    eyebrow: "Remote Owners",
    h1: "Remote Landlord Maintenance Coordination",
    metaTitle: "Remote Landlord Maintenance Coordination",
    metaDescription: "A practical workflow for remote landlords coordinating tenant requests, vendors, approvals, photos, and repair records.",
    summary: "A remote landlord maintenance coordination guide for owners who need clearer repair workflows from a distance.",
    keyword: "remote landlord maintenance coordination",
    sections: [
      ["The Remote Landlord Problem", "Remote landlords often face a simple but exhausting problem: every maintenance request arrives without enough context. The owner cannot walk the property, the tenant may not know what details matter, and the vendor may not want to quote without photos or access information. A workable system gives the owner visibility without requiring them to personally manage every message. The system should collect the right details, route approvals, coordinate vendors, and preserve records."],
      ["Start With Intake And Photos", "Remote coordination depends on good intake. Ask for the issue, location, when it started, whether it is active now, one close photo, one wider photo, and any safe equipment label photo when appropriate. Ask for access windows, pets, gates, parking, and contact preferences. Do not ask tenants to perform risky diagnostics or repairs. The goal is to see enough to decide who should review or visit next."],
      ["Use Approval Thresholds", "Remote owners should decide in advance which repairs can be scheduled by a manager and which need owner approval. Keep the thresholds operational and documented. When approval is needed, send a short summary: issue, vendor, estimate, timing, access, recommendation, and decision needed. Avoid long narrative threads. The owner should be able to answer yes, no, or ask for more information with the context still attached."],
      ["Keep The Repair History Together", "The hardest part of remote ownership is not one repair; it is the fifth repair that sounds like the first. Keep prior photos, vendor notes, invoices, and closeout details with the property. That history helps avoid repeat diagnostics and gives the owner a clearer view of recurring issues. It also makes tax-season and portfolio review less painful, while staying separate from financial, legal, or insurance advice."]
    ],
    checklistTitle: "Remote Maintenance Workflow",
    checklist: ["Single tenant intake path", "Photo and access note collection", "Manager or owner review state", "Vendor outreach packet", "Owner approval summary", "Tenant status update", "Invoice and closeout record"],
    cta: "LivingRelay gives remote landlords an SMS-first workflow for tenant intake, manager review, vendor coordination, owner approvals, and property-level records.",
    faqs: [
      ["How can remote landlords handle maintenance better?", "Use a repeatable intake path, collect photos and access notes, document approvals, coordinate vendors from one record, and keep status updates simple."],
      ["What photos should remote owners request?", "Ask for a close photo, a wider room or area photo, and a safe location or model label photo only when appropriate."],
      ["How do owner approvals stay clear?", "Use short approval summaries with issue, vendor, estimate, schedule, access, and decision needed."],
      ["Is this property management legal advice?", "No. This is operational maintenance coordination guidance only."]
    ],
    disclaimer: "This guide is for operational organization. It is not legal, financial, insurance, safety, tax, or emergency-services advice."
  },
  {
    slug: "maintenance-status-update-text-message",
    eyebrow: "Status Updates",
    h1: "Maintenance Status Update Text Message Templates",
    metaTitle: "Maintenance Status Update Texts",
    metaDescription: "Copy routine maintenance status update text messages for tenants, owners, vendors, delays, scheduling, and closeout.",
    summary: "A practical guide to short maintenance status texts that reduce repeat follow-up for routine rental repairs.",
    keyword: "maintenance status update text message",
    sections: [
      ["Why Short Status Updates Work", "Most maintenance follow-up does not need a long explanation. Tenants want to know whether the request was received, what happens next, and when they should expect another update. Owners want to know whether a vendor has been contacted, whether approval is needed, and whether the invoice or closeout note has arrived. A short maintenance status text keeps the repair moving without creating a new thread that later has to be reconstructed."],
      ["Use A Small Status Vocabulary", "A simple vocabulary is easier to run than a custom message every time. Use received, reviewing, need photos, vendor contacted, scheduled, delayed, awaiting owner approval, invoice requested, and closed. These labels are operational, not legal or safety determinations. They help everyone understand where the repair sits in the process. Keep the language plain: what changed, who is responsible for the next step, and when the next update should happen."],
      ["Tenant Texts That Stay Calm", "For tenants, the best messages acknowledge the report and set the next step. Example: “Thanks, we received your request for [issue]. We are reviewing the details and will update you by [time/date].” When more information is needed, ask for one concrete thing at a time: “Could you send one close photo and one wider photo from a safe location?” Avoid repair instructions and avoid language that sounds like a legal notice, dispute response, or emergency direction."],
      ["Owner And Vendor Updates", "Owner messages should summarize decision context: issue, estimate, vendor, timing, and decision needed. Vendor messages should include property, unit, issue summary, photos, access notes, invoice delivery, and closeout expectations. A good status update gives each role what they need without exposing unnecessary information or sending the same thread to everyone."]
    ],
    checklistTitle: "Routine Status Message Checklist",
    checklist: ["Status label", "Property or unit reference", "One-sentence issue summary", "Next action owner", "Expected next update", "Photo or access request if needed", "Closeout or invoice note when complete"],
    cta: "LivingRelay sends role-aware SMS updates from the work order so tenant, owner, vendor, and manager messages stay attached to the same repair record.",
    faqs: [
      ["What maintenance statuses should I use?", "Received, reviewing, need photos, vendor contacted, scheduled, delayed, awaiting owner approval, invoice requested, and closed cover most routine workflows."],
      ["How often should tenants get updates?", "Send an update when the status changes and when a promised next-update time arrives, even if the update is simply that coordination is still in progress."],
      ["Can these texts be automated?", "Yes. LivingRelay can send routine SMS updates from work order status changes while keeping the record in one place."],
      ["Should these texts include legal language?", "No. Keep them operational and use separate professional guidance for legal notices or disputes."]
    ],
    disclaimer: "These examples are for routine operational communication only. They are not legal, safety, emergency, insurance, or repair advice."
  },
  {
    slug: "owner-approval-maintenance-template",
    eyebrow: "Owner Approval",
    h1: "Owner Approval Maintenance Template",
    metaTitle: "Owner Approval Maintenance Template",
    metaDescription: "Use an owner approval maintenance template for repair summaries, estimates, vendor context, timing, and decisions.",
    summary: "A guide to cleaner owner approval requests for routine rental repairs and vendor coordination.",
    keyword: "owner approval maintenance template",
    sections: [
      ["Why Owner Approval Requests Stall", "Small property managers often lose time because owner approvals arrive with too little context. The owner gets a vague request, asks for photos, asks who the vendor is, asks whether the tenant is available, and the manager has to pull information from several threads. A better approval request gives the owner enough detail to make the next operational decision without turning the message into a long report."],
      ["The Core Approval Summary", "Include property and unit, issue summary, tenant details or photos, vendor name, estimate or range, proposed timing, access notes, and the decision needed. Keep the decision format simple: approve, decline, or request more information. If the work is part of a recurring issue, include a short prior-history note. Do not use the approval template for legal notices, insurance claims, habitability determinations, emergency instructions, or payment disputes."],
      ["Make Recommendations Easy To Review", "A manager recommendation should be brief and factual. Example: “Recommend approving Carlos Plumbing for Tuesday afternoon because they have prior property access notes and can provide an invoice the same day.” Owners do not need every message in the chain. They need the reason for the recommendation, the known cost signal, the timing, and what happens after approval."],
      ["Preserve The Decision Trail", "The approval itself should stay attached to the work order. That matters later when an invoice arrives, a tenant asks for a status update, or the same issue comes back. A decision trail does not need to be complicated. It only needs to show what was asked, what was approved, when, and by whom."]
    ],
    checklistTitle: "Owner Approval Request Checklist",
    checklist: ["Property and unit", "Issue summary", "Photos or tenant details", "Vendor and estimate", "Schedule or access window", "Manager recommendation", "Decision requested", "Approval response recorded"],
    cta: "LivingRelay helps managers send approval-ready summaries by SMS and keeps the owner response, vendor context, and invoice closeout attached to the repair.",
    faqs: [
      ["What should an owner approval request include?", "Include issue, property, photos or context, vendor, estimate, schedule, access notes, recommendation, and the decision needed."],
      ["Should every repair need owner approval?", "That depends on your operating process. This page only helps structure the communication when approval is needed."],
      ["How should owners respond?", "Keep the response options simple: approve, decline, or request more information."],
      ["Is this financial advice?", "No. This is an operational communication template, not financial, tax, insurance, or legal advice."]
    ],
    disclaimer: "Operational communication guidance only. Not legal, financial, insurance, tax, safety, or emergency-services advice."
  },
  {
    slug: "rental-maintenance-photo-checklist",
    eyebrow: "Photos",
    h1: "Rental Maintenance Photo Checklist",
    metaTitle: "Rental Maintenance Photo Checklist",
    metaDescription: "Use a safe rental maintenance photo checklist for tenant intake, vendor scopes, owner approvals, and closeout records.",
    summary: "A safe, practical photo checklist for routine rental maintenance coordination.",
    keyword: "rental maintenance photo checklist",
    sections: [
      ["Why Photos Reduce Follow-Up", "Photos can turn a vague request into a usable maintenance record. A close photo shows the issue, a wider photo shows where it is, and an access or model label photo may help a vendor prepare. The goal is not to diagnose the repair. The goal is to reduce avoidable follow-up and give the manager, owner, or vendor enough context to choose the next coordination step."],
      ["Photos To Request", "For routine issues, ask for one close photo, one wider photo, a location photo if the area is hard to identify, and a model or label photo only when easy and safe. For vendor closeout, ask for a completion photo when appropriate. Keep the request specific so tenants do not send twenty images that are hard to sort. Also ask that photos be taken only from a safe location."],
      ["What Not To Ask For", "Do not ask anyone to climb, touch electrical equipment, move heavy objects, enter unsafe areas, handle gas, open panels, or perform technical diagnostics for a photo. Do not ask for personal documents, private belongings, or unrelated rooms. Photo requests should be narrow, safe, and tied to the maintenance issue."],
      ["Keep Photos With The Repair", "Photos are most useful when they stay attached to the work order. If they live in a text thread, email, or phone gallery, the vendor may never see them and the owner may ask for them again. A simple photo workflow keeps intake images, owner approval context, vendor scope, and closeout records together."]
    ],
    checklistTitle: "Safe Maintenance Photo Checklist",
    checklist: ["Close photo of the issue", "Wider photo showing location", "Room or area marker when useful", "Model or label photo only if safe", "Access constraint photo if relevant", "Closeout photo when appropriate", "Avoid private or unsafe images"],
    cta: "LivingRelay collects tenant maintenance photos by SMS and keeps them with the request, vendor scope, owner approval, and closeout record.",
    faqs: [
      ["What photos should tenants send for maintenance?", "Ask for one close photo, one wider location photo, and a model or label photo only when it is easy and safe."],
      ["Should tenants troubleshoot before taking photos?", "No. Ask for observable photos only. Do not ask tenants to perform repairs or technical diagnostics."],
      ["Can vendors send closeout photos?", "Yes, when appropriate. A closeout photo can help preserve the completion record."],
      ["Is this safety advice?", "No. It is an operational photo checklist. Photos should only be taken from a safe location."]
    ],
    disclaimer: "Photos should only be taken from a safe location. This page is not repair, safety, legal, or emergency advice."
  },
  {
    slug: "landlord-maintenance-checklist",
    eyebrow: "Landlord Checklist",
    h1: "Landlord Maintenance Checklist",
    metaTitle: "Landlord Maintenance Checklist",
    metaDescription: "Use a practical landlord maintenance checklist for intake, seasonal planning, vendors, logs, invoices, and tenant updates.",
    summary: "A non-technical landlord maintenance checklist for organizing recurring rental maintenance operations.",
    keyword: "landlord maintenance checklist",
    sections: [
      ["A Checklist For Operations, Not Repairs", "A useful landlord maintenance checklist should organize the work around communication and records. It should not tell someone how to repair electrical, plumbing, HVAC, gas, fire, or security systems. Small landlords need a repeatable way to receive requests, gather details, coordinate vendors, update tenants, approve spend, collect invoices, and keep a history by property."],
      ["Monthly And Seasonal Planning", "Use a planning checklist to review open work orders, vendor capacity, seasonal reminders, tenant notices, invoice follow-up, and property-level records. Keep the tasks non-technical: confirm which items need inspection, who is responsible for scheduling, what vendors may be needed, and where records will be stored. For actual repair work, use qualified professionals and your normal process."],
      ["Move-In And Move-Out Maintenance Notes", "Move-in is a good time to set expectations for routine maintenance reporting. Tell tenants how to report issues, what information helps, how photos should be sent safely, and what to do first if there is immediate danger. Do not turn the checklist into a lease clause or legal notice. Keep it as operational guidance and use the appropriate professional documents where needed."],
      ["Records That Make The Checklist Useful", "A checklist only helps if it creates records. Track what was reported, who reviewed it, what vendor was contacted, what owner decision was made, when work was scheduled, whether the invoice arrived, and whether follow-up remains. Over time, that record becomes more useful than the checklist itself."]
    ],
    checklistTitle: "Landlord Maintenance Operations Checklist",
    checklist: ["Single request intake path", "Tenant detail and photo request", "Vendor outreach list", "Owner approval process", "Status update templates", "Maintenance log", "Invoice and closeout checklist", "Seasonal planning reminders"],
    cta: "LivingRelay helps small landlords turn the checklist into an SMS-first maintenance workflow with tenant intake, vendor coordination, owner updates, and property records.",
    faqs: [
      ["What should a landlord maintenance checklist include?", "Include intake, photos, access notes, vendor outreach, owner approvals, status updates, logs, invoices, and seasonal planning reminders."],
      ["Should the checklist include DIY repair instructions?", "No. Keep the checklist operational and use qualified professionals for technical repair work."],
      ["How often should landlords review maintenance records?", "Review open requests frequently and property-level history during seasonal planning or portfolio review."],
      ["Is this legal or code-compliance advice?", "No. This is operational organization guidance only."]
    ],
    disclaimer: "This checklist is for operational organization. It is not legal, code-compliance, safety, insurance, financial, tax, emergency, or repair advice."
  },
  {
    slug: "small-property-manager-maintenance-system",
    eyebrow: "Small PM System",
    h1: "Small Property Manager Maintenance System",
    metaTitle: "Small Property Manager Maintenance System",
    metaDescription: "Build a lightweight maintenance system for tenant intake, vendors, owner approvals, status updates, and repair records.",
    summary: "A practical system for small property managers who need structure without adopting a giant enterprise platform.",
    keyword: "small property manager maintenance system",
    sections: [
      ["What A Lightweight System Needs", "A small property manager maintenance system should be easy enough to run every day. It needs one intake path, a small set of status labels, vendor outreach notes, owner approval summaries, tenant updates, and a maintenance log. It does not need a complicated portal for every participant. The system should reduce repeat explanations and make the next action obvious."],
      ["Design Around The Handoffs", "Most maintenance friction happens at handoffs: tenant to manager, manager to owner, manager to vendor, vendor back to manager, manager back to tenant, and invoice back to records. A good system makes each handoff cleaner. The tenant sends the issue, photos, and access notes. The manager reviews. The owner sees approval context. The vendor receives a scope. The tenant gets status updates. The invoice and closeout stay with the work order."],
      ["Use Labels Instead Of Long Narratives", "Labels help small teams stay aligned: needs info, reviewing, owner approval, vendor outreach, scheduled, delayed, invoice requested, closed. These are workflow states, not legal, safety, or habitability determinations. Short labels make reporting easier and reduce the urge to search every text thread when someone asks what is happening."],
      ["Know When Templates Are Not Enough", "Templates are an excellent starting point. They stop the blank-page problem and standardize routine messages. But as volume grows, copy/paste can become its own burden. When requests, photos, approvals, vendor notes, and invoices live in too many places, it is time to move the workflow into a shared system."]
    ],
    checklistTitle: "Small PM Maintenance System Components",
    checklist: ["One tenant intake channel", "Photo and access notes", "Workflow status labels", "Vendor outreach tracker", "Owner approval summary", "Tenant update templates", "Invoice closeout record", "Property maintenance log"],
    cta: "LivingRelay is the SMS-first workflow layer for small property managers: intake, triage, vendor coordination, owner approvals, tenant updates, and records together.",
    faqs: [
      ["What is a small property manager maintenance system?", "It is a repeatable process for intake, review, vendor coordination, approvals, updates, invoices, and records."],
      ["Do tenants need a portal?", "Not necessarily. LivingRelay is SMS-first so tenants can report routine requests from their phone."],
      ["When should I move beyond templates?", "When copy/paste messages, photos, approvals, and invoices become hard to track across properties."],
      ["Is this enterprise property management software?", "No. LivingRelay is built for smaller operators who need maintenance coordination without a heavy platform."]
    ],
    disclaimer: "This guide covers operational workflow design only. It is not legal, financial, insurance, safety, or emergency-services advice."
  }
];

const templatePages = [
  {
    slug: "owner-approval-maintenance-template",
    eyebrow: "Owner Approval",
    h1: "Owner Approval Maintenance Template",
    summary: "A copy/paste owner approval request for routine rental repairs.",
    template: "Hi [Owner Name], we reviewed a maintenance request for [Property/Unit].\n\nIssue: [Short issue summary]\nTenant details/photos: [Brief context]\nVendor: [Vendor name]\nEstimate/range: [Amount or range]\nSchedule: [Proposed date/window]\nAccess notes: [Access details]\nRecommendation: [Manager recommendation]\n\nPlease reply APPROVE, DECLINE, or MORE INFO.",
    sms: ["[Property/Unit]: [issue]. [Vendor] can handle it [date/window] for [estimate]. Reply APPROVE, DECLINE, or MORE INFO.", "Owner approval needed: [issue], [vendor], [estimate], [timing]. Photos and notes are in the work order."],
    email: "Subject: Approval needed for [Property/Unit] maintenance\n\nHi [Owner Name],\n\nPlease review the maintenance request below and reply with your decision.\n\n[Template details]\n\nThanks.",
    use: "Use when a manager needs owner signoff before scheduling or authorizing routine maintenance work.",
    notUse: "Do not use for legal notices, eviction matters, emergencies, insurance claims, or safety determinations.",
    disclaimer: "Operational approval template only. Not legal, financial, insurance, tax, or safety advice."
  },
  {
    slug: "maintenance-status-update-text-message",
    eyebrow: "Tenant Updates",
    h1: "Maintenance Status Update Text Message Templates",
    summary: "Routine SMS and email language for keeping tenants and owners informed.",
    template: "Received: Thanks, we received your maintenance request for [issue]. We are reviewing the details.\n\nNeed photos: Could you send one close photo and one wider photo from a safe location?\n\nVendor contacted: We are contacting a vendor for [issue] and will update you when we have a schedule.\n\nScheduled: [Vendor] is scheduled for [date/window]. Access notes: [notes].\n\nDelayed: We are still coordinating [reason]. Next update: [time/date].\n\nClosed: The work was marked complete on [date]. Reply if the same issue is still active.",
    sms: ["Thanks, we received your request for [issue]. We are reviewing it now.", "[Vendor] is scheduled for [date/window]. Please keep access available and reply with any changes.", "Update on [issue]: still coordinating [reason]. Next update by [time/date]."],
    email: "Subject: Maintenance update for [Property/Unit]\n\nHi [Name],\n\nStatus: [received/reviewing/vendor contacted/scheduled/delayed/closed]\nDetails: [short note]\nNext step: [next action]\n\nThanks.",
    use: "Use for routine maintenance status updates when the repair is moving through intake, review, scheduling, or closeout.",
    notUse: "Do not use as emergency instructions, legal notices, payment pressure, or dispute language.",
    disclaimer: "For routine operational communication only. Immediate danger should go to 911 or local emergency services first."
  },
  {
    slug: "rental-maintenance-photo-checklist",
    eyebrow: "Photos",
    h1: "Rental Maintenance Photo Checklist",
    summary: "A safe photo request template for tenants, managers, and vendors.",
    template: "Please send photos only if you can do so safely.\n\n1. One close photo of the issue.\n2. One wider photo showing where it is in the room or area.\n3. A photo of any visible label, model number, or appliance brand if easy and safe.\n4. A photo of the surrounding floor/wall/ceiling if relevant.\n5. For completed work, one final photo showing the repaired area.",
    sms: ["Could you send one close photo and one wider photo from a safe location?", "If easy and safe, please include the appliance/model label so the vendor can prepare.", "Vendor closeout: please send a completion note and one final photo if available."],
    email: "Subject: Photos for [Property/Unit] maintenance request\n\nHi [Name],\n\nWhen safe, please send the photos listed below so we can coordinate the right next step.\n\n[Template details]\n\nThanks.",
    use: "Use when photos will help clarify a routine maintenance request, vendor scope, or closeout record.",
    notUse: "Do not ask anyone to enter unsafe areas, touch electrical equipment, climb, move heavy items, or photograph private personal information.",
    disclaimer: "Photos should only be taken from a safe location. This is not repair or safety advice."
  },
  {
    slug: "vendor-invoice-collection-checklist",
    eyebrow: "Invoices",
    h1: "Vendor Invoice Collection Checklist",
    summary: "A closeout checklist for collecting vendor invoices and maintenance records.",
    template: "Work order: [ID]\nProperty/unit: [Property/Unit]\nVendor: [Vendor]\nWork completed: [Short completion note]\nCompletion date: [Date]\nInvoice number: [Number]\nInvoice amount: [Amount]\nInvoice sent to: [Manager/owner/email]\nWarranty or follow-up notes: [Notes]\nPayment status: [Unpaid/Paid off platform/Needs review]",
    sms: ["Thanks for the update. Please send the invoice for [Property/Unit] to [email/contact].", "Closeout request: please include completion date, invoice amount, and any warranty or follow-up note.", "Invoice received for [work order]. Payment is tracked off platform."],
    email: "Subject: Invoice request for [Property/Unit]\n\nHi [Vendor],\n\nPlease send the invoice and closeout details for the completed work below.\n\n[Template details]\n\nThanks.",
    use: "Use after routine maintenance work is completed and the operator needs invoice and closeout records.",
    notUse: "Do not use as tax advice, accounting advice, collections language, or a substitute for your payment process.",
    disclaimer: "Operational invoice tracking only. Not tax, accounting, financial, or legal advice."
  },
  {
    slug: "maintenance-handoff-checklist",
    eyebrow: "Handoff",
    h1: "Maintenance Handoff Checklist",
    summary: "A property manager handoff template for open routine maintenance work.",
    template: "Handoff date/time: [Date]\nPrepared by: [Name]\n\nOpen requests:\n- [Work order] - [status] - [next action]\n\nPending owner approvals:\n- [Issue] - [owner] - [decision needed]\n\nVendor coordination:\n- [Vendor] - [ETA/status] - [contact notes]\n\nTenant follow-ups:\n- [Tenant/unit] - [message needed]\n\nInvoices/closeout:\n- [Vendor/work order] - [invoice or closeout status]",
    sms: ["Handoff note: [work order] is [status]. Next action: [next action].", "Pending approval: [owner] needs to decide on [issue/estimate].", "Tenant follow-up needed for [unit]: [message]."],
    email: "Subject: Maintenance handoff for [Property/Portfolio]\n\nHi [Name],\n\nHere is the current maintenance handoff.\n\n[Template details]\n\nThanks.",
    use: "Use when a manager, assistant, owner, or teammate needs to take over open repair coordination.",
    notUse: "Do not use for sensitive tenant disputes, legal notices, protected-class information, or emergency instructions.",
    disclaimer: "Operational handoff template only. Keep sensitive information out unless there is a legitimate workflow need."
  },
  {
    slug: "tenant-maintenance-request-intake-sheet",
    eyebrow: "Tenant Intake",
    h1: "Tenant Maintenance Request Intake Sheet",
    summary: "A copy/paste intake sheet for routine tenant maintenance requests.",
    template: "Request received: [Date/time]\nTenant: [Name]\nProperty/unit: [Property/Unit]\nPreferred contact: [Phone/email]\nIssue location: [Room/area]\nIssue summary: [What the tenant observes]\nWhen it started: [Date/time/unknown]\nActive now: [Yes/No/Unknown]\nPhotos received: [Yes/No]\nAccess windows: [Preferred windows]\nPets/parking/gate notes: [Notes]\nNext status: [Review/vendor/owner approval/need info]",
    sms: ["Thanks for reporting this. Please send the property/unit, issue location, when it started, photos from a safe location, and access windows.", "We received your request and are reviewing the details. We will update you by [time/date]."],
    email: "Subject: Maintenance request intake for [Property/Unit]\n\nHi [Name],\n\nPlease send the details below so we can coordinate the next step.\n\n[Template details]\n\nThanks.",
    use: "Use when a tenant reports a routine maintenance issue and the manager needs enough context to review or contact a vendor.",
    notUse: "Do not use for emergencies, legal notices, lease disputes, protected-class information, or technical repair instructions.",
    disclaimer: "Routine maintenance intake only. If there is immediate danger, call 911 or local emergency services first."
  },
  {
    slug: "after-hours-maintenance-intake-card",
    eyebrow: "After Hours",
    h1: "After-Hours Maintenance Intake Card",
    summary: "A short after-hours intake card for non-emergency maintenance messages.",
    template: "If anyone is in immediate danger, call 911 or local emergency services first.\n\nProperty/unit: [Property/Unit]\nIssue: [Short description]\nLocation: [Room/area]\nActive now: [Yes/No/Unknown]\nPhotos from safe location: [Yes/No]\nAccess notes: [Windows/gate/pets/parking]\nReceived at: [Time]\nReview status: [Queued/reviewing/vendor contacted/owner approval needed]\nNext update by: [Time/date]",
    sms: ["If anyone is in immediate danger, call 911 or local emergency services first. For this request, please send property/unit, issue, photos from a safe location, and access notes.", "We received your after-hours maintenance message. It is queued for review and we will update you by [time/date]."],
    email: "Subject: After-hours maintenance intake for [Property/Unit]\n\nHi [Name],\n\nWe received the after-hours maintenance message below.\n\n[Template details]\n\nThanks.",
    use: "Use for after-hours routine maintenance intake when the operator needs a safe record and a clear review state.",
    notUse: "Do not use as an emergency-response protocol, DIY repair instructions, legal notice, or safety determination.",
    disclaimer: "Not emergency-services, safety, legal, insurance, or repair advice. Immediate danger should go to 911 or local emergency services first."
  },
  {
    slug: "vendor-coordination-request-template",
    eyebrow: "Vendor Outreach",
    h1: "Vendor Coordination Request Template",
    summary: "A vendor outreach template for routine rental maintenance coordination.",
    template: "Hi [Vendor], can you review availability for this rental maintenance request?\n\nProperty/unit: [Property/Unit]\nIssue: [Short issue summary]\nPhotos: [Attached/available]\nAccess windows: [Windows]\nParking/gate/pet notes: [Notes]\nRequested timing: [Timing]\nApproval note: [Owner approval needed above threshold, if applicable]\nInvoice delivery: [Email/contact]\nCloseout request: Please send completion notes, invoice, and any warranty or follow-up notes.",
    sms: ["Vendor request for [Property/Unit]: [issue]. Photos/access notes available. Are you available [timing]?", "For closeout, please send completion note, invoice, and any warranty or follow-up note for [work order]."],
    email: "Subject: Vendor request for [Property/Unit]\n\nHi [Vendor],\n\nCan you review availability for the request below?\n\n[Template details]\n\nThanks.",
    use: "Use when contacting a vendor with the context needed to evaluate availability for a routine repair.",
    notUse: "Do not use as a replacement for vendor qualification, licensing review, insurance review, or compliance requirements.",
    disclaimer: "Operational coordination only. Use your normal vendor qualification process."
  },
  {
    slug: "property-maintenance-log-template",
    eyebrow: "Records",
    h1: "Property Maintenance Log Template",
    summary: "A simple copy/paste maintenance log format for rental repairs.",
    template: "Work order ID: [ID]\nDate reported: [Date]\nProperty/unit: [Property/Unit]\nCategory: [General category]\nTenant summary: [Short summary]\nPhotos/attachments: [Links/notes]\nStatus: [Received/reviewing/vendor/approval/scheduled/closed]\nVendor: [Vendor]\nOwner approval: [Needed/approved/not needed]\nEstimate/invoice: [Amount or note]\nPayment status: [Off-platform status]\nCloseout notes: [Notes]\nFollow-up date: [Date/none]",
    sms: ["Log update for [Property/Unit]: [issue] is now [status]. Next action: [next action].", "Closeout logged for [work order]: invoice [received/not received], follow-up [needed/not needed]."],
    email: "Subject: Maintenance log update for [Property/Unit]\n\nHi [Name],\n\nHere is the current maintenance log update.\n\n[Template details]\n\nThanks.",
    use: "Use when tracking routine maintenance history for a property or portfolio.",
    notUse: "Do not use as tax, accounting, financial, insurance, legal, or code-compliance advice.",
    disclaimer: "Operational recordkeeping template only. Not tax, accounting, legal, financial, insurance, or compliance advice."
  },
  {
    slug: "move-in-maintenance-expectations-template",
    eyebrow: "Move-In",
    h1: "Move-In Maintenance Expectations Template",
    summary: "Friendly move-in language for routine maintenance reporting expectations.",
    template: "Welcome to [Property/Unit]. For routine maintenance, please report issues by [preferred channel]. Helpful details include the issue location, what you observe, when it started, photos from a safe location, and access windows.\n\nFor immediate danger, call 911 or local emergency services first. This maintenance channel is for routine coordination and follow-up.\n\nWhen we receive a request, we will review the details, ask for any missing information, coordinate the next step, and send status updates as the request moves forward.",
    sms: ["For routine maintenance, text [number] with property/unit, issue location, photos from a safe location, and access windows.", "If there is immediate danger, call 911 or local emergency services first. Routine maintenance requests can be sent to [channel]."],
    email: "Subject: How to report routine maintenance at [Property/Unit]\n\nHi [Name],\n\nWelcome. Here is how to report routine maintenance during your tenancy.\n\n[Template details]\n\nThanks.",
    use: "Use at move-in to explain how routine maintenance requests should be reported and what details help.",
    notUse: "Do not use as a lease clause, legal notice, emergency protocol, rent collection message, or dispute communication.",
    disclaimer: "Operational move-in communication only. Not legal, lease, safety, emergency, or habitability advice."
  }
];

function publicSitePageFor(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized.startsWith("/resources/")) {
    return seoArticles.some((article) => `/resources/${article.slug}` === normalized) ? "seoArticle" : null;
  }
  if (normalized.startsWith("/templates/")) {
    return templatePages.some((template) => `/templates/${template.slug}` === normalized) ? "templatePage" : null;
  }
  if (normalized.startsWith("/property-maintenance/")) {
    return propertyMaintenanceCities.some((city) => `/property-maintenance/${city.slug}` === normalized) ? "maintenanceCity" : null;
  }
  return publicSitePages[normalized] || null;
}

function seoArticleFor(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return seoArticles.find((article) => `/resources/${article.slug}` === normalized) || null;
}

function templatePageFor(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return templatePages.find((template) => `/templates/${template.slug}` === normalized) || null;
}

function propertyMaintenanceCityFor(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return propertyMaintenanceCities.find((city) => `/property-maintenance/${city.slug}` === normalized) || null;
}

function absoluteUrl(pathname = window.location.pathname) {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${siteOrigin}${path}`;
}

function setMetaTag(selector, attrs) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    document.head.appendChild(tag);
  }
  Object.entries(attrs).forEach(([name, value]) => tag.setAttribute(name, value));
}

function setLinkTag(rel, href) {
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

function applyPublicSeo(content, page, cityArticle) {
  const url = absoluteUrl(window.location.pathname);
  const title = content.metaTitle || `${content.title} | LivingRelay`;
  const description = content.metaDescription || content.summary;

  document.title = title;
  setLinkTag("canonical", url);
  setMetaTag('meta[name="description"]', { name: "description", content: description });
  setMetaTag('meta[name="robots"]', { name: "robots", content: "index, follow" });
  setMetaTag('meta[property="og:title"]', { property: "og:title", content: title });
  setMetaTag('meta[property="og:description"]', { property: "og:description", content: description });
  setMetaTag('meta[property="og:url"]', { property: "og:url", content: url });
  setMetaTag('meta[property="og:type"]', { property: "og:type", content: ["maintenanceCity", "seoArticle", "templatePage"].includes(page) ? "article" : "website" });
  setMetaTag('meta[name="twitter:title"]', { name: "twitter:title", content: title });
  setMetaTag('meta[name="twitter:description"]', { name: "twitter:description", content: description });

  if (cityArticle) {
    setMetaTag('meta[name="keywords"]', {
      name: "keywords",
      content: `${cityArticle.city} property maintenance, ${cityArticle.city} rental repairs, property manager maintenance software, tenant repair requests, vendor coordination`
    });
  }
}

function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

function publicJsonLd(page, content, cityArticle) {
  const url = absoluteUrl();
  const base = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "LivingRelay",
      url: siteOrigin,
      email: "support@livingrelay.com"
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "LivingRelay",
      url: siteOrigin,
      description: "SMS-first rental repair coordination software for small property operators."
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "LivingRelay", item: `${siteOrigin}/marketing` },
        { "@type": "ListItem", position: 2, name: content.title, item: url }
      ]
    }
  ];

  if (page === "marketing" || page === "about") {
    base.push({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "LivingRelay",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS",
      url,
      description: content.summary,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "$0 per property, with coordination fees charged only when a vendor dispatch is booked."
      },
      audience: {
        "@type": "Audience",
        audienceType: "Small rental property managers and rental property owners"
      },
      featureList: [
        "Tenant SMS repair intake",
        "Property maintenance work orders",
        "Manager and owner approval workflows",
        "Vendor coordination",
        "Invoice and tax-year repair records"
      ]
    });
    base.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: productFaqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer }
      }))
    });
  }

  if (["maintenanceCity", "seoArticle", "templatePage"].includes(page) && (cityArticle || content)) {
    base.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: content.title,
      description: content.summary,
      author: { "@type": "Organization", name: "LivingRelay" },
      publisher: { "@type": "Organization", name: "LivingRelay" },
      mainEntityOfPage: url,
      articleSection: page === "templatePage" ? "Maintenance templates" : "Property maintenance",
      about: [
        cityArticle ? `${cityArticle.city} property maintenance` : "rental maintenance coordination",
        "rental repairs",
        "tenant maintenance requests",
        "vendor coordination"
      ]
    });
  }

  if (page === "maintenanceIndex" || page === "resourceIndex") {
    base.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: content.title,
      description: content.summary,
      hasPart: (page === "resourceIndex" ? [...seoArticles.map((article) => ({ title: article.h1, url: `${siteOrigin}/resources/${article.slug}` })), ...templatePages.map((template) => ({ title: template.h1, url: `${siteOrigin}/templates/${template.slug}` }))] : propertyMaintenanceCities.map((city) => ({ title: city.title, url: `${siteOrigin}/property-maintenance/${city.slug}` }))).map((item) => ({
        "@type": "Article",
        name: item.title,
        url: item.url
      }))
    });
  }

  return base;
}

const routeRoles = {
  admin: "Site Admin",
  dashboard: "Dashboard",
  manager: "Manager",
  owner: "Owner",
  resident: "Tenant",
  tenant: "Tenant",
  vendor: "Vendor"
};

const roleRoutes = {
  "Site Admin": "admin",
  Manager: "manager",
  Owner: "owner",
  Tenant: "resident",
  Vendor: "vendor"
};

function parseDashboardRoute(pathname = window.location.pathname) {
  const [roleSegment = "", pageSegment = ""] = pathname.split("/").filter(Boolean);
  const role = routeRoles[roleSegment.toLowerCase()];
  if (!role) return null;
  return { role, page: pageSegment.toLowerCase() || "dashboard" };
}

function sectionFromRoutePage(role, page) {
  if (role === "Dashboard") {
    return ["account", "delete-account", "delete-data", "profile", "settings"].includes(page) ? "account" : "dashboard";
  }
  if (role === "Site Admin") {
    return {
      dashboard: "accounts",
      accounts: "accounts",
      customers: "accounts",
      prospecting: "prospecting",
      prospects: "prospecting",
      access: "accessRequests",
      referrals: "accessRequests",
      "access-requests": "accessRequests",
      people: "directory",
      directory: "directory",
      properties: "properties",
      support: "workOrders",
      "work-orders": "workOrders",
      qa: "qa",
      billing: "billing",
      revenue: "billing",
      integrations: "integrations",
      pms: "integrations",
      diagnostics: "diagnostics",
      audit: "audit"
    }[page] || "accounts";
  }
  if (["Manager", "Owner"].includes(role)) {
    if (page === "billing") return "billing";
    if (["account", "delete-account", "delete-data", "profile", "settings"].includes(page)) return "account";
    if (["team", "vendors"].includes(page)) return "team";
    return "operations";
  }
  if (["account", "delete-account", "delete-data", "profile", "settings"].includes(page)) return "account";
  return "dashboard";
}

function pageFromSection(role, section) {
  if (role === "Site Admin") {
    return {
      accounts: "dashboard",
      prospecting: "prospecting",
      accessRequests: "access",
      directory: "people",
      properties: "properties",
      workOrders: "support",
      qa: "qa",
      billing: "revenue",
      integrations: "integrations",
      diagnostics: "diagnostics",
      audit: "audit"
    }[section] || "dashboard";
  }
  if (["Manager", "Owner"].includes(role)) {
    if (section === "billing") return "billing";
    if (section === "team") return "team";
    if (section === "account") return "account";
    return "dashboard";
  }
  if (section === "account") return "account";
  return "dashboard";
}

function dashboardPathFor(role, section = "operations") {
  const roleSegment = roleRoutes[role] || "manager";
  return `/${roleSegment}/${pageFromSection(role, section)}`;
}

function buildDashboardUrl(role, section, { propertyId, orderId } = {}) {
  const params = new URLSearchParams(window.location.search);
  params.delete("console");
  params.delete("section");
  if (propertyId) params.set("property", propertyId);
  else params.delete("property");
  if (orderId) params.set("review", orderId);
  else params.delete("review");
  const query = params.toString();
  return `${dashboardPathFor(role, section)}${query ? `?${query}` : ""}${window.location.hash}`;
}

function signedOutUrl() {
  if (window.location.hostname.toLowerCase() === "admin.livingrelay.com" || window.location.pathname.startsWith("/admin")) {
    return "/admin";
  }
  return "/";
}

function normalizedPhoneDigits(value = "") {
  return String(value).replace(/\D/g, "").slice(-10);
}

function formatPhoneInput(value = "") {
  const digits = normalizedPhoneDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatPinInput(value = "") {
  return String(value).replace(/\D/g, "").slice(0, 4);
}

function formatVerificationCodeInput(value = "") {
  return String(value).replace(/\D/g, "").slice(0, 6);
}

function twilioSenderLabel(twilio) {
  if (!twilio) return "";
  if (twilio.senderMode === "messaging_service" && twilio.messagingServiceSid) return `Messaging Service ${twilio.messagingServiceSid}`;
  return twilio.from || "configured sender";
}

let transitPublicKeyPromise;
const contactTransitFields = [
  "phone",
  "pin",
  "password",
  "managerPhone",
  "ownerPhone",
  "vendorPhone",
  "recipientPhone",
  "testVendorPhone",
  "to",
  "email",
  "ownerEmail",
  "managerEmail",
  "recipientEmail",
  "referredEmail"
];

function base64ToBytes(value) {
  return Uint8Array.from(window.atob(value), (character) => character.charCodeAt(0));
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

async function getTransitPublicKey({ refresh = false } = {}) {
  if (refresh) transitPublicKeyPromise = undefined;
  if (!transitPublicKeyPromise) {
    transitPublicKeyPromise = fetch("/api/encryption/public-key")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load encryption key.");
        const key = await response.json();
        const cryptoKey = await window.crypto.subtle.importKey(
          "spki",
          base64ToBytes(key.publicKey),
          { name: "RSA-OAEP", hash: "SHA-256" },
          false,
          ["encrypt"]
        );
        return { ...key, cryptoKey };
      });
  }
  return transitPublicKeyPromise;
}

async function encryptTransitFields(payload, fields) {
  if (!window.crypto?.subtle) return payload;
  const sensitiveEntries = fields
    .filter((field) => Object.prototype.hasOwnProperty.call(payload, field))
    .filter((field) => payload[field] !== undefined && payload[field] !== null && String(payload[field]) !== "");
  if (!sensitiveEntries.length) return payload;

  const key = await getTransitPublicKey();
  const encryptedFields = {};
  for (const field of sensitiveEntries) {
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      key.cryptoKey,
      new TextEncoder().encode(String(payload[field]))
    );
    encryptedFields[field] = {
      alg: key.alg,
      keyId: key.keyId,
      ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    };
  }
  return {
    ...payload,
    ...Object.fromEntries(sensitiveEntries.map((field) => [field, ""])),
    _encryptedFields: encryptedFields
  };
}

async function encryptContactTransitFields(payload) {
  return encryptTransitFields(payload, contactTransitFields);
}

async function encryptedJsonFetch(url, { payload, fields = contactTransitFields, headers = {}, ...options } = {}) {
  const send = async () => fetch(url, {
    ...options,
    method: options.method || "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(await encryptTransitFields(payload, fields))
  });

  let response = await send();
  if (await responseHasStaleTransitKey(response)) {
    await getTransitPublicKey({ refresh: true });
    response = await send();
  }
  return response;
}

async function responseHasStaleTransitKey(response) {
  if (response.ok) return false;
  try {
    const data = await response.clone().json();
    return /Invalid encrypted field envelope|Could not decrypt encrypted field/i.test(data?.error || "");
  } catch {
    return false;
  }
}

function samePhone(left = "", right = "") {
  const leftDigits = normalizedPhoneDigits(left);
  const rightDigits = normalizedPhoneDigits(right);
  return Boolean(leftDigits && rightDigits && leftDigits === rightDigits);
}

function addUniqueValues(values = [], nextValues = []) {
  return Array.from(new Set([...(values || []), ...(nextValues || []).filter(Boolean)]));
}

function buildPhoneIdentityUser(person, people = []) {
  if (!person?.phone || person.role === "Site Admin") return person;
  const phonePeople = people.filter((candidate) => (
    candidate.role !== "Site Admin"
    && samePhone(candidate.phone, person.phone)
    && String(candidate.pin || "") === String(person.pin || "")
  ));
  return phonePeople.reduce((identity, candidate) => ({
    ...identity,
    propertyIds: addUniqueValues(identity.propertyIds, candidate.propertyIds),
    managesPropertyIds: addUniqueValues(identity.managesPropertyIds, candidate.managesPropertyIds),
    accountIds: addUniqueValues(identity.accountIds, candidate.accountIds),
    pins: addUniqueValues(identity.pins, candidate.pin ? [candidate.pin] : []),
    phoneIdentityPersonIds: addUniqueValues(identity.phoneIdentityPersonIds, [candidate.id])
  }), {
    ...person,
    propertyIds: person.propertyIds || [],
    managesPropertyIds: person.managesPropertyIds || [],
    accountIds: person.accountIds || [],
    pins: person.pin ? [person.pin] : [],
    phoneIdentityPersonIds: [person.id]
  });
}

function accessiblePropertyIdsForPerson(person) {
  return addUniqueValues(person?.propertyIds || [], person?.managesPropertyIds || []);
}

function normalizePropertyAddressForMatch(value = "") {
  const streetAliases = [
    ["avenue", "ave"],
    ["street", "st"],
    ["road", "rd"],
    ["boulevard", "blvd"],
    ["drive", "dr"],
    ["lane", "ln"],
    ["court", "ct"],
    ["place", "pl"],
    ["terrace", "ter"],
    ["circle", "cir"]
  ];
  let normalized = String(value || "")
    .toLowerCase()
    .split(",")[0]
    .replace(/\b(?:apartment|apt|unit|suite|ste|#)\s*[a-z0-9-]+\b/g, " ");
  for (const [longForm, shortForm] of streetAliases) {
    normalized = normalized.replace(new RegExp(`\\b${longForm}\\b`, "g"), shortForm);
  }
  return normalized
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function findPropertyAddressOverlapGroups(propertiesList = []) {
  const groupsByKey = new Map();
  for (const property of propertiesList) {
    const key = normalizePropertyAddressForMatch(property.address);
    if (!key || !/\d/.test(key)) continue;
    const scopedKey = `${property.accountId || "unassigned"}:${key}`;
    const group = groupsByKey.get(scopedKey) || { key, displayAddress: property.address || key, accountId: property.accountId || "", properties: [] };
    if (!group.properties.some((item) => item.id === property.id)) group.properties.push(property);
    groupsByKey.set(scopedKey, group);
  }
  return Array.from(groupsByKey.values())
    .filter((group) => group.properties.length > 1)
    .sort((left, right) => right.properties.length - left.properties.length || left.key.localeCompare(right.key));
}

function defaultPropertyIdForLogin(person, propertiesList = []) {
  if (!person) return propertiesList[0]?.id;
  if (person.role === "Site Admin") return propertiesList[0]?.id;
  const accessiblePropertyIds = accessiblePropertyIdsForPerson(person);
  const requestedPropertyId = new URLSearchParams(window.location.search).get("property");
  if (requestedPropertyId && accessiblePropertyIds.includes(requestedPropertyId)) return requestedPropertyId;
  return accessiblePropertyIds[0] || propertiesList[0]?.id;
}

function classifyIssue(text) {
  const body = text.toLowerCase();
  const trade = ["water", "sink", "toilet", "leak", "drip", "faucet", "shower", "drain", "pipe", "garbage disposal"].some((word) => body.includes(word))
    ? "Plumbing"
    : body.includes("heat") || body.includes("ac") || body.includes("thermostat")
      ? "HVAC"
      : body.includes("spark") || body.includes("outlet") || body.includes("power")
        ? "Electrical"
        : "General";
  const urgent = ["leak", "active water", "gas", "spark", "no heat", "no lock", "flood"].some((word) => body.includes(word));
  return {
    trade,
    severity: urgent ? "Urgent" : "Normal",
    estimate: trade === "Plumbing" ? 325 : trade === "HVAC" ? 425 : trade === "Electrical" ? 185 : 145
  };
}

function isActiveWorkOrder(order) {
  const status = (order?.status || "").toLowerCase();
  return !["closed", "completed", "resolved", "tenant resolved", "demo completed", "cancelled", "canceled"].some((closedStatus) => status === closedStatus);
}

function hasDemoOrTestMarker(record) {
  const text = [
    record?.id,
    record?.status,
    record?.source,
    record?.note,
    record?.documentName,
    record?.demoFlow ? "demoFlow" : "",
    record?.demoOutreach ? "demoOutreach" : ""
  ].join(" ").toLowerCase();
  return /\b(demo|sample|smoke)\b/.test(text) || text.includes("test invoice from local endpoint");
}

function isLiveDashboardWorkOrder(order) {
  if (!order || hasDemoOrTestMarker(order)) return false;
  const timelineText = (order.timeline || []).map((item) => `${item.label || ""} ${item.detail || ""}`).join(" ").toLowerCase();
  return !/\b(demo|sample|smoke)\b/.test(timelineText);
}

function namesMatch(a = "", b = "") {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function hasLiveVendorOutcome(order, vendor) {
  return (order?.vendorOutreach?.outcomes || []).some((outcome) => {
    const source = (outcome.source || "").toLowerCase();
    const liveSource = outcome.conversationId || outcome.callSid || source === "elevenlabs";
    return liveSource && (!vendor || namesMatch(outcome.vendorName, vendor.name));
  });
}

function isLiveInvoice(invoice, liveOrders) {
  if (!invoice || hasDemoOrTestMarker(invoice)) return false;
  if (invoice.source === "owner_upload") return true;
  const order = liveOrders.find((item) => item.id === invoice.orderId);
  return Boolean(order);
}

function formatPlaceAddress(place) {
  return place?.formatted_address || place?.formattedAddress || place?.name || place?.displayName?.text || "";
}

function formatPlaceName(place, prediction) {
  return place?.displayName?.text || place?.name || prediction?.mainText || prediction?.description || "";
}

function formatPropertyNameFromAddress(place, prediction) {
  const address = formatPlaceAddress(place) || prediction?.description || "";
  return formatPlaceName(place, prediction) || address.split(",")[0]?.trim() || "";
}

function propertyLocationLabel(property) {
  return property?.address || property?.name || "Property address";
}

function GooglePlacesAddressInput({ value, onChange, onPlaceSelect, placeholder, required = false, autoComplete = "street-address", selectedValueForPrediction }) {
  const inputRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const requestIdRef = useRef(0);
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [predictionError, setPredictionError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onChange, onPlaceSelect]);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3) {
      setPredictions([]);
      setPredictionError("");
      return undefined;
    }

    let cancelled = false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timer = window.setTimeout(() => {
      fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`)
        .then(async (response) => {
          const data = await response.json().catch(() => ({ predictions: [] }));
          return response.ok ? data : { predictions: [], error: data.error || "Address autocomplete is unavailable" };
        })
        .then((data) => {
          if (cancelled || requestId !== requestIdRef.current) return;
          setPredictions(Array.isArray(data.predictions) ? data.predictions : []);
          setPredictionError(data.error || "");
        })
        .catch(() => {
          if (!cancelled && requestId === requestIdRef.current) {
            setPredictions([]);
            setPredictionError("Address autocomplete is unavailable");
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  async function selectPrediction(prediction) {
    const fallbackAddress = prediction.description || "";
    onChangeRef.current(selectedValueForPrediction?.(prediction) || fallbackAddress);
    setPredictions([]);
    setShowPredictions(false);

    if (!prediction.placeId) {
      onPlaceSelectRef.current?.({ formatted_address: fallbackAddress, name: prediction.mainText || fallbackAddress }, prediction);
      return;
    }

    try {
      const response = await fetch(`/api/places/${encodeURIComponent(prediction.placeId)}`);
      const place = response.ok ? await response.json() : null;
      const address = formatPlaceAddress(place) || fallbackAddress;
      if (address && !selectedValueForPrediction) onChangeRef.current(address);
      onPlaceSelectRef.current?.(place || { formatted_address: fallbackAddress, name: prediction.mainText || fallbackAddress }, prediction);
    } catch {
      onPlaceSelectRef.current?.({ formatted_address: fallbackAddress, name: prediction.mainText || fallbackAddress }, prediction);
    }
  }

  return (
    <span className="places-autocomplete">
      <input
        ref={inputRef}
        required={required}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setShowPredictions(true);
        }}
        onBlur={() => window.setTimeout(() => setShowPredictions(false), 120)}
        onFocus={() => setShowPredictions(true)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {showPredictions && predictions.length > 0 && (
        <span className="places-menu">
          {predictions.map((prediction) => (
            <button type="button" key={prediction.placeId} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPrediction(prediction)}>
              <span>{prediction.mainText || prediction.description}</span>
              <small>{prediction.secondaryText || "United States"}</small>
            </button>
          ))}
          <em>Powered by Google</em>
        </span>
      )}
      {showPredictions && predictionError && <small className="places-error">{predictionError}</small>}
    </span>
  );
}

function VendorAutocompleteInput({ value, onChange, onVendorSelect, trade = "", propertyId = "", placeholder = "Vendor name", required = false }) {
  const requestIdRef = useRef(0);
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [predictionError, setPredictionError] = useState("");

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setPredictions([]);
      setPredictionError("");
      return undefined;
    }
    let cancelled = false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ input: query });
      if (trade) params.set("trade", trade);
      if (propertyId) params.set("propertyId", propertyId);
      fetch(`/api/vendors/autocomplete?${params}`)
        .then(async (response) => {
          const data = await response.json().catch(() => ({ predictions: [] }));
          return response.ok ? data : { predictions: [], error: data.error || "Vendor autocomplete is unavailable" };
        })
        .then((data) => {
          if (cancelled || requestId !== requestIdRef.current) return;
          setPredictions(Array.isArray(data.predictions) ? data.predictions : []);
          setPredictionError(data.error || "");
        })
        .catch(() => {
          if (!cancelled && requestId === requestIdRef.current) {
            setPredictions([]);
            setPredictionError("Vendor autocomplete is unavailable");
          }
        });
    }, 160);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, trade, propertyId]);

  async function selectPrediction(prediction) {
    let vendor = {
      name: prediction.name || prediction.description || value,
      trade: prediction.trade || trade || "General",
      phone: prediction.phone || "",
      source: prediction.source,
      placeId: prediction.placeId || ""
    };
    onChange(vendor.name);
    setPredictions([]);
    setShowPredictions(false);
    if (prediction.source === "google" && prediction.placeId) {
      try {
        const response = await fetch(`/api/places/${encodeURIComponent(prediction.placeId)}`);
        const place = response.ok ? await response.json() : null;
        vendor = {
          ...vendor,
          name: place?.name || vendor.name,
          phone: place?.nationalPhoneNumber || place?.internationalPhoneNumber || vendor.phone,
          trade: inferTradeFromGoogleTypes(place?.types || [], trade),
          websiteUri: place?.websiteUri || "",
          address: place?.formatted_address || ""
        };
        onChange(vendor.name);
      } catch {
        // Keep the prediction-level fields when details are unavailable.
      }
    }
    onVendorSelect?.(vendor);
  }

  return (
    <span className="places-autocomplete vendor-autocomplete">
      <input
        required={required}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setShowPredictions(true);
        }}
        onBlur={() => window.setTimeout(() => setShowPredictions(false), 140)}
        onFocus={() => setShowPredictions(true)}
        placeholder={placeholder}
        autoComplete="organization"
      />
      {showPredictions && predictions.length > 0 && (
        <span className="places-menu">
          {predictions.map((prediction, index) => (
            <button type="button" key={`${prediction.source}-${prediction.id || prediction.placeId || index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPrediction(prediction)}>
              <span>{prediction.name || prediction.description}</span>
              <small>{prediction.source === "local" ? "Saved vendor" : "Google business"}{prediction.description ? ` · ${prediction.description}` : ""}</small>
            </button>
          ))}
          <em>Saved vendors first; Google when configured</em>
        </span>
      )}
      {showPredictions && predictionError && <small className="places-error">{predictionError}</small>}
    </span>
  );
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

function normalizeVendorPreference(entry, trade = "General") {
  if (typeof entry === "string") {
    return { name: entry.trim(), trade };
  }
  return {
    name: String(entry?.name || entry?.businessName || "").trim(),
    trade: String(entry?.trade || trade || "General").trim(),
    phone: String(entry?.phone || "").trim(),
    address: String(entry?.address || entry?.formattedAddress || "").trim(),
    websiteUri: String(entry?.websiteUri || entry?.website || "").trim(),
    placeId: String(entry?.placeId || entry?.place_id || "").trim(),
    source: String(entry?.source || "").trim()
  };
}

function normalizeVendorPreferences(preferences = {}) {
  return ["Plumbing", "HVAC", "Electrical", "Painting", "General"].reduce((normalized, trade) => {
    const seen = new Set();
    normalized[trade] = (Array.isArray(preferences?.[trade]) ? preferences[trade] : [])
      .map((entry) => normalizeVendorPreference(entry, trade))
      .filter((entry) => entry.name)
      .filter((entry) => {
        const key = `${entry.name}:${entry.phone}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return normalized;
  }, {});
}

function vendorPreferenceSummary(vendor) {
  return [vendor.phone, vendor.address, vendor.source === "google" ? "Google Business Profile" : vendor.source].filter(Boolean).join(" · ");
}

function isTenantVisibleWorkOrder(order, user) {
  if (!order || !user) return false;
  if (!isLiveDashboardWorkOrder(order)) return false;
  if (order.tenantId) return order.tenantId === user.id;
  return Boolean(user.propertyIds?.includes(order.propertyId));
}

function isVendorVisibleWorkOrder(order, vendor, user) {
  if (!order || (!vendor && !user)) return false;
  if (!isLiveDashboardWorkOrder(order)) return false;
  const bookedForVendor = order.finalBooking && (!vendor || namesMatch(order.finalBooking.vendorName, vendor.name) || order.vendorId === vendor.id);
  const liveOutcomeForVendor = hasLiveVendorOutcome(order, vendor);
  if (!bookedForVendor && !liveOutcomeForVendor) return false;
  const status = (order.status || "").toLowerCase();
  return ["vendor", "scheduled", "booked", "completed", "invoice"].some((word) => status.includes(word)) || liveOutcomeForVendor;
}

function isReviewWorkOrder(order) {
  const status = (order?.status || "").toLowerCase();
  return status.includes("approval") || status === "manager review" || status === "vendor quotes received";
}

function maintenanceNotesForProperty(property) {
  const address = `${property?.address || ""} ${property?.name || ""}`.toLowerCase();
  const notes = [];

  if (address.includes("san francisco") || address.includes("ca") || address.includes("mar vista") || address.includes("los angeles")) {
    notes.push("Coastal air can make windows, bath fans, and under-sink cabinets show moisture early. A quick photo helps the manager tell leak from condensation.");
    notes.push("Before heavy rain, mention any window seepage, soft drywall, or musty smell so small weatherproofing issues do not linger.");
  }

  if (address.includes("brooklyn") || address.includes("ny") || address.includes("brownstone")) {
    notes.push("Older radiators and plumbing stacks can make small drips look routine. Report fresh water marks, heat loss, or recurring drain backups early.");
    notes.push("After freeze-thaw swings, note doors that stop latching, ceiling stains, or exterior steps that feel loose.");
  }

  if (!notes.length) {
    notes.push("Small changes are worth reporting: slow drains, new stains, loose locks, appliance noises, or anything that feels different from last week.");
    notes.push("For urgent issues like active water, gas smell, sparking, no heat, or a broken lock, include what is happening right now and the fastest access window.");
  }

  notes.push(`For ${property?.name || "this property"}, include the best entry window, pets or gate notes, and whether the issue is still happening.`);
  return notes.slice(0, 3);
}

function tenantSelfSolveGuidance(issue = "", property) {
  const triage = classifyIssue(issue);
  const body = issue.toLowerCase();
  const propertyRules = String(property?.rules || "");
  const propertyNote = propertyRules
    ? `Property note: ${propertyRules}`
    : maintenanceNotesForProperty(property)[0];
  const includesAny = (words) => words.some((word) => body.includes(word));

  const specificGuidance = [
    {
      matches: ["rail", "railing", "handrail", "banister", "stair", "step", "deck", "balcony"],
      title: "Document the loose or unsafe rail",
      steps: [
        "Avoid leaning on it or using that stair/deck edge until it is checked.",
        "Take one wide photo showing the full rail and one close photo of the loose bracket, post, fasteners, or cracked area.",
        "Write whether it wiggles, is detached, sharp, rusted, or blocking a normal entry path."
      ]
    },
    {
      matches: ["door", "lock", "latch", "handle", "knob", "deadbolt", "key", "window", "screen", "gate"],
      title: "Capture how the door, lock, or window fails",
      steps: [
        "Do not force the handle, lock, window, or latch if it feels stuck.",
        "Send a close photo of the hardware and a wider photo showing which door, window, gate, or entry it is.",
        "Write whether it will not open, will not close, will not latch, feels loose, or affects exterior security."
      ]
    },
    {
      matches: ["fridge", "refrigerator", "freezer", "dishwasher", "washer", "dryer", "oven", "stove", "range", "microwave", "appliance"],
      title: "Capture the appliance symptom and model",
      steps: [
        "Write whether it has no power, is leaking, making noise, showing an error, or not heating/cooling.",
        "Send a photo of the appliance front plus the model/serial label if you can find it safely.",
        "Try one normal power or cycle reset only if there is no smell, smoke, leak, or heat concern."
      ]
    },
    {
      matches: ["garage", "opener", "remote", "keypad", "parking gate"],
      title: "Check the access device without forcing it",
      steps: [
        "Try a second remote/keypad code only if you already have one.",
        "Send a photo of the door/gate position and any blinking light or error on the opener.",
        "Write whether the motor runs, clicks, is silent, reverses, or the door/gate is physically stuck."
      ]
    },
    {
      matches: ["cabinet", "drawer", "closet", "shelf", "hinge", "track", "sliding"],
      title: "Show where the hardware is failing",
      steps: [
        "Avoid forcing the drawer, cabinet, closet, or sliding panel if it is binding.",
        "Take a wide photo of the fixture and a close photo of the hinge, track, roller, screw, or cracked piece.",
        "Write whether it is loose, detached, scraping, off track, or unable to close."
      ]
    },
    {
      matches: ["ceiling", "wall", "drywall", "paint", "stain", "mold", "mildew", "moisture", "soft spot"],
      title: "Track the stain, moisture, or surface change",
      steps: [
        "Do not touch soft drywall, peeling paint, or suspected mold.",
        "Take a wide photo for room location and a close photo with a common object nearby for scale.",
        "Write whether it is wet now, spreading, musty, after rain, near plumbing, or below another unit."
      ]
    },
    {
      matches: ["smoke detector", "carbon monoxide", "co detector", "alarm", "chirp", "beeping"],
      title: "Record the alarm behavior",
      steps: [
        "If there is smoke, fire, gas smell, or carbon monoxide concern, leave and call emergency services first.",
        "Write whether it is a single chirp, repeated alarm, low-battery alert, or no power.",
        "Send a photo of the detector location and brand/model if reachable without climbing unsafely."
      ]
    },
    {
      matches: ["pest", "bug", "bugs", "ant", "ants", "roach", "roaches", "mouse", "mice", "rat", "rats"],
      title: "Document the pest location and pattern",
      steps: [
        "Take a photo only if you can do it safely and without disturbing nests or droppings.",
        "Write the room, where you saw activity, and whether it is a one-time sighting or recurring.",
        "Note any entry points, food/water source nearby, or neighboring unit/common-area pattern."
      ]
    }
  ].find((item) => includesAny(item.matches));

  if (specificGuidance) {
    return { ...specificGuidance, propertyNote };
  }

  if (triage.trade === "Plumbing") {
    return {
      title: body.includes("toilet") ? "Stop water and avoid more use" : "Contain the leak safely",
      steps: body.includes("toilet")
        ? ["Stop using that toilet for now.", "If water is rising, turn the small valve behind the toilet clockwise.", "Take one close photo and one wider photo if safe."]
        : ["If water is active, turn the closest small shutoff valve clockwise.", "Put a towel or bowl under the leak and avoid using that fixture.", "Note whether the water is from a pipe joint, faucet, drain, disposal, wall, or ceiling."],
      propertyNote
    };
  }
  if (triage.trade === "HVAC") {
    return {
      title: "Check simple controls once",
      steps: ["Confirm the thermostat mode and set point.", "Replace batteries if the thermostat uses them.", "Check the breaker once only if it is safe and accessible."],
      propertyNote
    };
  }
  if (triage.trade === "Electrical") {
    return {
      title: "Keep it safe and hands off",
      steps: ["Stop using the outlet, switch, appliance, or fixture involved.", "Do not reset a breaker if there was heat, smoke, sparking, or a burning smell.", "Send a photo from a safe distance and say whether power is out in one room or everywhere."],
      propertyNote
    };
  }
  return {
    title: "Capture the details that avoid a second call",
    steps: ["Take one close photo and one wider photo.", "Write when it started and whether it is getting worse.", "Try only an obvious reset or switch once if it is safe."],
    propertyNote
  };
}

function tenantPresenceLikelyRelevant(issue = "", trade = "") {
  const text = `${trade} ${issue}`.toLowerCase();
  if (["plumbing", "hvac", "electrical"].some((word) => text.includes(word))) return true;
  return [
    "appliance",
    "broken",
    "ceiling",
    "door",
    "drain",
    "faucet",
    "gate",
    "garage",
    "heat",
    "hinge",
    "inside",
    "knob",
    "leak",
    "latch",
    "lock",
    "outlet",
    "pipe",
    "rail",
    "railing",
    "repair person",
    "service person",
    "sink",
    "shower",
    "stair",
    "technician",
    "thermostat",
    "toilet",
    "vendor",
    "water",
    "window"
  ].some((word) => text.includes(word));
}

async function prepareIssueMediaAttachments(files = []) {
  const selected = Array.from(files || []);
  if (selected.length > 10) throw new Error("Attach up to 10 images or videos.");
  const invalid = selected.find((file) => !/^(image|video)\//.test(file.type));
  if (invalid) throw new Error("Only image and video files can be attached.");
  const oversized = selected.find((file) => file.size > 5 * 1024 * 1024);
  if (oversized) throw new Error("Each image or video must be 5 MB or smaller.");
  return Promise.all(selected.map(async (file, index) => {
    const attachment = {
      id: `media-${Date.now()}-${index + 1}`,
      name: file.name,
      contentType: file.type,
      size: file.size,
      dataUrl: await readFileAsDataUrl(file),
      receivedAt: new Date().toISOString()
    };
    if (file.type.startsWith("video/")) {
      attachment.previewFrameDataUrl = await readVideoPreviewFrame(file).catch(() => "");
    }
    return attachment;
  }));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read one of the selected files."));
    reader.readAsDataURL(file);
  });
}

function readVideoPreviewFrame(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      URL.revokeObjectURL(url);
      callback(value);
    };
    const timeout = window.setTimeout(() => {
      finish(reject, new Error("Could not read a preview frame from one video."));
    }, 5000);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      const targetTime = Math.min(0.2, Math.max(0, (video.duration || 0) / 2));
      if (targetTime === 0) {
        captureVideoFrame(video, resolve, reject, finish);
        return;
      }
      video.currentTime = targetTime;
    };
    video.onseeked = () => {
      captureVideoFrame(video, resolve, reject, finish);
    };
    video.onerror = () => {
      finish(reject, new Error("Could not read a preview frame from one video."));
    };
    video.src = url;
  });
}

function captureVideoFrame(video, resolve, reject, finish) {
  try {
    const canvas = document.createElement("canvas");
    const maxWidth = 960;
    const scale = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1;
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read a preview frame from one video.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    finish(resolve, canvas.toDataURL("image/jpeg", 0.78));
  } catch (error) {
    finish(reject, error);
  }
}

function PublicSiteRouter() {
  const page = publicSitePageFor();

  useEffect(() => {
    if (page) trackPageView();
  }, [page]);

  useEffect(() => {
    const publicRedirects = {
      "/delete-account": "/dashboard/delete-account",
      "/delete-data": "/dashboard/delete-data"
    };
    const target = publicRedirects[window.location.pathname.replace(/\/+$/, "")];
    if (!target) return;
    window.location.replace(`${target}${window.location.search}${window.location.hash}`);
  }, []);

  return page ? <PublicSitePage page={page} /> : <App />;
}

function PublicSitePage({ page }) {
  const cityArticle = page === "maintenanceCity" ? propertyMaintenanceCityFor() : null;
  const seoArticle = page === "seoArticle" ? seoArticleFor() : null;
  const templatePage = page === "templatePage" ? templatePageFor() : null;
  const pages = {
    about: {
      eyebrow: "About LivingRelay",
      title: "Property maintenance without the scattered texts",
      summary: "LivingRelay helps small rental operators keep tenant issues, owner approvals, vendor coordination, and invoice records moving in one place.",
      primary: "Open app",
      primaryHref: "/",
      secondary: "Property maintenance guides",
      secondaryHref: "/property-maintenance"
    },
    marketing: {
      eyebrow: "LivingRelay",
      title: "SMS-first rental repair coordination",
      summary: "LivingRelay turns tenant texts into organized repair workflows, approvals, vendor coordination, and invoice records for small property operators.",
      primary: "Open app",
      primaryHref: "/",
      secondary: "Talk to sales",
      secondaryHref: "/sales"
    },
    sales: {
      eyebrow: "Talk to LivingRelay",
      title: "See whether LivingRelay fits your rental workflow",
      summary: "Owners, property managers, and small landlords can share a few details and get a follow-up about tenant intake, owner approvals, vendor coordination, and repair records.",
      primary: "Start the form",
      primaryHref: "#sales-lead-form",
      secondary: "Open app",
      secondaryHref: "/"
    },
    workflowAudit: {
      eyebrow: "Workflow Audit",
      title: "Rental maintenance workflow audit for small operators",
      metaTitle: "Rental Maintenance Workflow Audit | LivingRelay",
      metaDescription: "Book a short rental maintenance workflow audit for tenant intake, owner approvals, vendor coordination, and repair records.",
      summary: "Map how tenant repair requests, owner approvals, vendor follow-up, and invoice records move today, then see where LivingRelay can clean up the handoff.",
      primary: "Request audit",
      primaryHref: "#workflow-audit-form",
      secondary: "Get the kit",
      secondaryHref: "/rental-maintenance-intake-kit"
    },
    maintenanceKit: {
      eyebrow: "Maintenance Kit",
      title: "Free rental maintenance intake kit",
      metaTitle: "Rental Maintenance Intake Kit | LivingRelay",
      metaDescription: "Request rental maintenance templates for tenant intake, owner approvals, vendor coordination, status updates, and repair records.",
      summary: "Get practical templates for tenant repair intake, owner approval requests, vendor coordination, status updates, and repair logs.",
      primary: "Request kit",
      primaryHref: "#maintenance-kit-form",
      secondary: "Book audit",
      secondaryHref: "/maintenance-workflow-audit"
    },
    rentalMaintenanceSoftware: {
      eyebrow: "Rental Maintenance Software",
      title: "Coordinate rental repairs without rebuilding the story every time",
      metaTitle: "Rental Maintenance Software For Small Operators | LivingRelay",
      metaDescription: "LivingRelay helps small landlords and property managers turn tenant maintenance texts into repair work orders, approvals, vendor notes, and records.",
      summary: "LivingRelay gives small rental operators a lighter way to organize tenant requests, owner approvals, vendor coordination, status updates, and repair records.",
      primary: "Request access",
      primaryHref: "#software-access-form",
      secondary: "Get the kit",
      secondaryHref: "/rental-maintenance-intake-kit"
    },
    propertyMaintenanceCoordination: {
      eyebrow: "Maintenance Coordination",
      title: "One place for tenant requests, owner decisions, and vendor follow-up",
      metaTitle: "Property Maintenance Coordination | LivingRelay",
      metaDescription: "Coordinate rental maintenance from tenant intake through approval, vendor follow-up, booking notes, invoices, and repair history.",
      summary: "Use LivingRelay when maintenance work is not just a ticket. It is a chain of messages, decisions, vendor notes, and records that need to stay connected.",
      primary: "See setup path",
      primaryHref: "#coordination-form",
      secondary: "Try LivingRelay",
      secondaryHref: "/try-livingrelay"
    },
    tenantMaintenanceTexts: {
      eyebrow: "Tenant Texts",
      title: "Turn tenant maintenance texts into structured repair records",
      metaTitle: "Tenant Maintenance Texts To Work Orders | LivingRelay",
      metaDescription: "LivingRelay turns tenant maintenance texts into structured repair records with issue details, access notes, approvals, vendor context, and status updates.",
      summary: "Keep the speed of SMS while capturing the details managers, owners, tenants, and vendors need for the repair to move.",
      primary: "Request text workflow",
      primaryHref: "#tenant-texts-form",
      secondary: "View resources",
      secondaryHref: "/resources"
    },
    tryLivingRelay: {
      eyebrow: "Early Access",
      title: "Try LivingRelay on your next real maintenance request",
      metaTitle: "Try LivingRelay | Rental Maintenance Coordination",
      metaDescription: "Request early access to LivingRelay and try SMS-first rental maintenance coordination on a real repair workflow.",
      summary: "For owner-managers and small property managers who want to test LivingRelay without scheduling a workflow audit first.",
      primary: "Request early access",
      primaryHref: "#early-access-form",
      secondary: "Maintenance kit",
      secondaryHref: "/rental-maintenance-intake-kit"
    },
    resourceIndex: {
      eyebrow: "Maintenance Resources",
      title: "Templates and guides for rental maintenance coordination",
      summary: "Operational SEO resources, copy/paste templates, and checklists for small property managers, remote landlords, and self-managing rental owners.",
      primary: "Browse templates",
      primaryHref: "#templates",
      secondary: "Talk to LivingRelay",
      secondaryHref: "#talk-to-livingrelay"
    },
    support: {
      eyebrow: "Support",
      title: "Get help with LivingRelay",
      summary: "For account access, onboarding, repair workflows, billing, or App Review questions, contact LivingRelay support and include the property, phone number, and issue context.",
      primary: "Email support",
      primaryHref: "mailto:support@livingrelay.com",
      secondary: "Privacy policy",
      secondaryHref: "/privacy"
    },
    privacy: {
      eyebrow: "Privacy Policy",
      title: "How LivingRelay handles product data",
      summary: "LivingRelay uses account, property, repair, messaging, vendor, and invoice information to operate rental repair workflows and provide support.",
      primary: "Contact privacy",
      primaryHref: "mailto:privacy@livingrelay.com",
      secondary: "Terms",
      secondaryHref: "/terms"
    },
    terms: {
      eyebrow: "Terms And Conditions",
      title: "LivingRelay SMS and product terms",
      summary: "These terms explain LivingRelay account use, operational SMS notifications, message frequency, support, and opt-out instructions.",
      primary: "Email support",
      primaryHref: "mailto:support@livingrelay.com",
      secondary: "Privacy policy",
      secondaryHref: "/privacy"
    },
    ios: {
      eyebrow: "iOS App",
      title: "LivingRelay for managers, owners, tenants, and vendors on iPhone",
      summary: "Use the LivingRelay iOS app to review repair requests, approve work, coordinate vendors, and keep maintenance records close when you are away from a desk.",
      primary: "Open web app",
      primaryHref: "/",
      secondary: "Get support",
      secondaryHref: "/support"
    },
    referral: {
      eyebrow: "Referral Program",
      title: "Invite another owner or property manager",
      summary: "LivingRelay referrals help small operators bring cleaner repair coordination to the people they already work with.",
      primary: "Open app",
      primaryHref: "/",
      secondary: "Property maintenance guides",
      secondaryHref: "/property-maintenance"
    },
    maintenanceIndex: {
      eyebrow: "Property Maintenance Guides",
      title: "City-by-city property maintenance playbooks",
      summary: "Maintenance looks different in every market. Start with the 25 largest U.S. cities and see the issues, vendors, costs, and workflows that shape rental repairs.",
      primary: "Browse cities",
      primaryHref: "#city-guides",
      secondary: "Open app",
      secondaryHref: "/"
    },
    maintenanceCity: {
      eyebrow: cityArticle ? `${cityArticle.city}, ${cityArticle.state}` : "Property Maintenance",
      title: cityArticle?.title || "Property Maintenance",
      summary: cityArticle ? `A practical guide to common rental maintenance needs in ${cityArticle.city}, how owners and managers can approach repairs, and what costs tend to surprise teams.` : "A practical city guide for rental maintenance.",
      primary: "Open app",
      primaryHref: "/",
      secondary: "All city guides",
      secondaryHref: "/property-maintenance"
    },
    seoArticle: {
      eyebrow: seoArticle?.eyebrow || "Maintenance Resource",
      title: seoArticle?.h1 || "Maintenance Resource",
      metaTitle: seoArticle ? `${seoArticle.metaTitle} | LivingRelay` : undefined,
      metaDescription: seoArticle?.metaDescription,
      summary: seoArticle?.summary || "A practical maintenance coordination guide for rental property operators.",
      primary: "Use the template",
      primaryHref: "#checklist",
      secondary: "All resources",
      secondaryHref: "/resources"
    },
    templatePage: {
      eyebrow: templatePage?.eyebrow || "Template",
      title: templatePage?.h1 || "Maintenance Template",
      metaTitle: templatePage ? `${templatePage.h1.slice(0, 42)} | LivingRelay` : undefined,
      metaDescription: templatePage?.summary,
      summary: templatePage?.summary || "A copy/paste rental maintenance coordination template.",
      primary: "Copy template",
      primaryHref: "#template",
      secondary: "All resources",
      secondaryHref: "/resources"
    }
  };
  const content = pages[page] || pages.marketing;
  const jsonLd = publicJsonLd(page, content, cityArticle);

  useEffect(() => {
    applyPublicSeo(content, page, cityArticle);
  }, [content, page, cityArticle]);

  return (
    <main className="public-page">
      {jsonLd.map((data, index) => <JsonLd data={data} key={`${page}-jsonld-${index}`} />)}
      <nav className="public-nav" aria-label="Public navigation">
        <a className="public-brand" href="/marketing" aria-label="LivingRelay marketing page">
          <span className="app-mark"><Wrench size={22} /></span>
          <strong>LivingRelay</strong>
        </a>
        <div>
          <a href="/marketing">Marketing</a>
          <a href="/sales">Sales</a>
          <a href="/about">About</a>
          <a href="/resources">Resources</a>
          <a href="/property-maintenance">City guides</a>
          <a href="/support">Support</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a className="public-nav-button" href="/">Open app</a>
        </div>
      </nav>

      <section className="public-hero">
        <span className="hero-kicker">{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.summary}</p>
        <div className="hero-actions">
          <a className="primary" href={content.primaryHref}>{content.primary} <ArrowRight size={18} /></a>
          <a className="ghost" href={content.secondaryHref}>{content.secondary}</a>
        </div>
      </section>

      {page === "marketing" && <MarketingContent />}
      {page === "sales" && <SalesPageContent />}
      {page === "workflowAudit" && <CampaignLandingPage variant="audit" />}
      {page === "maintenanceKit" && <CampaignLandingPage variant="kit" />}
      {page === "rentalMaintenanceSoftware" && <CampaignLandingPage variant="software" />}
      {page === "propertyMaintenanceCoordination" && <CampaignLandingPage variant="coordination" />}
      {page === "tenantMaintenanceTexts" && <CampaignLandingPage variant="texts" />}
      {page === "tryLivingRelay" && <CampaignLandingPage variant="pilot" />}
      {page === "about" && <AboutContent />}
      {page === "support" && <SupportContent />}
      {page === "privacy" && <PrivacyContent />}
      {page === "terms" && <TermsContent />}
      {page === "ios" && <IosAppContent />}
      {page === "referral" && <ReferralProgramContent />}
      {page === "resourceIndex" && <ResourceIndex />}
      {page === "maintenanceIndex" && <PropertyMaintenanceIndex />}
      {page === "maintenanceCity" && cityArticle && <PropertyMaintenanceCityArticle city={cityArticle} />}
      {page === "seoArticle" && seoArticle && <SeoArticlePage article={seoArticle} />}
      {page === "templatePage" && templatePage && <TemplateResourcePage template={templatePage} />}
      <PublicFooter />
    </main>
  );
}

function MarketingContent() {
  return (
    <>
      <section className="answer-strip" aria-label="LivingRelay summary">
        <div>
          <span className="eyebrow">Quick answer</span>
          <h2>LivingRelay is maintenance coordination software for rental repairs.</h2>
        </div>
        <p>It helps property managers and rental owners turn tenant SMS messages into organized work orders, approvals, vendor coordination, invoice records, and repair history. It is designed for small rental teams that need operational clarity without adopting a large enterprise maintenance system.</p>
      </section>

      <section className="public-grid three">
        <PublicCard icon={<MessageSquare />} title="Tenant intake" text="Tenants can report repair issues with the context managers need: unit, symptoms, access notes, and photos." />
        <PublicCard icon={<ShieldCheck />} title="Approval workflow" text="Managers and owners can review work orders, estimates, vendor choices, and repair history before work moves forward." />
        <PublicCard icon={<ReceiptText />} title="Invoice records" text="LivingRelay keeps off-platform vendor payments organized with invoice status, tax-year totals, and property-level repair history." />
      </section>

      <section className="public-band">
        <div>
          <span className="eyebrow">Built for small operators</span>
          <h2>One workflow for managers, owners, tenants, and vendors.</h2>
        </div>
        <div className="public-checklist">
          <p><Check size={18} /> Phone and PIN access scoped by role</p>
          <p><Check size={18} /> Property-specific repair rules and approval thresholds</p>
          <p><Check size={18} /> Vendor outreach context and closeout records</p>
          <p><Check size={18} /> Owner visibility without moving repair payments on platform</p>
        </div>
      </section>

      <SalesLeadEmbed context="Marketing page" />

      <section className="public-grid two audience-grid" aria-label="LivingRelay users">
        {marketingUseCases.map((item) => (
          <article className="public-card answer-card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <FaqSection items={productFaqs} />
    </>
  );
}

function SalesPageContent() {
  return (
    <>
      <section className="answer-strip" aria-label="Sales lead summary">
        <div>
          <span className="eyebrow">Owners and managers</span>
          <h2>A quick way to start a real conversation.</h2>
        </div>
        <p>Use this page when you want to learn whether LivingRelay can help with maintenance requests, vendor calls, owner approval loops, repair history, or cleaner communication across a small rental portfolio.</p>
      </section>

      <section className="public-grid three">
        <PublicCard icon={<MessageSquare />} title="Tenant intake" text="Talk through how repair requests arrive today and what details are missing before dispatch." />
        <PublicCard icon={<Phone />} title="Vendor coordination" text="Review where AI vendor calls, availability checks, and booking notes could reduce manual follow-up." />
        <PublicCard icon={<ShieldCheck />} title="Owner approvals" text="Map approval thresholds, owner visibility, and invoice records to the way your rentals already operate." />
      </section>

      <SalesLeadEmbed context="Standalone sales page" id="sales-lead-form" />
    </>
  );
}

const campaignLandingContent = {
  audit: {
    id: "workflow-audit-form",
    context: "Meta workflow audit landing page",
    formTitle: "Request a workflow audit",
    formText: "Share how repairs move today and we will follow up about tenant intake, approvals, vendor coordination, and records.",
    submitLabel: "Request audit",
    initialMessage: "I am interested in a rental maintenance workflow audit.",
    messageLabel: "What gets messy today?",
    messagePlaceholder: "Tenant texts, owner approvals, vendor follow-up, invoices, after-hours requests...",
    stats: [
      ["15 min", "Short workflow review"],
      ["4 handoffs", "Tenant, manager, owner, vendor"],
      ["Small teams", "Built for owner-managers and lean operators"]
    ],
    cards: [
      { icon: <MessageSquare />, title: "Tenant intake", text: "Turn scattered repair texts into issue, unit, photos, access notes, urgency, and next action." },
      { icon: <ShieldCheck />, title: "Owner approval", text: "Keep estimate context, thresholds, decisions, and repair history tied to the work order." },
      { icon: <Phone />, title: "Vendor coordination", text: "Compare availability, quote signals, booking notes, invoice instructions, and follow-up status." }
    ],
    steps: [
      ["1", "Map the current path", "Tenant report, manager triage, owner decision, vendor outreach, tenant update, invoice closeout."],
      ["2", "Find the drag", "We look for missing photos, repeated explanations, approval stalls, vendor call loops, and records that disappear."],
      ["3", "Show the LivingRelay version", "See how the same repair can move through an SMS-first workflow with records attached."]
    ],
    proofTitle: "For the awkward middle ground between texts and an enterprise PMS.",
    proofText: "LivingRelay is for operators who need repair coordination and records without making every tenant, owner, and vendor learn another heavy portal."
  },
  kit: {
    id: "maintenance-kit-form",
    context: "Meta maintenance intake kit landing page",
    formTitle: "Request the maintenance intake kit",
    formText: "Tell us where to send the kit and what kind of rental maintenance workflow you are organizing.",
    submitLabel: "Request kit",
    initialMessage: "I am interested in the rental maintenance intake kit.",
    messageLabel: "What template would help most?",
    messagePlaceholder: "Tenant request, owner approval, vendor checklist, status updates, repair log...",
    stats: [
      ["5 templates", "Intake, approval, vendor, status, records"],
      ["SMS-first", "Built around real maintenance messages"],
      ["Free", "Useful before you adopt software"]
    ],
    cards: [
      { icon: <ClipboardList />, title: "Tenant request intake", text: "Collect the details that usually trigger a second call: location, symptoms, timing, photos, and access." },
      { icon: <FileText />, title: "Owner approval note", text: "Summarize issue, estimate, vendor recommendation, timing, and decision needed." },
      { icon: <ReceiptText />, title: "Repair record log", text: "Keep vendor, amount, invoice, completion, warranty, and tax-year notes together." }
    ],
    steps: [
      ["1", "Use the templates", "Start with plain operational language for routine maintenance intake and follow-up."],
      ["2", "Spot repeat friction", "Notice where templates still create manual follow-up or recordkeeping work."],
      ["3", "Move the workflow into LivingRelay", "When copy/paste gets heavy, route the same process through shared work orders and SMS updates."]
    ],
    proofTitle: "Templates for the work small rental operators already do.",
    proofText: "The kit is intentionally practical: tenant intake, owner approvals, vendor coordination, status updates, and repair records."
  },
  software: {
    id: "software-access-form",
    context: "Meta rental maintenance software landing page",
    formTitle: "Request access to LivingRelay",
    formText: "Tell us your role and portfolio size. We will follow up with the lightest setup path for your rentals.",
    submitLabel: "Request access",
    initialRole: "Property manager",
    initialMessage: "I am interested in LivingRelay access for rental maintenance coordination.",
    messageLabel: "What do you want LivingRelay to handle first?",
    messagePlaceholder: "Tenant intake, owner approvals, vendor follow-up, invoice records, status updates...",
    eyebrow: "For small rental teams",
    processEyebrow: "How it scales",
    processTitle: "Start with one workflow, then add more properties when the process fits.",
    stats: [
      ["SMS intake", "Keep the channel tenants already use"],
      ["Approval trail", "Manager and owner decisions stay attached"],
      ["Repair records", "Vendor and invoice notes stay with the property"]
    ],
    cards: [
      { icon: <MessageSquare />, title: "Tenant requests", text: "Collect routine maintenance details from texts without losing photos, access notes, or status." },
      { icon: <Users />, title: "Role-aware workflow", text: "Managers, owners, tenants, and vendors see the pieces that match their responsibility." },
      { icon: <ReceiptText />, title: "Property repair memory", text: "Keep invoice notes, paid status, vendor outcomes, and repair history organized by property." }
    ],
    steps: [
      ["1", "Add a property", "Set manager, owner, tenant, vendor, and approval rules for the first rental workflow."],
      ["2", "Route requests", "Tenant maintenance messages become structured work orders with the context needed for action."],
      ["3", "Expand only when useful", "Add properties, owners, and vendors after the first workflow proves it saves coordination time."]
    ],
    proofTitle: "A focused maintenance layer for small rental operators.",
    proofText: "LivingRelay is not trying to replace your whole property stack. It focuses on the repair communication and recordkeeping path that usually sprawls across texts, calls, and spreadsheets."
  },
  coordination: {
    id: "coordination-form",
    context: "Meta property maintenance coordination landing page",
    formTitle: "Get the coordination setup path",
    formText: "Share a few details and we will send the best next step for your owner, tenant, and vendor workflow.",
    submitLabel: "Send setup path",
    initialRole: "Owner-manager",
    initialMessage: "I am interested in improving property maintenance coordination.",
    messageLabel: "Which handoff creates the most follow-up?",
    messagePlaceholder: "Tenant to manager, manager to owner, manager to vendor, vendor to invoice, tenant status updates...",
    eyebrow: "No required audit call",
    processEyebrow: "Coordination path",
    processTitle: "Keep every handoff tied to one repair record.",
    stats: [
      ["Tenant", "Issue, photos, access, availability"],
      ["Owner", "Estimate context and approval"],
      ["Vendor", "Scope, ETA, invoice instructions"]
    ],
    cards: [
      { icon: <ClipboardList />, title: "Repair context", text: "Keep issue details, safety notes, access windows, photos, and timeline in one place." },
      { icon: <ShieldCheck />, title: "Approval control", text: "Route owner decisions when thresholds or property rules require extra context." },
      { icon: <Phone />, title: "Vendor follow-up", text: "Track vendor availability, quote signals, booking notes, and closeout records." }
    ],
    steps: [
      ["1", "Capture the request", "Start with tenant issue, unit, access, photos, and urgency."],
      ["2", "Route the decision", "Send the right context to the manager or owner before spend moves forward."],
      ["3", "Close the loop", "Store vendor outcome, tenant update, invoice notes, and completion details."]
    ],
    proofTitle: "The repair is one workflow, even when the messages come from four directions.",
    proofText: "LivingRelay keeps tenant, owner, manager, and vendor context together so the next person does not have to ask for the whole story again."
  },
  texts: {
    id: "tenant-texts-form",
    context: "Meta tenant maintenance texts landing page",
    formTitle: "Request the tenant text workflow",
    formText: "Tell us how tenants contact you today and we will follow up with the best text-first setup path.",
    submitLabel: "Request workflow",
    initialRole: "Small landlord",
    initialMessage: "I am interested in turning tenant maintenance texts into organized work orders.",
    messageLabel: "How do tenants report repairs today?",
    messagePlaceholder: "Personal phone, shared number, email, portal, voicemail, mixed process...",
    eyebrow: "SMS-first",
    processEyebrow: "Text to record",
    processTitle: "Keep SMS speed while capturing usable maintenance details.",
    stats: [
      ["Text first", "Tenants can start where they already are"],
      ["Structured", "Issue, unit, photos, access, timeline"],
      ["Status", "Updates stay tied to the repair"]
    ],
    cards: [
      { icon: <MessageSquare />, title: "Tenant-friendly intake", text: "Tenants can report routine issues without learning a heavy portal first." },
      { icon: <FileText />, title: "Better work orders", text: "LivingRelay organizes the request into details a manager or owner can review." },
      { icon: <Bell />, title: "Cleaner updates", text: "Status messages and next steps stay connected to the work order instead of a loose thread." }
    ],
    steps: [
      ["1", "Tenant texts the issue", "LivingRelay captures the plain-language request and asks for missing details when needed."],
      ["2", "Manager gets context", "Issue, unit, photos, access notes, urgency, and history are easier to review."],
      ["3", "Everyone stays aligned", "Tenant updates, owner decisions, vendor notes, and closeout records stay attached."]
    ],
    proofTitle: "Do not make SMS disappear. Make it operational.",
    proofText: "For many small rental operators, text is the fastest path to a repair request. LivingRelay keeps that speed while turning the thread into a record people can act on."
  },
  pilot: {
    id: "early-access-form",
    context: "Meta early access pilot landing page",
    formTitle: "Request early access",
    formText: "Use this path if you want to try LivingRelay without booking an audit call first.",
    submitLabel: "Request early access",
    initialRole: "Owner-manager",
    initialMessage: "I would like early access to try LivingRelay on a real maintenance request.",
    messageLabel: "What kind of repair workflow would you test first?",
    messagePlaceholder: "Plumbing, HVAC, appliance, access coordination, owner approval, vendor scheduling...",
    eyebrow: "Low-touch pilot",
    processEyebrow: "Pilot path",
    processTitle: "Use LivingRelay on one real maintenance workflow before expanding.",
    stats: [
      ["1 property", "Start with a small test"],
      ["1 repair", "Try the workflow on a real request"],
      ["No audit", "Async setup is enough to begin"]
    ],
    cards: [
      { icon: <Home />, title: "Start small", text: "Use one property and one repair workflow to see whether LivingRelay fits." },
      { icon: <Settings2 />, title: "Set rules", text: "Add owner, tenant, vendor, approval threshold, and notification preferences." },
      { icon: <Check />, title: "Decide after trying", text: "Expand only if it reduces coordination work and creates better repair records." }
    ],
    steps: [
      ["1", "Request access", "Send role, portfolio size, and the first workflow you want to test."],
      ["2", "Set up one property", "Add the minimum people and rules needed for a safe first maintenance path."],
      ["3", "Run the next request", "Use LivingRelay for intake, approval, vendor coordination, status, and records."]
    ],
    proofTitle: "A practical pilot path for operators who are busy.",
    proofText: "The goal is not another meeting. The goal is to test whether LivingRelay can make the next real maintenance request easier to coordinate."
  }
};

function CampaignLandingPage({ variant }) {
  const content = campaignLandingContent[variant] || campaignLandingContent.audit;
  return (
    <>
      <section className="campaign-proof-strip" aria-label="Campaign highlights">
        {content.stats.map(([value, label]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="campaign-visual-band" aria-label="LivingRelay workflow preview">
        <div className="campaign-workflow-copy">
          <span className="eyebrow">{content.eyebrow || "How LivingRelay helps"}</span>
          <h2>{content.proofTitle}</h2>
          <p>{content.proofText}</p>
          <div className="public-checklist">
            <p><Check size={18} /> Tenant texts become structured repair records</p>
            <p><Check size={18} /> Owners see approval context before deciding</p>
            <p><Check size={18} /> Vendor notes and invoice records stay with the property</p>
          </div>
        </div>
        <WorkflowPreview />
      </section>

      <section className="public-grid three">
        {content.cards.map((card) => <PublicCard key={card.title} {...card} />)}
      </section>

      <section className="campaign-process" aria-label="Campaign process">
        <div>
          <span className="eyebrow">{content.processEyebrow || (variant === "kit" ? "From template to workflow" : "What happens next")}</span>
          <h2>{content.processTitle || (variant === "kit" ? "Start lightweight, then systematize the parts that repeat." : "A focused call around the repair workflow you already run.")}</h2>
        </div>
        <div className="campaign-process-grid">
          {content.steps.map(([step, title, text]) => (
            <article key={title}>
              <span>{step}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <SalesLeadEmbed
        context={content.context}
        id={content.id}
        eyebrow={variant === "kit" ? "For owners and managers" : "For owner-managers and small property managers"}
        title={content.formTitle}
        text={content.formText}
        submitLabel={content.submitLabel}
        initialRole={content.initialRole || (variant === "kit" ? "Small landlord" : "Owner-manager")}
        initialMessage={content.initialMessage}
        messageLabel={content.messageLabel}
        messagePlaceholder={content.messagePlaceholder}
      />

      {variant === "kit" && (
        <section className="public-grid three">
          <PublicCard icon={<MessageSquare />} title="Tenant intake template" text="Use it when a resident reports a routine repair and you need usable details before dispatch." />
          <PublicCard icon={<ShieldCheck />} title="Owner approval template" text="Use it when spend, scope, or vendor choice needs a cleaner owner decision trail." />
          <PublicCard icon={<ReceiptText />} title="Invoice checklist" text="Use it after completion to collect invoice, warranty, paid-status, and tax-year notes." />
        </section>
      )}
    </>
  );
}

function WorkflowPreview() {
  return (
    <div className="workflow-preview" aria-label="LivingRelay repair workflow mockup">
      <div className="workflow-preview-head">
        <span className="app-mark"><Wrench size={18} /></span>
        <div>
          <strong>Kitchen sink leak</strong>
          <span>Noe Valley Duplex · Garden flat</span>
        </div>
      </div>
      <div className="workflow-message tenant">
        <span>Tenant</span>
        <p>Water under sink again. Photos attached. Best access after 3pm.</p>
      </div>
      <div className="workflow-status-grid">
        <div><strong>Trade</strong><span>Plumbing</span></div>
        <div><strong>Urgency</strong><span>Time-sensitive</span></div>
        <div><strong>Access</strong><span>After 3pm</span></div>
        <div><strong>Approval</strong><span>Owner threshold</span></div>
      </div>
      <div className="workflow-message owner">
        <span>Owner approval</span>
        <p>Estimate expected under $300. Manager recommends Carlos Plumbing.</p>
      </div>
      <div className="workflow-vendor-row">
        <Phone size={16} />
        <div>
          <strong>Vendor option ready</strong>
          <span>Availability, callout fee, invoice instructions, and booking notes captured.</span>
        </div>
      </div>
    </div>
  );
}

function AboutContent() {
  return (
    <>
      <section className="public-grid three">
        <PublicCard icon={<MessageSquare />} title="Text-first intake" text="Tenants can start with the channel they already use, while managers still get structured issue details, access notes, and repair history." />
        <PublicCard icon={<Users />} title="Role-aware approvals" text="Owners, managers, tenants, and vendors see the work that matters to them without exposing the whole operating account." />
        <PublicCard icon={<ReceiptText />} title="Repair memory" text="Invoices, estimates, dispatch notes, and closeout records stay attached to the property so the next decision starts with context." />
      </section>

      <section className="public-band">
        <div>
          <span className="eyebrow">Why it exists</span>
          <h2>Small rental teams need better coordination, not more portals.</h2>
        </div>
        <div className="public-copy-stack">
          <p>Most maintenance problems begin simply: a renter notices water under a sink, a lock stops catching, an AC unit goes quiet, or an owner needs to approve a quote. The mess usually starts after that, when photos, vendor calls, estimates, approvals, and invoices scatter across separate threads.</p>
          <p>LivingRelay is built for the operator who owns or manages real property but does not have an enterprise maintenance department. The goal is plain: keep repairs moving, keep people informed, and keep records clean enough that nobody has to reconstruct the story later.</p>
        </div>
      </section>
    </>
  );
}

function SupportContent() {
  return (
    <>
      <section className="public-grid two">
        <PublicCard icon={<Phone />} title="Account access" text="For login help, include the phone number on the account, property name, and whether you are a manager, owner, tenant, or vendor." />
        <PublicCard icon={<ClipboardList />} title="Repair workflow help" text="For a work order question, include the property, unit or space, work order ID if available, and the current repair status." />
      </section>

      <section className="public-band">
        <div>
          <span className="eyebrow">Support channels</span>
          <h2>We use email for account-safe support.</h2>
        </div>
        <div className="public-contact-list">
          <a href="mailto:support@livingrelay.com"><MessageSquare size={18} /> support@livingrelay.com</a>
          <a href="mailto:billing@livingrelay.com"><CreditCard size={18} /> billing@livingrelay.com</a>
          <a href="mailto:privacy@livingrelay.com"><ShieldCheck size={18} /> privacy@livingrelay.com</a>
        </div>
      </section>
    </>
  );
}

function IosAppContent() {
  return (
    <>
      <section className="public-grid three">
        <PublicCard icon={<Smartphone />} title="Field-ready repair review" text="Review tenant issues, work-order status, photos, estimates, and owner approvals from an iPhone." />
        <PublicCard icon={<Bell />} title="Role-based updates" text="Managers, owners, tenants, and vendors can receive the notifications that match their responsibility." />
        <PublicCard icon={<Download />} title="App Store ready" text="LivingRelay has iOS submission assets prepared for the production app experience. The public App Store link can be added here when the listing is live." />
      </section>

      <section className="public-band">
        <div>
          <span className="eyebrow">Download</span>
          <h2>Use the web app today. Add the App Store link when live.</h2>
        </div>
        <div className="public-contact-list">
          <a href="/"><Smartphone size={18} /> Open LivingRelay web app</a>
          <a href="mailto:support@livingrelay.com"><MessageSquare size={18} /> Ask about iOS access</a>
        </div>
      </section>
    </>
  );
}

function ReferralProgramContent() {
  return (
    <>
      <section className="public-grid two">
        <PublicCard icon={<Gift />} title="Invite owners and managers" text="Existing manager and owner accounts can invite another operator and attach a referral code to the new property setup flow." />
        <PublicCard icon={<ShieldCheck />} title="Validated rewards" text="LivingRelay validates referred properties before granting rewards, which keeps the program useful for legitimate rental operators." />
      </section>

      <section className="public-band">
        <div>
          <span className="eyebrow">How it works</span>
          <h2>Referrals are built around real property adoption.</h2>
        </div>
        <div className="public-checklist">
          <p><Check size={18} /> Send a referral invite from the manager or owner workspace</p>
          <p><Check size={18} /> The new operator creates a property using the referral code</p>
          <p><Check size={18} /> LivingRelay reviews the property before granting credits</p>
          <p><Check size={18} /> Qualified accounts can receive dispatch or subscription-related rewards</p>
        </div>
      </section>
    </>
  );
}

function ResourceIndex() {
  return (
    <>
      <section className="answer-strip" aria-label="Resource summary">
        <div>
          <span className="eyebrow">Operational content</span>
          <h2>Useful even before someone buys software.</h2>
        </div>
        <p>These pages focus on low-risk maintenance coordination: intake, status updates, vendor handoffs, owner approvals, photos, logs, and records. They avoid legal advice, screening, eviction, insurance claims, code determinations, emergency protocols, and DIY repair instructions.</p>
      </section>

      <section className="resource-idea-table" aria-label="SEO page ideas">
        <div className="resource-section-head">
          <span className="eyebrow">SEO page map</span>
          <h2>20 page ideas for small rental maintenance searches</h2>
        </div>
        <div className="idea-table">
          <div className="idea-row header">
            <span>Page</span><span>Keyword</span><span>Intent</span><span>Risk</span>
          </div>
          {seoPageIdeas.map((idea) => {
            const live = seoArticles.some((article) => idea.slug === `/resources/${article.slug}`) || templatePages.some((template) => idea.slug === `/templates/${template.slug}`);
            const RowTag = live ? "a" : "div";
            return (
              <RowTag className="idea-row" href={live ? idea.slug : undefined} key={`${idea.title}-${idea.keyword}`}>
                <span><strong>{idea.title}</strong><small>{idea.summary}</small><small>{idea.angle}</small></span>
                <span>{idea.keyword}</span>
                <span>{idea.intent}</span>
                <span>{idea.risk}</span>
              </RowTag>
            );
          })}
        </div>
      </section>

      <section className="resource-card-grid" aria-label="Full SEO pages">
        <div className="resource-section-head">
          <span className="eyebrow">Drafted pages</span>
          <h2>{seoArticles.length} full SEO resources</h2>
        </div>
        <div className="city-guide-grid resource-links">
          {seoArticles.map((article) => (
            <a className="city-guide-card" href={`/resources/${article.slug}`} key={article.slug}>
              <span><FileText size={15} /> {article.keyword}</span>
              <h2>{article.h1}</h2>
              <p>{article.summary}</p>
              <strong>Read resource <ArrowRight size={16} /></strong>
            </a>
          ))}
        </div>
      </section>

      <section className="resource-idea-table" id="templates" aria-label="Downloadable template ideas">
        <div className="resource-section-head">
          <span className="eyebrow">Downloadable ideas</span>
          <h2>10 template-style assets to gate or publish</h2>
        </div>
        <div className="template-idea-grid">
          {downloadableTemplateIdeas.map((item) => (
            <article className="template-idea-card" key={item.name}>
              <h3>{item.name}</h3>
              <p><strong>For:</strong> {item.forWhom}</p>
              <p><strong>Fields:</strong> {item.fields}</p>
              <p><strong>CTA:</strong> {item.cta}</p>
              {item.disclaimer && <small>{item.disclaimer}</small>}
            </article>
          ))}
        </div>
      </section>

      <section className="resource-card-grid" aria-label="Template pages">
        <div className="resource-section-head">
          <span className="eyebrow">Copy/paste pages</span>
          <h2>{templatePages.length} live template pages</h2>
        </div>
        <div className="city-guide-grid resource-links">
          {templatePages.map((template) => (
            <a className="city-guide-card" href={`/templates/${template.slug}`} key={template.slug}>
              <span><ClipboardList size={15} /> Template</span>
              <h2>{template.h1}</h2>
              <p>{template.summary}</p>
              <strong>Open template <ArrowRight size={16} /></strong>
            </a>
          ))}
        </div>
      </section>

      <div id="talk-to-livingrelay">
        <SalesLeadEmbed context="Resource hub" compact />
      </div>
    </>
  );
}

function SeoArticlePage({ article }) {
  return (
    <article className="maintenance-article seo-resource-article" aria-label={article.h1}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: article.faqs.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer }
        }))
      }} />
      <p className="privacy-date">Target keyword: {article.keyword}</p>
      <h2>{article.h1}</h2>
      <p>{article.summary} It is written for small property managers, self-managing landlords, remote owners, and small rental portfolios that need a calmer way to coordinate routine maintenance.</p>
      {article.sections.map(([heading, body]) => (
        <section key={heading}>
          <h3>{heading}</h3>
          <p>{body}</p>
        </section>
      ))}
      <section className="article-answer-box" id="checklist">
        <span className="eyebrow">{article.checklistTitle}</span>
        <div className="resource-checklist">
          {article.checklist.map((item) => <p key={item}><Check size={17} /> {item}</p>)}
        </div>
      </section>
      <section>
        <h3>How LivingRelay Fits</h3>
        <p>{article.cta}</p>
      </section>
      <FaqSection items={article.faqs.map(([question, answer]) => ({ question, answer }))} compact />
      {article.disclaimer && <p className="resource-disclaimer">{article.disclaimer}</p>}
      <section className="article-cta">
        <div>
          <span className="eyebrow">LivingRelay</span>
          <h3>Turn the template into a real workflow.</h3>
          <p>Collect tenant details by SMS, review requests, coordinate vendors, update owners, and keep repair records together.</p>
        </div>
        <SalesLeadForm context={`${article.h1} resource`} compact />
      </section>
    </article>
  );
}

function TemplateResourcePage({ template }) {
  return (
    <article className="maintenance-article template-resource-page" aria-label={template.h1}>
      <p className="privacy-date">Copy/paste maintenance coordination template</p>
      <h2>{template.h1}</h2>
      <p>{template.summary} Replace bracketed fields with the property, unit, vendor, owner, tenant, or work-order details that apply.</p>

      <h3 id="template">Copy/Paste Template</h3>
      <pre className="template-copy"><code>{template.template}</code></pre>

      <h3>Suggested SMS Variants</h3>
      <div className="resource-checklist">
        {template.sms.map((message) => <p key={message}><MessageSquare size={17} /> {message}</p>)}
      </div>

      <h3>Suggested Email Variant</h3>
      <pre className="template-copy"><code>{template.email}</code></pre>

      <section className="template-use-grid">
        <div>
          <h3>When To Use It</h3>
          <p>{template.use}</p>
        </div>
        <div>
          <h3>What Not To Use It For</h3>
          <p>{template.notUse}</p>
        </div>
      </section>

      <section>
        <h3>How LivingRelay Fits</h3>
        <p>LivingRelay helps turn this copy/paste template into an SMS-first workflow with tenant intake, manager review, vendor coordination, owner updates, and records in one place.</p>
      </section>
      {template.disclaimer && <p className="resource-disclaimer">{template.disclaimer}</p>}
      <section className="article-cta">
        <div>
          <span className="eyebrow">LivingRelay</span>
          <h3>Make the template easier to run.</h3>
          <p>Use LivingRelay to keep the message, decision, vendor context, and repair record tied to the property.</p>
        </div>
        <SalesLeadForm context={`${template.h1} template`} compact />
      </section>
    </article>
  );
}

function PropertyMaintenanceIndex() {
  return (
    <>
      <section className="public-band maintenance-intro">
        <div>
          <span className="eyebrow">Top U.S. cities</span>
          <h2>Maintenance is local. The workflow should remember that.</h2>
        </div>
        <div className="public-copy-stack">
          <p>A clogged drain in Boston, an AC outage in Phoenix, a roof leak in Seattle, and a slab concern in San Antonio may all start as a tenant message. The right response depends on climate, building stock, local vendor capacity, and how quickly owners approve the next step.</p>
          <p>These guides use the 25 largest U.S. cities by 2024 population estimate as the starting map for practical, city-aware rental maintenance content.</p>
        </div>
      </section>

      <section className="city-guide-grid" id="city-guides" aria-label="Property maintenance city guides">
        {propertyMaintenanceCities.map((city) => (
          <a className="city-guide-card" href={`/property-maintenance/${city.slug}`} key={city.slug}>
            <span><MapPin size={15} /> {city.state}</span>
            <h2>{city.city} Property Maintenance</h2>
            <p>{city.issue}</p>
            <strong>Read guide <ArrowRight size={16} /></strong>
          </a>
        ))}
      </section>

      <SalesLeadEmbed context="Property maintenance index" compact />
    </>
  );
}

function PropertyMaintenanceCityArticle({ city }) {
  const cityFaqs = [
    {
      question: `What are common rental maintenance issues in ${city.city}?`,
      answer: `Common rental maintenance issues in ${city.city} include ${city.issue}. Managers should collect photos, access notes, urgency, and any relevant equipment or building context before dispatch.`
    },
    {
      question: `How should ${city.city} property managers coordinate repairs?`,
      answer: `A practical process is to ${city.approach}. LivingRelay supports that workflow by keeping tenant details, approvals, vendor outreach, estimates, and invoices attached to one property record.`
    },
    {
      question: `What repair costs surprise rental owners in ${city.city}?`,
      answer: city.costs
    }
  ];

  return (
    <article className="maintenance-article" aria-label={city.title}>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: cityFaqs.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer }
        }))
      }} />
      <p className="privacy-date">Part of the LivingRelay city property maintenance series</p>
      <h2>{city.title}: what rental operators actually need to plan for</h2>
      <p>{city.city} maintenance is shaped by {city.climate}. The local rental base includes {city.stock}, so a work order is rarely just a generic repair ticket. The best operators treat each issue as a small operating decision: what is urgent, who needs to approve it, which vendor is right for the building, and what record should exist afterward.</p>

      <section className="article-answer-box">
        <span className="eyebrow">Short answer</span>
        <p>For rental property maintenance in {city.city}, operators should prioritize {city.issue}, then keep tenant updates, owner approvals, vendor decisions, estimates, and invoice records in a single work-order history.</p>
      </section>

      <h3>Common Maintenance Needs</h3>
      <p>Common calls in {city.city} include {city.issue}. The first useful step is not always dispatch. It is getting the tenant to send the right context: where the problem is, whether it is active right now, whether there are photos, whether a shutoff or breaker has been tried, and when a vendor can enter.</p>

      <h3>How To Approach Repairs</h3>
      <p>For {city.city} property managers and owners, a strong process is to {city.approach}. LivingRelay supports that kind of process by turning tenant messages into structured work orders, then keeping approval notes, vendor outreach, estimates, and invoices attached to the property record.</p>

      <h3>Service Providers To Compare</h3>
      <p>{city.providers} The point is not that one marketplace should replace a trusted local vendor. The point is that managers need a visible comparison set when their first-choice plumber, electrician, HVAC technician, handyman, roofer, or appliance repair pro cannot take the job.</p>

      <h3>What Has Changed In The Last 10 Years</h3>
      <p>{city.decade} Tenants expect faster status updates. Owners expect better cost control. Vendors expect clearer scopes before they drive across town. A repair workflow that used to fit in three text messages now often needs photos, approval thresholds, invoice delivery rules, and a clean audit trail.</p>

      <h3>Common Costs And Expenses</h3>
      <p>{city.costs} As a planning baseline, national cost guides often place handyman projects around $176 to $689, plumbing calls around $180 to $496, electrician work around $163 to $538, and HVAC repairs across a much wider $130 to $2,000 range. {city.city} pricing can land above or below that depending on licensing, urgency, access, materials, and whether the repair requires repeat visits.</p>

      <FaqSection items={cityFaqs} compact />

      <section className="article-cta">
        <div>
          <span className="eyebrow">LivingRelay</span>
          <h3>Give every repair a cleaner record.</h3>
          <p>Use LivingRelay to collect tenant details, coordinate owner approvals, contact vendors, and preserve invoice history for each rental property.</p>
        </div>
        <SalesLeadForm context={`${city.city} property maintenance guide`} compact />
      </section>
    </article>
  );
}

function FaqSection({ items, compact = false }) {
  return (
    <section className={compact ? "faq-section compact" : "faq-section"} aria-label="Frequently asked questions">
      <span className="eyebrow">FAQ</span>
      <h2>Questions people ask</h2>
      <div className="faq-list">
        {items.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function PrivacyContent() {
  return (
    <section className="privacy-document" aria-label="Privacy Policy">
      <p className="privacy-date">Effective May 4, 2026</p>
      <h2>Privacy Policy</h2>
      <p>LivingRelay provides rental repair coordination software for property managers, owners, tenants, and vendors. This policy explains the information we collect, how we use it, and the choices available to users.</p>

      <h3>Information We Collect</h3>
      <p>We collect account and contact information such as names, phone numbers, roles, property assignments, and authentication details. We collect property and repair workflow information such as property names, addresses, unit labels, repair requests, access notes, work order status, vendor details, approval history, invoice records, and support requests.</p>

      <h3>Messages And Repair Content</h3>
      <p>LivingRelay may process tenant, manager, owner, and vendor messages, photos, call metadata, and repair notes so the service can classify issues, route approvals, coordinate vendors, keep audit history, and provide support.</p>

      <h3>SMS Consent And Phone Numbers</h3>
      <p>LivingRelay uses phone numbers and SMS consent records to deliver requested service, security, account, maintenance, scheduling, vendor coordination, billing, invoice, support, and QA communications. LivingRelay does not sell, rent, or share SMS opt-in consent, phone numbers, or SMS message data with third parties or affiliates for their marketing or promotional purposes.</p>

      <h3>How We Use Information</h3>
      <p>We use information to operate the product, authenticate users, provide role-scoped access, coordinate repair workflows, maintain invoice and tax records, troubleshoot issues, improve reliability, prevent abuse, and meet legal or compliance obligations.</p>

      <h3>Service Providers</h3>
      <p>We may use trusted service providers for hosting, database infrastructure, messaging, phone verification, payment infrastructure, email, voice, analytics, logging, and support operations. These providers process information only as needed to provide services to LivingRelay and are not permitted to use it for their own marketing.</p>

      <h3>Payments</h3>
      <p>Repair payments are handled off platform. LivingRelay may track invoice status and billing events, and may use payment infrastructure for subscription or coordination fees where applicable. We do not intentionally store full payment card numbers on LivingRelay servers.</p>

      <h3>Sharing</h3>
      <p>We share repair workflow information with users who need it for the property workflow, such as managers, owners, tenants, and vendors. We do not sell personal information, and we do not share mobile opt-in data or SMS consent with third parties for marketing.</p>

      <h3>Retention</h3>
      <p>We retain information for as long as needed to provide the service, keep repair and invoice audit trails, resolve disputes, comply with legal obligations, and support legitimate business purposes.</p>

      <h3>Your Choices</h3>
      <p>To request access, correction, deletion, or account assistance, contact privacy@livingrelay.com. Some records may need to be retained when required for security, compliance, billing, audit, or legal reasons.</p>

      <h3>Security</h3>
      <p>We use reasonable administrative, technical, and organizational safeguards designed to protect information. No internet service can be guaranteed to be completely secure.</p>

      <h3>Contact</h3>
      <p>Questions about this policy can be sent to privacy@livingrelay.com or support@livingrelay.com.</p>
    </section>
  );
}

function TermsContent() {
  return (
    <section className="privacy-document" aria-label="Terms and Conditions">
      <p className="privacy-date">Effective May 4, 2026</p>
      <h2>Terms And Conditions</h2>
      <p>These Terms and Conditions govern your use of LivingRelay, including the LivingRelay web app, mobile app, support workflows, and SMS notification program. By using LivingRelay or providing your contact information for a LivingRelay-managed account, property, work order, vendor workflow, or QA test, you agree to these terms.</p>

      <h3>Program Name And Description</h3>
      <p>LivingRelay SMS Notifications is an operational messaging program for rental property maintenance coordination. Messages may include login verification codes, tenant maintenance request updates, manager review notices, vendor scheduling updates, owner approval requests, invoice or payment status updates, QA test messages, and support notices.</p>

      <h3>Consent To Receive Messages</h3>
      <p>You may receive messages after you provide your phone number to LivingRelay, are invited to a LivingRelay-managed property or account, participate in a work order or vendor workflow, complete onboarding, request support, or ask an administrator to run QA tests. Consent to receive marketing SMS is not a condition of purchasing any goods or services.</p>

      <h3>Message Frequency</h3>
      <p>Message frequency varies based on account activity, property setup, login activity, repair requests, approval steps, vendor scheduling, invoice status, support requests, and QA testing. A single work order may generate several messages as status changes.</p>

      <h3>Message And Data Rates</h3>
      <p>Message and data rates may apply. Carriers are not liable for delayed or undelivered messages.</p>

      <h3>Help And Opt-Out</h3>
      <p>Reply <strong>HELP</strong> for help. Reply <strong>STOP</strong> to opt out. You may also contact support@livingrelay.com for assistance. After you reply <strong>STOP</strong>, you may receive one final confirmation message and will no longer receive LivingRelay SMS messages unless you opt in again.</p>

      <h3>Acceptable Use</h3>
      <p>You agree to use LivingRelay only for lawful property maintenance, account, support, and administrative purposes. You may not use the service to send abusive, deceptive, unlawful, or unauthorized messages, or to interfere with LivingRelay systems or other users.</p>

      <h3>Accounts And Roles</h3>
      <p>LivingRelay uses roles such as manager, owner, tenant, vendor, and site administrator to control access to property and repair information. You are responsible for keeping account credentials secure and for notifying LivingRelay if you believe your account has been accessed without authorization.</p>

      <h3>Repair Coordination</h3>
      <p>LivingRelay helps organize maintenance requests, approvals, vendor coordination, communications, and records. LivingRelay does not guarantee vendor availability, repair outcomes, pricing, payment settlement, or emergency response times unless separately agreed in writing.</p>

      <h3>Privacy</h3>
      <p>Our Privacy Policy explains how we collect, use, and protect information, including phone numbers and SMS consent records. Review it at <a href="/privacy">https://livingrelay.com/privacy</a>.</p>

      <h3>Changes To These Terms</h3>
      <p>We may update these terms from time to time. The effective date above shows when these terms were last updated. Continued use of LivingRelay after updates means you accept the revised terms.</p>

      <h3>Contact</h3>
      <p>Questions about these terms or the SMS program can be sent to support@livingrelay.com.</p>
    </section>
  );
}

function PublicCard({ icon, title, text }) {
  return (
    <article className="public-card">
      <span className="section-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function SalesLeadEmbed({
  context,
  compact = false,
  id,
  eyebrow = "For owners and managers",
  title = "Want to see whether LivingRelay fits your rental workflow?",
  text = "Share a few details and someone from LivingRelay will follow up about maintenance intake, owner approvals, vendor coordination, and repair records.",
  submitLabel,
  initialRole,
  initialMessage,
  messageLabel,
  messagePlaceholder
}) {
  return (
    <section id={id} className={compact ? "sales-lead-band compact" : "sales-lead-band"} aria-label="Talk to LivingRelay">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <SalesLeadForm
        context={context}
        submitLabel={submitLabel}
        initialRole={initialRole}
        initialMessage={initialMessage}
        messageLabel={messageLabel}
        messagePlaceholder={messagePlaceholder}
      />
    </section>
  );
}

function SalesLeadForm({
  context,
  compact = false,
  submitLabel = "Talk to someone",
  initialRole = "Property manager",
  initialMessage = "",
  messageLabel = "What would you like to solve?",
  messagePlaceholder = ""
}) {
  const [form, setForm] = useState({
    contactName: "",
    role: initialRole,
    company: "",
    email: "",
    phone: "",
    market: "",
    unitCount: "",
    message: initialMessage
  });
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submitLead(event) {
    event.preventDefault();
    if (!form.email.trim() && !form.phone.trim()) {
      setStatus({ state: "error", message: "Add an email or phone number so we can follow up." });
      return;
    }
    setStatus({ state: "saving", message: "Sending..." });
    try {
      const payload = {
        ...form,
        pageLabel: context,
        pageUrl: window.location.href,
        utmSource: new URLSearchParams(window.location.search).get("utm_source") || "",
        utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || "",
        utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || "",
        utmContent: new URLSearchParams(window.location.search).get("utm_content") || "",
        utmTerm: new URLSearchParams(window.location.search).get("utm_term") || ""
      };
      const response = await fetch("/api/public/sales-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await encryptContactTransitFields(payload))
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send the lead.");
      setForm({
        contactName: "",
        role: form.role,
        company: "",
        email: "",
        phone: "",
        market: "",
        unitCount: "",
        message: initialMessage
      });
      setStatus({ state: "ok", message: "Thanks. We received your request." });
    } catch (error) {
      setStatus({ state: "error", message: error.message || "Could not send the lead." });
    }
  }

  return (
    <form className={compact ? "sales-lead-form compact" : "sales-lead-form"} onSubmit={submitLead}>
      <label>Name<input value={form.contactName} onChange={(event) => update("contactName", event.target.value)} autoComplete="name" required /></label>
      <label>Role<select value={form.role} onChange={(event) => update("role", event.target.value)}>
        <option>Property manager</option>
        <option>Owner</option>
        <option>Owner-manager</option>
        <option>Small landlord</option>
      </select></label>
      <label>Company or property<input value={form.company} onChange={(event) => update("company", event.target.value)} autoComplete="organization" /></label>
      <label>Email<input value={form.email} onChange={(event) => update("email", event.target.value)} inputMode="email" autoComplete="email" /></label>
      <label>Phone<input value={form.phone} onChange={(event) => update("phone", event.target.value)} inputMode="tel" autoComplete="tel" /></label>
      <label>Market<input value={form.market} onChange={(event) => update("market", event.target.value)} placeholder="City or region" /></label>
      <label>Portfolio size<input value={form.unitCount} onChange={(event) => update("unitCount", event.target.value)} placeholder="Units or properties" /></label>
      <label className="span-2">{messageLabel}<textarea value={form.message} onChange={(event) => update("message", event.target.value)} placeholder={messagePlaceholder} rows={3} /></label>
      <button className="primary" type="submit" disabled={status.state === "saving"}>
        <Send size={16} /> {status.state === "saving" ? "Sending" : submitLabel}
      </button>
      {status.message && <p className={`lead-form-status ${status.state === "error" ? "error" : status.state === "ok" ? "ok" : ""}`}>{status.message}</p>}
    </form>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer-brand">
        <a className="public-brand" href="/marketing" aria-label="LivingRelay marketing page">
          <span className="app-mark"><Wrench size={20} /></span>
          <strong>LivingRelay</strong>
        </a>
        <p>SMS-first property maintenance coordination for small rental operators.</p>
      </div>

      <div className="public-footer-links">
        <div>
          <h2>Company</h2>
          <a href="/about">About</a>
          <a href="/support">Support</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </div>
        <div>
          <h2>Product</h2>
          <a href="/sales">Talk to sales</a>
          <a href="/ios">iOS app download</a>
          <a href="/referral-program">Referral program</a>
          <a href="/resources">Maintenance resources</a>
          <a href="/">Open app</a>
        </div>
        <div>
          <h2>Templates</h2>
          {templatePages.slice(0, 5).map((template) => (
            <a href={`/templates/${template.slug}`} key={template.slug}>{template.h1}</a>
          ))}
        </div>
        <div>
          <h2>City Guides</h2>
          <a href="/property-maintenance">All property maintenance guides</a>
          {publicFooterCityLinks.map((city) => (
            <a href={`/property-maintenance/${city.slug}`} key={city.slug}>{city.city} property maintenance</a>
          ))}
        </div>
      </div>
    </footer>
  );
}

const tenantIssueStarters = [
  "Water is leaking or dripping",
  "Drain, toilet, or sink is backed up",
  "Heat, AC, or thermostat is not working",
  "Outlet, lights, or power issue",
  "Lock, door, or window will not secure"
];

const renterServiceTemplates = [
  {
    id: "adopt-livingrelay",
    label: "Ask manager",
    issue: "Can we use LivingRelay for this rental?",
    access: "It gives renters one text-first place for maintenance while owners and property managers get approvals, vendor coordination, and records without hunting through separate threads."
  },
  {
    id: "owner-manager-loop",
    label: "Ask owner",
    issue: "Could we use LivingRelay for maintenance at this rental?",
    access: "It keeps repair requests, approvals, vendor updates, and invoices in one shared record instead of scattered texts."
  },
  {
    id: "cleaner-process",
    label: "Cleaner process",
    issue: "Could we set up LivingRelay before the next maintenance issue?",
    access: "That way future requests go through the app instead of scattered texts, and everyone can see status, approvals, vendor booking, and repair history."
  }
];

const defaultRenterServiceRequest = {
  renterName: "",
  rentalAddress: "",
  unit: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  managerName: "",
  managerPhone: "",
  managerEmail: "",
  sendOwner: false,
  sendManager: true,
  textChannel: true,
  emailChannel: true,
  templateId: "adopt-livingrelay",
  message: ""
};

function buildRenterServiceMessage(request, templateId = request.templateId) {
  const template = renterServiceTemplates.find((item) => item.id === templateId) || renterServiceTemplates[0];
  const name = request.renterName?.trim() || "your renter";
  const address = [request.rentalAddress, request.unit].filter(Boolean).join(", ") || "my rental";
  return `Hi, this is ${name} at ${address}. ${template.issue} ${template.access}`;
}

function parseSseEvent(chunk = "") {
  const event = chunk.split("\n").find((line) => line.startsWith("event: "))?.slice(7).trim() || "message";
  const data = chunk.split("\n").filter((line) => line.startsWith("data: ")).map((line) => line.slice(6)).join("\n");
  if (!data) return null;
  return { event, data: JSON.parse(data) };
}

const rememberedPhoneStorageKey = "livingrelay.rememberedPhone";
const authTokenStorageKey = "livingrelay.authToken";
const siteAdminTokenStorageKey = "livingrelay.siteAdminToken";
const siteAdminRememberStorageKey = "livingrelay.siteAdminRemember";
const sessionUserStorageKey = "livingrelay.sessionUserId";
const prospectingTargetMarkets = ["San Francisco", "Oakland", "San Jose", "Los Angeles", "San Diego"];
const prospectingUnitRanges = ["Unknown", "1", "2-4", "5-10", "10+"];
const prospectingVacancyStates = ["Unknown", "Yes", "Likely", "No"];
const prospectingOwnerConfidence = ["Medium", "High", "Low"];
const prospectingPmsComplexity = ["Unknown", "None visible", "Lightweight", "Complex"];
const prospectingSourceTypes = ["Other", "By-owner listing", "Small multifamily", "Apartment site", "Directory", "Small PM"];
const prospectingFitFilters = ["Owner 1-5 + vacancy + phone", "Has maintenance signals", "No complex PMS", "Small PM mix", "All"];
const prospectingSourceMixTargets = [
  { label: "Owner leads", segments: ["Small owner", "Small landlord"], target: "60%" },
  { label: "Small buildings", sourceTypes: ["Small multifamily", "Apartment site"], target: "25%" },
  { label: "Small PMs", sourceTypes: ["Small PM"], target: "15%" }
];

function storedSessionValue(key) {
  return window.localStorage.getItem(key) || window.sessionStorage.getItem(key) || "";
}

function persistSessionValue(key, value, remember = true) {
  const primaryStorage = remember ? window.localStorage : window.sessionStorage;
  const secondaryStorage = remember ? window.sessionStorage : window.localStorage;
  primaryStorage.setItem(key, value);
  secondaryStorage.removeItem(key);
}

function clearStoredSessionValue(key) {
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

function App() {
  const [session, setSession] = useState(() => {
    const userId = storedSessionValue(sessionUserStorageKey);
    return userId ? { userId } : null;
  });
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [rememberedPhone, setRememberedPhone] = useState("");
  const [editingRememberedPhone, setEditingRememberedPhone] = useState(false);
  const [sitePassword, setSitePassword] = useState("");
  const [siteAdminRemember, setSiteAdminRemember] = useState(() => window.localStorage.getItem(siteAdminRememberStorageKey) !== "false");
  const [siteAdminToken, setSiteAdminToken] = useState(() => storedSessionValue(siteAdminTokenStorageKey));
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem(authTokenStorageKey) || "");
  const [loginError, setLoginError] = useState("");
  const [loginVerification, setLoginVerification] = useState({ challengeId: "", code: "", state: "idle", message: "" });
  const [activePropertyId, setActivePropertyId] = useState("p-1");
  const [orders, setOrders] = useState(seedOrders);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [activeOrderId, setActiveOrderId] = useState(seedOrders[0].id);
  const [request, setRequest] = useState(defaultRequest);
  const [createHandoff, setCreateHandoff] = useState({ state: "idle", orderId: "", message: "" });
  const [phoneVerifiedBanner, setPhoneVerifiedBanner] = useState("");
  const [twilioStatus, setTwilioStatus] = useState(null);
  const [twilioCheck, setTwilioCheck] = useState({ state: "idle", message: "" });
  const [sendStatus, setSendStatus] = useState("");
  const [demoStatus, setDemoStatus] = useState("");
  const [appData, setAppData] = useState(null);
  const [adminSection, setAdminSection] = useState("operations");
  const referralCodeFromUrl = referralTokenFromLocation();
  const [landingMode, setLandingMode] = useState(() => new URLSearchParams(window.location.search).get("mode") || (referralCodeFromUrl ? "create" : "create"));
  const [signupForm, setSignupForm] = useState({
    propertyName: "",
    address: "",
    managerName: "",
    managerPhone: "",
    role: "Property manager",
    pin: "",
    referralToken: referralCodeFromUrl
  });
  const [signupStatus, setSignupStatus] = useState({ state: "idle", message: "" });
  const [signupVerification, setSignupVerification] = useState({ challengeId: "", code: "", token: "", state: "idle", message: "" });
  const siteAdminConsoleAvailable = isSiteAdminConsoleHost();
  const demoExperienceAvailable = isDemoExperienceHost();
  const workOrderHandoffRef = useRef(null);
  const demoLoginShortcutsAvailable = isDemoLoginShortcutsHost();
  const accountsData = appData?.accounts || accounts;
  const peopleData = appData?.people || (siteAdminConsoleAvailable ? people : people.filter((person) => person.role !== "Site Admin"));
  const authPeople = siteAdminConsoleAvailable
    ? peopleData.filter((person) => person.role === "Site Admin")
    : peopleData.filter((person) => person.role !== "Site Admin");
  const loginPeople = demoLoginShortcutsAvailable
    ? siteAdminConsoleAvailable
      ? authPeople
      : ["Manager", "Owner", "Tenant"]
        .map((role) => authPeople.find((person) => person.role === role))
        .filter(Boolean)
    : [];
  const propertiesData = appData?.properties || properties;
  const vendorsData = appData?.vendors || vendors;
  const billingEventsData = appData?.billingEvents || seedBillingEvents;
  const referralsData = appData?.referrals || [];
  const prospectingLeadsData = appData?.prospectingLeads || [];
  const integrationConnectionsData = appData?.integrationConnections || [];
  const integrationEventsData = appData?.integrationEvents || [];
  const pmsProvidersData = appData?.pmsProviders || [];
  const accessRequestsData = appData?.accessRequests || [];
  const platformSettings = appData?.platformSettings || { vendorCallTestMode: true, productionVendorCallsEnabled: true, vendorCallTestNumber: "" };
  const stripeData = appData?.stripe || { configured: false, missing: ["STRIPE_SECRET_KEY", "APP_PUBLIC_URL"], dispatchFeeCents: 2500 };
  const auditData = appData?.auditLog || [];
  const staleWorkOrders = appData?.staleWorkOrders || [];
  const activeProperty = propertiesData.find((property) => property.id === activePropertyId) || propertiesData[0];
  const visibleOrders = orders.filter((order) => order.propertyId === activeProperty.id);
  const activeOrder = visibleOrders.find((order) => order.id === activeOrderId) || visibleOrders[0];
  const visibleStaleOrders = staleWorkOrders.filter((order) => order.propertyId === activeProperty.id);
  const user = session ? buildPhoneIdentityUser(peopleData.find((person) => person.id === session.userId), peopleData) : null;
  const userAccessiblePropertyIds = accessiblePropertyIdsForPerson(user);
  const userAccountIds = addUniqueValues(
    user?.accountIds || [],
    propertiesData.filter((property) => userAccessiblePropertyIds.includes(property.id)).map((property) => property.accountId)
  );
  const userMergeableProperties = user && ["Manager", "Owner"].includes(user.role)
    ? propertiesData.filter((property) => userAccessiblePropertyIds.includes(property.id) || userAccountIds.includes(property.accountId))
    : [];
  const propertyOverlapGroups = findPropertyAddressOverlapGroups(userMergeableProperties);
  const vendorProfile = user?.role === "Vendor" ? vendorsData.find((vendor) => vendor.personId === user.id || vendor.name === user.name || vendor.trade === user.trade) : null;
  const tenantOrders = user?.role === "Tenant" ? visibleOrders.filter((order) => isTenantVisibleWorkOrder(order, user)) : [];
  const vendorOrders = user?.role === "Vendor" ? visibleOrders.filter((order) => isVendorVisibleWorkOrder(order, vendorProfile, user)) : [];
  const livePropertyOrders = visibleOrders.filter(isLiveDashboardWorkOrder);
  const livePropertyInvoices = invoices.filter((invoice) => invoice.propertyId === activeProperty.id && isLiveInvoice(invoice, livePropertyOrders));
  const normalizedLoginPhone = normalizedPhoneDigits(phone);
  const siteAdminUser = peopleData.find((person) => person.role === "Site Admin");
  const loginCandidate = siteAdminConsoleAvailable
    ? siteAdminUser
    : buildPhoneIdentityUser(authPeople.find((person) => samePhone(person.phone, normalizedLoginPhone) && person.pin === pin), authPeople);
  const route = parseDashboardRoute();

  function authHeaders(headers = {}) {
    const token = siteAdminToken || authToken;
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
  }

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: authHeaders(options.headers || {})
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
    return data;
  }

  function persistSession(userId, token = "") {
    setSession({ userId });
    window.localStorage.setItem(sessionUserStorageKey, userId);
    if (token) {
      setAuthToken(token);
      window.localStorage.setItem(authTokenStorageKey, token);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() }).catch(() => {});
    setSession(null);
    setSiteAdminToken("");
    setAuthToken("");
    clearStoredSessionValue(siteAdminTokenStorageKey);
    window.localStorage.removeItem(authTokenStorageKey);
    clearStoredSessionValue(sessionUserStorageKey);
    window.history.replaceState({}, "", signedOutUrl());
  }

  async function expireSiteAdminSession(message = "Admin session expired. Please log in again.") {
    await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() }).catch(() => {});
    setSession(null);
    setSiteAdminToken("");
    setAuthToken("");
    setLoginError(message);
    clearStoredSessionValue(siteAdminTokenStorageKey);
    window.localStorage.removeItem(authTokenStorageKey);
    clearStoredSessionValue(sessionUserStorageKey);
    window.history.replaceState({}, "", signedOutUrl());
  }

  useEffect(() => {
    loadState();
    confirmBillingReturn();
  }, []);

  useEffect(() => {
    if (siteAdminConsoleAvailable) return;
    const storedPhone = formatPhoneInput(window.localStorage.getItem(rememberedPhoneStorageKey) || "");
    if (!storedPhone) return;
    setRememberedPhone(storedPhone);
    setPhone((current) => current || storedPhone);
  }, [siteAdminConsoleAvailable]);

  useEffect(() => {
    if (createHandoff.state !== "created" || !createHandoff.orderId) return;
    const timeout = window.setTimeout(() => {
      workOrderHandoffRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 140);
    return () => window.clearTimeout(timeout);
  }, [createHandoff.state, createHandoff.orderId]);

  useEffect(() => {
    if (user) return;
    trackPageView();
  }, [user?.id]);

  useEffect(() => {
    function applyRoute() {
      const nextRoute = parseDashboardRoute();
      if (!nextRoute) return;
      setAdminSection(sectionFromRoutePage(nextRoute.role, nextRoute.page));
    }
    window.addEventListener("popstate", applyRoute);
    applyRoute();
    return () => window.removeEventListener("popstate", applyRoute);
  }, []);

  useEffect(() => {
    if (!user) return;
    const nextUrl = buildDashboardUrl(user.role, adminSection, {
      propertyId: user.role === "Site Admin" ? "" : activeProperty?.id,
      orderId: user.role === "Manager" ? activeOrder?.id : ""
    });
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
    trackPageView(nextUrl);
  }, [user?.id, user?.role, adminSection, activeProperty?.id, activeOrder?.id]);

  async function loadState() {
    const response = await fetch("/api/state");
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(data.error || `State load failed: ${response.status}`);
    setAppData(data);
    setOrders(data.workOrders || seedOrders);
    setInvoices(data.invoices || seedInvoices);
    setTwilioStatus(data.twilio);
    const params = new URLSearchParams(window.location.search);
    const reviewId = new URLSearchParams(window.location.search).get("review");
    if (reviewId) setActiveOrderId(reviewId);
    const propertyId = params.get("property");
    const section = params.get("section") || (route ? sectionFromRoutePage(route.role, route.page) : "");
    if (propertyId) setActivePropertyId(propertyId);
    if (section) setAdminSection(section);
  }

  async function confirmBillingReturn() {
    const params = new URLSearchParams(window.location.search);
    const billingReturn = params.get("billing");
    const sessionId = params.get("session_id");
    if (!sessionId || !["setup-complete", "owner-subscription-complete"].includes(billingReturn)) return;
    await apiRequest(billingReturn === "owner-subscription-complete" ? "/api/billing/confirm-owner-subscription" : "/api/billing/confirm-setup-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId })
    });
    params.delete("billing");
    params.delete("session_id");
    const nextQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`);
    await loadState();
  }

  async function login(event) {
    event.preventDefault();
    setLoginError("");
    const finishLogin = (data) => {
      const rawMatch = data.person || peopleData.find((person) => person.id === data.userId);
      const match = buildPhoneIdentityUser(rawMatch, peopleData);
      const nextRememberedPhone = formatPhoneInput(match?.phone || phone);
      if (nextRememberedPhone && match?.role !== "Site Admin") {
        window.localStorage.setItem(rememberedPhoneStorageKey, nextRememberedPhone);
        setRememberedPhone(nextRememberedPhone);
        setPhone(nextRememberedPhone);
        setEditingRememberedPhone(false);
      }
      persistSession(data.userId, data.token);
      setActivePropertyId(defaultPropertyIdForLogin(match, propertiesData));
      const requestedSection = sectionFromRoutePage(parseDashboardRoute()?.role, parseDashboardRoute()?.page);
      setAdminSection(requestedSection === "account" ? "account" : match?.role === "Site Admin" ? "accounts" : "operations");
      setLoginVerification({ challengeId: "", code: "", state: "idle", message: "" });
    };
    if (loginCandidate?.role === "Site Admin") {
      if (!siteAdminConsoleAvailable) {
        setLoginError("Admin console is only available at admin.livingrelay.com");
        return;
      }
      const response = await encryptedJsonFetch("/api/site-admin/login", {
        payload: { password: sitePassword, remember: siteAdminRemember },
        fields: ["password"]
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginError(data.error || "Invalid admin console credentials");
        return;
      }
      setSession({ userId: data.userId });
      setSiteAdminToken(data.token || "");
      window.localStorage.setItem(siteAdminRememberStorageKey, siteAdminRemember ? "true" : "false");
      if (data.token) persistSessionValue(siteAdminTokenStorageKey, data.token, siteAdminRemember);
      persistSessionValue(sessionUserStorageKey, data.userId, siteAdminRemember);
      setActivePropertyId(propertiesData[0]?.id);
      setAdminSection("accounts");
      setSitePassword("");
      await loadState();
      return;
    }
    if (!phone || !pin) {
      setLoginError("Phone and PIN are required.");
      return;
    }
    if (normalizedPhoneDigits(phone).length !== 10) {
      setLoginError("Enter a 10-digit phone number.");
      return;
    }
    if (formatPinInput(pin).length !== 4) {
      setLoginError("Enter a 4-digit PIN.");
      return;
    }
    if (!loginVerification.challengeId) {
      setLoginVerification({ challengeId: "", code: "", state: "sending", message: "Starting verification..." });
      const response = await encryptedJsonFetch("/api/auth/login/start", {
        payload: { phone, pin },
        fields: ["phone", "pin"]
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginVerification({ challengeId: "", code: "", state: "idle", message: "" });
        setLoginError(data.error || "Could not send verification code.");
        return;
      }
      if (data.userId) {
        finishLogin(data);
        return;
      }
      setLoginVerification({
        challengeId: data.challengeId,
        code: "",
        state: "sent",
        message: data.devCode ? `Verification code: ${data.devCode}` : data.message || (data.delivery === "phone_call" ? "You will receive a phone call with your verification code." : "We sent a verification code to that phone.")
      });
      return;
    }
    const verificationCode = formatVerificationCodeInput(loginVerification.code);
    if (verificationCode.length !== 6) {
      setLoginVerification((current) => ({ ...current, code: verificationCode, state: "sent", message: "Enter the 6-digit verification code from the phone call." }));
      return;
    }
    setLoginVerification((current) => ({ ...current, state: "checking", message: "Checking verification code..." }));
    const response = await encryptedJsonFetch("/api/auth/login/verify", {
      payload: { phone, pin, challengeId: loginVerification.challengeId, code: verificationCode },
      fields: ["phone", "pin"]
    });
    const data = await response.json();
    if (!response.ok) {
      setLoginVerification((current) => ({ ...current, state: "sent", message: data.error || "Could not verify that code." }));
      return;
    }
    finishLogin(data);
  }

  async function createOnboardingProperty(event) {
    event.preventDefault();
    if (normalizedPhoneDigits(signupForm.managerPhone).length !== 10) {
      setSignupStatus({ state: "error", message: "Enter a 10-digit phone number." });
      return;
    }
    if (signupForm.pin && formatPinInput(signupForm.pin).length !== 4) {
      setSignupStatus({ state: "error", message: "Use a 4-digit PIN, or leave it blank to auto-generate one." });
      return;
    }
    setSignupStatus({ state: "saving", message: signupVerification.token ? "Creating your property..." : "Starting phone verification..." });
    try {
      let phoneVerificationToken = signupVerification.token;
      if (!phoneVerificationToken && !signupVerification.challengeId) {
        const response = await encryptedJsonFetch("/api/phone-verifications/start", {
          payload: { phone: signupForm.managerPhone, purpose: "onboarding" },
          fields: ["phone"]
        });
        const data = await response.json();
        if (!response.ok) {
          setSignupStatus({ state: "error", message: data.error || "Could not send verification code." });
          return;
        }
        setSignupVerification({
          challengeId: data.challengeId,
          code: "",
          token: "",
          state: "sent",
          message: data.devCode ? `Verification code: ${data.devCode}` : data.sms?.delivery === "phone_call" ? "You will receive a phone call with your verification code." : "We sent a verification code to your phone."
        });
        setSignupStatus({ state: "idle", message: "Enter the verification code to finish creating the property." });
        return;
      }
      if (!phoneVerificationToken) {
        const verificationCode = formatVerificationCodeInput(signupVerification.code);
        if (verificationCode.length !== 6) {
          setSignupVerification((current) => ({ ...current, code: verificationCode, state: "sent", message: "Enter the 6-digit verification code from the phone call." }));
          setSignupStatus({ state: "idle", message: "Enter the verification code to finish creating the property." });
          return;
        }
        const response = await fetch("/api/phone-verifications/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId: signupVerification.challengeId, code: verificationCode, purpose: "onboarding" })
        });
        const data = await response.json();
        if (!response.ok) {
          setSignupVerification((current) => ({ ...current, state: "sent", message: "" }));
          setSignupStatus({ state: "error", message: data.error || "Could not verify that code." });
          return;
        }
        phoneVerificationToken = data.token;
        setSignupVerification((current) => ({ ...current, token: data.token, state: "ok", message: "Phone verified." }));
      }
      const response = await encryptedJsonFetch("/api/onboarding/property", {
        payload: { ...signupForm, phoneVerificationToken },
        fields: ["managerPhone", "pin"]
      });
      const data = await response.json();
      if (!response.ok) {
        setSignupStatus({ state: "error", message: data.error || "Could not create property." });
        return;
      }
      await loadState();
      setPhone(data.person.phone);
      setPin(data.person.pin);
      persistSession(data.person.id, data.token);
      setActivePropertyId(data.property.id);
      setAdminSection("operations");
      setSignupVerification({ challengeId: "", code: "", token: "", state: "idle", message: "" });
      setPhoneVerifiedBanner(`Phone verified for ${data.account?.name || data.property.name}.`);
      setSignupStatus({ state: "ok", message: `${data.property.name} is ready${data.reconciled ? " on your existing account" : ""}. Your PIN is ${data.person.pin}.` });
    } catch (error) {
      setSignupStatus({ state: "error", message: error.message });
    }
  }

  async function createOrder(submitEvent) {
    submitEvent.preventDefault();
    setCreateHandoff({ state: "saving", orderId: "", message: "Creating the work order..." });
    try {
      const triage = classifyIssue(request.issue);
      let mediaAttachments = [];
      try {
        mediaAttachments = await prepareIssueMediaAttachments(request.mediaFiles || []);
      } catch (error) {
        setRequest((current) => ({ ...current, mediaError: error.message }));
        setCreateHandoff({ state: "error", orderId: "", message: error.message });
        return;
      }
      const unit = propertyLocationLabel(activeProperty);
      const tenant = user?.role === "Tenant"
        ? user
        : peopleData.find((person) => person.role === "Tenant" && person.propertyIds?.includes(activeProperty.id) && person.unit === unit)
          || peopleData.find((person) => person.role === "Tenant" && person.propertyIds?.includes(activeProperty.id));
      const vendor = vendorsData.find((item) => item.trade === triage.trade) || vendorsData[0];
      const needsOwner = triage.estimate > 150;
      const tenantDefaultAvailability = request.defaultAvailability || tenant?.defaultAvailability || "";
      const access = request.useDefaultAvailability && tenantDefaultAvailability ? tenantDefaultAvailability : request.access;
      const notifyManager = request.escalationChoice !== "self_solve";
      const requestVendorOutreach = request.escalationChoice === "vendor_outreach";
      if (appData) {
        const data = await apiRequest("/api/admin/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId: activeProperty.id,
            unit,
            tenantId: tenant?.id || "",
            trade: triage.trade,
            severity: triage.severity,
            status: "Manager review",
            estimate: triage.estimate,
            vendorId: vendor?.id || "",
            issue: request.issue,
            access,
            mediaAttachments,
            notifyManager,
            requestVendorOutreach,
            tenantDefaultAvailability: request.saveDefaultAvailability ? tenantDefaultAvailability || access : undefined,
            actorName: user?.name || "Logged-in user",
            actorRole: user?.role || "User"
          })
        });
        if (request.saveDefaultAvailability && tenant?.id && (tenantDefaultAvailability || access)) {
          await apiRequest(`/api/people/${tenant.id}/availability`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ defaultAvailability: tenantDefaultAvailability || access })
          });
        }
        if (data.order?.id) {
          setActiveOrderId(data.order.id);
          setCreateHandoff({
            state: "created",
            orderId: data.order.id,
            message: `${data.order.id} is ready for manager review.`
          });
        }
        setRequest({ ...defaultRequest, unit: propertyLocationLabel(activeProperty), defaultAvailability: tenantDefaultAvailability || access });
        await loadState();
        return;
      }
      const id = `WO-${Math.floor(3000 + Math.random() * 6000)}`;
      const order = {
        id,
        propertyId: activeProperty.id,
        unit,
        tenantId: tenant?.id || null,
        trade: triage.trade,
        severity: triage.severity,
        status: notifyManager ? "Manager review" : "Tenant troubleshooting",
        estimate: triage.estimate,
        vendorId: vendor.id,
        issue: request.issue,
        access,
        managerApproved: false,
        ownerApproved: !needsOwner,
        invoiceId: null,
        timeline: [
          event(`${user?.role || "User"} request created`, `${unit} request submitted from logged-in dashboard.`),
          event("AI triaged request", `${triage.severity} ${triage.trade}; ${notifyManager ? `suggested ${vendor.name}` : "tenant self-solve guidance started"}.`),
          ...(requestVendorOutreach ? [event("Tenant requested vendor outreach", `${access || "Availability needs confirmation"} shared for vendor calls.`)] : [])
        ],
        messages: [
          sms(user?.role === "Tenant" ? "tenant" : "relay", request.issue),
          sms("relay", `Thanks. LivingRelay classified this as ${triage.trade}. ${notifyManager ? "Manager review is next." : "Try the self-solve steps first; escalate if it still needs help."}`)
        ],
        media: mediaAttachments
      };
      setOrders((current) => [order, ...current]);
      setActiveOrderId(id);
      setCreateHandoff({ state: "created", orderId: id, message: `${id} is ready for manager review.` });
      setRequest({ ...defaultRequest, unit: propertyLocationLabel(activeProperty), defaultAvailability: tenantDefaultAvailability || access });
    } catch (error) {
      setCreateHandoff({ state: "error", orderId: "", message: error.message });
    }
  }

  function patchOrder(patch, label, detail) {
    setOrders((current) =>
      current.map((order) =>
        order.id === activeOrder.id
          ? { ...order, ...patch, timeline: [...order.timeline, event(label, detail)] }
          : order
      )
    );
  }

  async function checkTwilio() {
    setTwilioCheck({ state: "checking", message: "Checking Twilio..." });
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setTwilioStatus(data.twilio);
      const checkedAt = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
      setTwilioCheck({
        state: data.twilio?.configured ? "ok" : "error",
        message: data.twilio?.configured
          ? `Connected at ${checkedAt}. Sending with ${twilioSenderLabel(data.twilio)}.`
          : `Missing: ${(data.twilio?.missing || []).join(", ") || "unknown Twilio config"}.`
      });
    } catch (error) {
      setTwilioCheck({ state: "error", message: `Check failed: ${error.message}` });
    }
  }

  async function sendSms(to, body) {
    setSendStatus("Sending SMS...");
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await encryptContactTransitFields({ to, body }))
      });
      const data = await response.json();
      setSendStatus(data.sent ? `Sent: ${data.sid}` : `Not sent: ${data.error || "unknown error"}`);
    } catch (error) {
      setSendStatus(`Not sent: ${error.message}`);
    }
  }

  async function runDemoOutreach(orderId) {
    await fetch(`/api/work-orders/${orderId}/demo-outreach`, { method: "POST", headers: authHeaders() });
    await loadState();
  }

  async function selectDemoQuote(orderId, quoteId) {
    await fetch(`/api/work-orders/${orderId}/select-quote`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ quoteId })
    });
    await loadState();
  }

  async function runFullFlowDemo(orderId) {
    await fetch(`/api/work-orders/${orderId}/full-flow-demo`, { method: "POST", headers: authHeaders() });
    await loadState();
  }

  async function createDemoScenario(scenario) {
    setDemoStatus("Building demo scenario...");
    const response = await fetch("/api/demo/scenario", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ scenario })
    });
    const data = await response.json();
    if (data.order?.id) {
      setActiveOrderId(data.order.id);
      setActivePropertyId(data.order.propertyId);
      setDemoStatus(`${data.order.id} is ready.`);
    } else {
      setDemoStatus("Demo scenario could not be created.");
    }
    await loadState();
  }

  async function nudgeOrder(orderId, send = false) {
    await apiRequest(`/api/work-orders/${orderId}/nudge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send, actor: user?.name || "manager" })
    });
    await loadState();
  }

  async function nudgeStaleOrders(send = false) {
    await apiRequest(`/api/properties/${activeProperty.id}/stale-nudges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thresholdHours: 12, send, actor: user?.name || "manager" })
    });
    await loadState();
  }

  async function updateLiveCall(orderId, callId, action) {
    const routeAction = action === "join" ? "join" : action;
    await apiRequest(`/api/work-orders/${orderId}/live-calls/${callId}/${routeAction}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: user?.id })
    });
    await loadState();
  }

  async function startVendorOutreach(orderId, mode = "live") {
    setSendStatus(mode === "demo" ? "Generating demo vendor call outcomes..." : mode === "test" ? "Calling your phone as the test vendor..." : "Starting vendor outreach...");
    const data = await apiRequest(`/api/work-orders/${orderId}/vendor-outreach`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(await encryptContactTransitFields({ actor: user?.name || "manager", mode, demoFallback: true, testVendorPhone: mode === "test" ? user?.phone : "" }))
    });
    setSendStatus(data.started === false ? `Vendor outreach skipped: ${data.reason || data.error}` : data.demo ? "Demo vendor outcomes generated." : data.testMode ? `Test vendor call started to ${user?.phone}.` : "Vendor outreach started.");
    await loadState();
  }

  async function selectVendorOutcome(orderId, outcomeId) {
    await apiRequest(`/api/work-orders/${orderId}/vendor-outreach/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: user?.name || "manager", outcomeId })
    });
    await loadState();
  }

  async function recordCompletionPackage(orderId) {
    await apiRequest(`/api/work-orders/${orderId}/completion-package`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: "Vendor completed work and sent closeout package.",
        photos: [{ url: "sms://vendor-photo", contentType: "image/jpeg", receivedAt: new Date().toISOString() }],
        warranty: "30-day labor warranty captured from vendor.",
        invoiceAmount: activeOrder?.estimate || 0,
        invoiceDelivery: "Invoice requested to property manager, owner, and LivingRelay records",
        closeWorkOrder: false
      })
    });
    await loadState();
  }

  async function bookVendor(order) {
    if (appData) {
      await apiRequest(`/api/work-orders/${order.id}/book-vendor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: user?.name || "manager" })
      });
      await loadState();
      return;
    }
    patchOrder(
      { status: "Vendor scheduled", dispatchFee: { status: "Needs billing setup", amount: 25, reason: "Add a payment method before dispatch fees can be collected automatically." } },
      "Vendor booked",
      "LivingRelay coordination fee applies now."
    );
  }

  async function addInvoice(order) {
    if (appData) {
      await apiRequest(`/api/work-orders/${order.id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: order.estimate, note: "Vendor invoice is paid directly to the vendor. LivingRelay tracks whether it has been paid." })
      });
      await loadState();
      return;
    }
    const id = `inv-${invoices.length + 1}`;
    const manager = peopleData.find((person) => person.id === activeProperty.managerId || person.id === activeProperty.adminId);
    const owner = peopleData.find((person) => person.id === activeProperty.ownerId);
    const invoiceRecipients = [
      manager && { role: "Property manager", name: manager.name, email: manager.email || "", phone: manager.phone || "" },
      owner && { role: "Owner", name: owner.name, email: owner.email || "", phone: owner.phone || "" },
      { role: "LivingRelay records", name: "LivingRelay records", email: "invoices@livingrelay.com", phone: "" }
    ].filter(Boolean);
    setInvoices((current) => [
      {
        id,
        propertyId: order.propertyId,
        orderId: order.id,
        vendor: vendors.find((vendor) => vendor.id === order.vendorId)?.name || "Vendor",
        amount: order.estimate,
        status: "Unpaid",
        paymentStatus: "Unpaid",
        paymentRail: "Vendor direct",
        recipientName: manager?.name || "Property manager",
        recipientPhone: manager?.phone || "",
        recipientEmail: manager?.email || "",
        recipients: invoiceRecipients,
        invoiceDeliveryInstructions: `Unless otherwise instructed, send the vendor invoice to ${formatInvoiceRecipients(invoiceRecipients)}.`,
        taxYear: "2026",
        receivedAt: "Today",
        note: "Vendor invoice is paid directly to the vendor. LivingRelay tracks whether it has been paid."
      },
      ...current
    ]);
    patchOrder({ invoiceId: id }, "Vendor invoice logged", "Invoice was routed to the property manager for direct vendor payment tracking.");
  }

  const metrics = useMemo(() => {
    const scopedOrders = user?.role === "Tenant" ? tenantOrders : user?.role === "Vendor" ? vendorOrders : visibleOrders;
    const metricOrders = scopedOrders.filter(isLiveDashboardWorkOrder);
    const open = metricOrders.filter(isActiveWorkOrder).length;
    const approvals = metricOrders.filter((order) => isActiveWorkOrder(order) && isReviewWorkOrder(order)).length;
    const tenantNeedsReply = metricOrders.filter((order) => isActiveWorkOrder(order) && order.status === "Tenant troubleshooting").length;
    const completed = metricOrders.filter((order) => !isActiveWorkOrder(order)).length;
    const quotes = metricOrders.filter((order) => hasLiveVendorOutcome(order, vendorProfile)).length;
    const scheduled = metricOrders.filter((order) => ["scheduled", "booked"].some((word) => (order.status || "").toLowerCase().includes(word))).length;
    const ownerApprovals = metricOrders.filter((order) => isActiveWorkOrder(order) && (order.status || "").toLowerCase().includes("owner approval") && !order.ownerApproved).length;
    const unpaidInvoices = livePropertyInvoices.filter((invoice) => invoice.status !== "Paid" && invoice.paymentStatus !== "Paid").length;
    const invoiceTotal = livePropertyInvoices
      .filter((invoice) => invoice.taxYear === "2026")
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    return { open, approvals, completed, invoiceTotal, needsReply: tenantNeedsReply, ownerApprovals, quotes, scheduled, stale: visibleStaleOrders.length, unpaidInvoices };
  }, [livePropertyInvoices, tenantOrders, user?.role, vendorOrders, vendorProfile, visibleOrders, visibleStaleOrders.length]);

  if (!session || !user) {
    return (
      <LandingPage
        phone={phone}
        setPhone={setPhone}
        pin={pin}
        setPin={setPin}
        sitePassword={sitePassword}
        setSitePassword={setSitePassword}
        siteAdminRemember={siteAdminRemember}
        setSiteAdminRemember={setSiteAdminRemember}
        siteAdminConsoleAvailable={siteAdminConsoleAvailable}
        login={login}
        loginCandidate={loginCandidate}
        loginError={loginError}
        loginVerification={loginVerification}
        setLoginVerification={setLoginVerification}
        loginPeople={loginPeople}
        setLoginError={setLoginError}
        landingMode={landingMode}
        setLandingMode={setLandingMode}
        signupForm={signupForm}
        setSignupForm={setSignupForm}
        signupStatus={signupStatus}
        signupVerification={signupVerification}
        setSignupVerification={setSignupVerification}
        createOnboardingProperty={createOnboardingProperty}
        rememberedPhone={rememberedPhone}
        editingRememberedPhone={editingRememberedPhone}
        setEditingRememberedPhone={setEditingRememberedPhone}
      />
    );
  }

  return (
    <main className={user.role === "Site Admin" ? "mobile-shell admin-shell" : "mobile-shell"}>
      <header className="app-header">
        <div>
          <span className="eyebrow">{user.role === "Site Admin" ? "LivingRelay platform" : "Shared URL session"}</span>
          <h1>{user.role === "Site Admin" ? "Admin Console" : activeProperty.name}</h1>
          <p>{user.role === "Site Admin" ? `${user.name} · Platform admin` : `${user.name} · ${user.role}`}</p>
          {user.role !== "Site Admin" && <span className="header-meta">{activeProperty.address}</span>}
          <button className="logout-link" onClick={signOut} type="button">Log out</button>
        </div>
      </header>

      {user.role !== "Site Admin" && <section className="property-switcher">
        {propertiesData
          .filter((property) => userAccessiblePropertyIds.includes(property.id))
          .map((property) => (
            <button
              key={property.id}
              className={property.id === activeProperty.id ? "active" : ""}
              title={property.address || property.name}
              onClick={() => setActivePropertyId(property.id)}
            >
              {property.name}
            </button>
          ))}
      </section>}

      {!!propertyOverlapGroups.length && (
        <PropertyOverlapNotice
          groups={propertyOverlapGroups}
          onReview={() => setAdminSection("account")}
        />
      )}

      {["Tenant", "Vendor"].includes(user.role) && (
        <RoleSectionAction active={adminSection} setActive={setAdminSection} role={user.role} />
      )}

      {user.role !== "Site Admin" && <section className="mobile-metrics">
        {user.role === "Tenant" ? (
          <>
            <Metric icon={<ClipboardList />} label="My active requests" value={metrics.open} />
            <Metric icon={<Bell />} label="Awaiting review" value={metrics.approvals} />
            <Metric icon={<MessageSquare />} label="Needs my reply" value={metrics.needsReply} />
            <Metric icon={<ShieldCheck />} label="Resolved" value={metrics.completed} />
          </>
        ) : user.role === "Vendor" ? (
          <>
            <Metric icon={<ClipboardList />} label="My active jobs" value={metrics.open} />
            <Metric icon={<ReceiptText />} label="Quotes sent" value={metrics.quotes} />
            <Metric icon={<Bell />} label="Scheduled" value={metrics.scheduled} />
            <Metric icon={<ShieldCheck />} label="Completed" value={metrics.completed} />
          </>
        ) : user.role === "Owner" ? (
          <>
            <Metric icon={<ClipboardList />} label="Active repairs" value={metrics.open} />
            <Metric icon={<Bell />} label="Needs my approval" value={metrics.ownerApprovals} />
            <Metric icon={<ReceiptText />} label="Unpaid invoices" value={metrics.unpaidInvoices} />
            <Metric icon={<DollarSign />} label="2026 expenses" value={formatMoney(metrics.invoiceTotal)} />
          </>
        ) : (
          <>
            <Metric icon={<ClipboardList />} label="Open work orders" value={metrics.open} />
            <Metric icon={<Bell />} label="Awaiting review" value={metrics.approvals} />
            <Metric icon={<AlertTriangle />} label="Stale" value={metrics.stale} />
            <Metric icon={<ReceiptText />} label="2026 invoices" value={formatMoney(metrics.invoiceTotal)} />
          </>
        )}
      </section>}

      {demoExperienceAvailable && user.role !== "Site Admin" && <DemoModeBanner activeOrder={activeOrder} runFullFlowDemo={runFullFlowDemo} />}

      {phoneVerifiedBanner && user.role !== "Site Admin" && (
        <section className="phone-verified-banner">
          <ShieldCheck size={18} />
          <div>
            <strong>Phone verified</strong>
            <span>{phoneVerifiedBanner}</span>
          </div>
          <button type="button" onClick={() => setPhoneVerifiedBanner("")}>Dismiss</button>
        </section>
      )}

      {user.role === "Site Admin" && (
        <SiteOwnerHero
          accounts={accountsData}
          people={peopleData}
          properties={propertiesData}
          orders={orders}
          billingEvents={billingEventsData}
          accessRequests={accessRequestsData}
          prospectingLeads={prospectingLeadsData}
          stripe={stripeData}
          twilioStatus={twilioStatus}
          platformSettings={platformSettings}
        />
      )}

      {["Manager", "Owner"].includes(user.role) && (
        <RoleSectionAction active={adminSection} setActive={setAdminSection} role={user.role} />
      )}

      {user.role === "Site Admin" && (
        <AdminConsoleNav active={adminSection} setActive={setAdminSection} />
      )}

      {user.role === "Site Admin" && (
        <AdminConsole
          active={adminSection}
          accounts={accountsData}
          people={peopleData}
          properties={propertiesData}
          vendors={vendorsData}
          orders={orders}
          invoices={invoices}
          billingEvents={billingEventsData}
          referrals={referralsData}
          prospectingLeads={prospectingLeadsData}
          accessRequests={accessRequestsData}
          integrationConnections={integrationConnectionsData}
          integrationEvents={integrationEventsData}
          pmsProviders={pmsProvidersData}
          auditLog={auditData}
          platformSettings={platformSettings}
          reloadState={loadState}
          siteAdminToken={siteAdminToken}
          onSiteAdminAuthExpired={expireSiteAdminSession}
          setActivePropertyId={setActivePropertyId}
          setActiveOrderId={setActiveOrderId}
          setAdminSection={setAdminSection}
        />
      )}

      {["Manager", "Owner"].includes(user.role) && adminSection === "operations" && (
        <IssueCreatePanel
          request={request}
          setRequest={setRequest}
          createOrder={createOrder}
          property={activeProperty}
          user={user}
          handoff={createHandoff}
          activeOrder={activeOrder}
          onReviewWorkOrder={() => workOrderHandoffRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          onCallMeFirst={(orderId) => startVendorOutreach(orderId, "test")}
        />
      )}

      {["Manager", "Owner"].includes(user.role) && adminSection === "team" && (
        <VendorTeamOnboarding
          property={activeProperty}
          account={accountsData.find((account) => account.id === activeProperty.accountId)}
          people={peopleData}
          vendors={vendorsData}
          properties={propertiesData.filter((property) => user.propertyIds.includes(property.id))}
          reloadState={loadState}
        />
      )}

      {user.role === "Manager" && adminSection === "operations" && (
        <div ref={workOrderHandoffRef}>
          <AdminManagerView
            property={activeProperty}
            orders={visibleOrders}
            invoices={invoices}
            activeOrder={activeOrder}
            setActiveOrderId={setActiveOrderId}
            patchOrder={patchOrder}
            addInvoice={addInvoice}
            sendSms={sendSms}
            sendStatus={sendStatus}
            people={peopleData}
            vendors={vendorsData}
            auditLog={auditData}
            staleOrders={visibleStaleOrders}
            demoScenarios={appData?.demoScenarios || []}
            demoStatus={demoStatus}
            demoExperienceAvailable={demoExperienceAvailable}
            reloadState={loadState}
            runDemoOutreach={runDemoOutreach}
            selectDemoQuote={selectDemoQuote}
            runFullFlowDemo={runFullFlowDemo}
            createDemoScenario={createDemoScenario}
            nudgeOrder={nudgeOrder}
            nudgeStaleOrders={nudgeStaleOrders}
            updateLiveCall={updateLiveCall}
            startVendorOutreach={startVendorOutreach}
            selectVendorOutcome={selectVendorOutcome}
            recordCompletionPackage={recordCompletionPackage}
            bookVendor={bookVendor}
            setAdminSection={setAdminSection}
          />
        </div>
      )}

      {["Manager", "Owner"].includes(user.role) && adminSection === "operations" && (
        <ReferralServicePanel
          user={user}
          property={activeProperty}
          account={accountsData.find((account) => account.id === activeProperty.accountId)}
          referrals={referralsData}
          reloadState={loadState}
        />
      )}

      {user.role === "Manager" && adminSection === "billing" && (
        <BillingTab
          property={activeProperty}
          account={accountsData.find((account) => account.id === activeProperty.accountId)}
          people={peopleData}
          invoices={livePropertyInvoices}
          orders={visibleOrders}
          billingEvents={billingEventsData.filter((event) => event.propertyId === activeProperty.id)}
          stripe={stripeData}
          reloadState={loadState}
        />
      )}

      {user.role === "Owner" && adminSection === "operations" && (
        <OwnerView
          property={activeProperty}
          account={accountsData.find((account) => account.id === activeProperty.accountId)}
          orders={visibleOrders}
          invoices={livePropertyInvoices}
          reloadState={loadState}
          patchInvoice={async (invoiceId, status) => {
            await fetch(`/api/invoices/${invoiceId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status, paymentStatus: status, paidAt: status === "Paid" ? new Date().toISOString() : undefined })
            });
            await loadState();
          }}
        />
      )}

      {user.role === "Owner" && adminSection === "billing" && (
        <BillingTab
          property={activeProperty}
          account={accountsData.find((account) => account.id === activeProperty.accountId)}
          people={peopleData}
          invoices={livePropertyInvoices}
          orders={visibleOrders}
          billingEvents={billingEventsData.filter((event) => event.propertyId === activeProperty.id)}
          stripe={stripeData}
          reloadState={loadState}
        />
      )}

      {user.role !== "Site Admin" && adminSection === "account" && (
        <AccountSettingsPanel
          user={user}
          account={accountsData.find((account) => user.accountIds?.includes(account.id) || account.id === activeProperty.accountId)}
          property={activeProperty}
          properties={userMergeableProperties.length
            ? userMergeableProperties
            : propertiesData.filter((property) => userAccessiblePropertyIds.includes(property.id))}
          authHeaders={authHeaders}
          signOut={signOut}
          reloadState={loadState}
          setActivePropertyId={setActivePropertyId}
          initialScope={route?.page === "delete-data" ? "data" : ""}
        />
      )}

      {user.role === "Tenant" && adminSection !== "account" && (
        <TenantView request={request} setRequest={setRequest} createOrder={createOrder} orders={tenantOrders} property={activeProperty} user={user} />
      )}

      {user.role === "Vendor" && adminSection !== "account" && (
        <VendorView orders={vendorOrders} />
      )}

      {user.role === "Site Admin" && (
        <section className="integration-strip">
          <IntegrationCard
            icon={<Smartphone />}
            title="Messaging infrastructure"
            text={twilioStatus?.configured ? `Twilio is live through ${twilioSenderLabel(twilioStatus)}` : "Twilio needs production credentials."}
            status={twilioCheck.message}
            statusTone={twilioCheck.state}
            action={<button className="ghost" onClick={checkTwilio} disabled={twilioCheck.state === "checking"}>{twilioCheck.state === "checking" ? "Checking" : "Check"}</button>}
          />
          <IntegrationCard icon={<CreditCard />} title="Revenue infrastructure" text={stripeData.configured ? "Stripe dispatch billing is ready." : `Missing: ${stripeData.missing?.join(", ") || "Stripe keys"}.`} />
          <IntegrationCard icon={<Database />} title="Admin console isolation" text="The admin console is host-gated to admin.livingrelay.com and protected by password login." />
        </section>
      )}
    </main>
  );
}

function LandingPageUnused({ phone, setPhone, pin, setPin, sitePassword, setSitePassword, siteAdminRemember, setSiteAdminRemember, siteAdminConsoleAvailable, login, loginCandidate, loginError, loginVerification, setLoginVerification, loginPeople, setLoginError, landingMode, setLandingMode, signupForm, setSignupForm, signupStatus, signupVerification, setSignupVerification, createOnboardingProperty, rememberedPhone, editingRememberedPhone, setEditingRememberedPhone }) {
  const updateSignup = (key, value) => setSignupForm((current) => ({ ...current, [key]: value }));
  const [showReferralCode, setShowReferralCode] = useState(Boolean(signupForm.referralToken));
  const [renterRequest, setRenterRequest] = useState(() => ({
    ...defaultRenterServiceRequest,
    message: buildRenterServiceMessage(defaultRenterServiceRequest)
  }));
  const [renterRequestStatus, setRenterRequestStatus] = useState({ state: "idle", message: "" });
  const updateRenterRequest = (key, value) => {
    setRenterRequest((current) => {
      const next = { ...current, [key]: value };
      if (["renterName", "rentalAddress", "unit"].includes(key) && next.message === buildRenterServiceMessage(current)) {
        next.message = buildRenterServiceMessage(next);
      }
      return next;
    });
  };
  const chooseRenterRecipientAudience = (audience) => {
    const templateId = audience === "owner" ? "owner-manager-loop" : "adopt-livingrelay";
    setRenterRequest((current) => {
      const next = {
        ...current,
        templateId,
        sendOwner: audience === "owner" || audience === "both",
        sendManager: audience === "manager" || audience === "both"
      };
      if (current.message === buildRenterServiceMessage(current)) {
        next.message = buildRenterServiceMessage(next, templateId);
      }
      return next;
    });
  };
  const renterRecipientAudience = renterRequest.sendOwner && renterRequest.sendManager
    ? "both"
    : renterRequest.sendOwner
      ? "owner"
      : "manager";
  const submitRenterInvite = async (event) => {
    event.preventDefault();
    setRenterRequestStatus({ state: "saving", message: "Sending LivingRelay invite..." });
    try {
      const response = await fetch("/api/public/livingrelay-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await encryptContactTransitFields(renterRequest))
      });
      const data = await response.json();
      if (!response.ok) {
        setRenterRequestStatus({ state: "error", message: data.error || "Could not send the invite." });
        return;
      }
      const sent = data.results?.filter((item) => item.sent).length || 0;
      const skippedEmail = data.results?.some((item) => item.channel === "email" && item.reason === "email_not_configured");
      setRenterRequestStatus({
        state: "ok",
        message: skippedEmail
          ? `${sent} invite${sent === 1 ? "" : "s"} sent. Email delivery needs RESEND_API_KEY.`
          : `${sent} LivingRelay invite${sent === 1 ? "" : "s"} sent.`
      });
    } catch (error) {
      setRenterRequestStatus({ state: "error", message: error.message });
    }
  };
  const fillLoginShortcut = (person) => {
    setPhone(formatPhoneInput(person.phone));
    setPin(formatPinInput(person.pin));
    setEditingRememberedPhone(true);
    setSitePassword("");
    setLoginError("");
    setLoginVerification({ challengeId: "", code: "", state: "idle", message: "" });
  };

  if (siteAdminConsoleAvailable) {
    return (
      <main className="login-screen">
        <section className="login-card admin-login-card">
          <div className="brand-lock">
            <div className="app-mark"><Wrench size={22} /></div>
            <span>LivingRelay</span>
          </div>
          <h1>Admin console for the LivingRelay platform.</h1>
          <p>This private console is for customer accounts, revenue, support load, usage, logins, and production operations.</p>
          <form className="stack" onSubmit={login}>
            <input className="sr-only" name="username" autoComplete="username" value="LivingRelay admin" readOnly tabIndex={-1} aria-hidden="true" />
            <label>
              Password
              <PasswordInput name="password" value={sitePassword} onChange={setSitePassword} autoComplete="current-password" autoFocus />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={siteAdminRemember} onChange={(event) => setSiteAdminRemember(event.target.checked)} />
              <span>Keep me logged in on this device</span>
            </label>
            <button className="primary wide" type="submit"><LockKeyhole size={16} /> Enter admin console</button>
            {loginError && <p className="login-error">{loginError}</p>}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="landing-page">
      <section className="landing-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(18, 31, 29, 0.88), rgba(18, 31, 29, 0.64) 43%, rgba(18, 31, 29, 0.16)), url(${heroImage})` }}>
        <nav className="landing-nav" aria-label="Landing navigation">
          <div className="brand-lock">
            <div className="app-mark"><Wrench size={22} /></div>
            <span>LivingRelay</span>
          </div>
          <div>
            <a href="#pricing">Pricing</a>
            <a href="#how-it-works">How it works</a>
            <button className="ghost light" onClick={() => setLandingMode("login")}>Log in</button>
          </div>
        </nav>
        <div className="landing-hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker">AI vendor management for rental repairs</span>
            <h1>AI voice calls vendors and books the repair.</h1>
            <p>Tenant texts become repair scopes. AI voice agents call vendors, compare availability and pricing, coordinate access windows, and keep owners in the loop.</p>
            <div className="hero-proof" aria-label="What LivingRelay coordinates">
              <span><Phone size={16} /> AI vendor calls</span>
              <span><Wrench size={16} /> Best vendor booked</span>
              <span><ReceiptText size={16} /> Tax-ready records</span>
            </div>
          </div>

          <section className="access-panel" aria-label={landingMode === "create" ? "Setup property" : "Log into property"}>
            <div className="mode-switch">
              <button className={landingMode === "create" ? "active" : ""} onClick={() => setLandingMode("create")}>Setup property</button>
              <button className={landingMode === "renter" ? "active" : ""} onClick={() => setLandingMode("renter")}>Request access</button>
              <button className={landingMode === "login" ? "active" : ""} onClick={() => setLandingMode("login")}>Log in</button>
            </div>
            {landingMode === "login" ? (
              <>
                <LoginForm
                  phone={phone}
                  setPhone={setPhone}
                  pin={pin}
                  setPin={setPin}
                  sitePassword={sitePassword}
                  setSitePassword={setSitePassword}
                  login={login}
                  loginCandidate={loginCandidate}
                  loginError={loginError}
                  loginVerification={loginVerification}
                  setLoginVerification={setLoginVerification}
                  rememberedPhone={rememberedPhone}
                  editingRememberedPhone={editingRememberedPhone}
                  setEditingRememberedPhone={setEditingRememberedPhone}
                />
                {!!loginPeople.length && (
                  <div className="pin-grid compact">
                    {loginPeople.slice(0, 4).map((person) => (
                      <button key={person.id} onClick={() => fillLoginShortcut(person)}>
                        <strong>{person.role}</strong>
                        <span>{person.pin}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : landingMode === "renter" ? (
              <form className="renter-request-form" onSubmit={submitRenterInvite}>
                <label>Your name<input value={renterRequest.renterName} onChange={(event) => updateRenterRequest("renterName", event.target.value)} placeholder="Maya Chen" /></label>
                <label>Rental address<GooglePlacesAddressInput value={renterRequest.rentalAddress} onChange={(value) => updateRenterRequest("rentalAddress", value)} onPlaceSelect={(place, prediction) => updateRenterRequest("rentalAddress", formatPlaceAddress(place) || prediction?.description || renterRequest.rentalAddress)} placeholder="11820 Pacific Ave" /></label>
                <label>Unit<input value={renterRequest.unit} onChange={(event) => updateRenterRequest("unit", event.target.value)} placeholder="Garden flat" /></label>
                <section className="request-recipient-card">
                  <div className="request-card-head">
                    <span>Send invite to</span>
                    <div className="recipient-choice-grid" role="group" aria-label="Invite recipient">
                      <button type="button" className={`recipient-choice ${renterRecipientAudience === "manager" ? "active" : ""}`} onClick={() => chooseRenterRecipientAudience("manager")}>
                        Property manager
                      </button>
                      <button type="button" className={`recipient-choice ${renterRecipientAudience === "owner" ? "active" : ""}`} onClick={() => chooseRenterRecipientAudience("owner")}>
                        Owner
                      </button>
                      <button type="button" className={`recipient-choice ${renterRecipientAudience === "both" ? "active" : ""}`} onClick={() => chooseRenterRecipientAudience("both")}>
                        Both
                      </button>
                    </div>
                  </div>
                  {renterRequest.sendOwner && (
                    <div className="recipient-contact-section">
                      <p>Owner contact</p>
                      <div className="recipient-grid">
                        <input value={renterRequest.ownerName} onChange={(event) => updateRenterRequest("ownerName", event.target.value)} placeholder="Owner name" />
                        <input value={renterRequest.ownerPhone} onChange={(event) => updateRenterRequest("ownerPhone", formatPhoneInput(event.target.value))} inputMode="tel" placeholder="Owner phone" />
                        <input value={renterRequest.ownerEmail} onChange={(event) => updateRenterRequest("ownerEmail", event.target.value)} inputMode="email" placeholder="Owner email" />
                      </div>
                    </div>
                  )}
                  {renterRequest.sendManager && (
                    <div className="recipient-contact-section">
                      <p>Property manager contact</p>
                      <div className="recipient-grid">
                        <input value={renterRequest.managerName} onChange={(event) => updateRenterRequest("managerName", event.target.value)} placeholder="Manager name" />
                        <input value={renterRequest.managerPhone} onChange={(event) => updateRenterRequest("managerPhone", formatPhoneInput(event.target.value))} inputMode="tel" placeholder="Manager phone" />
                        <input value={renterRequest.managerEmail} onChange={(event) => updateRenterRequest("managerEmail", event.target.value)} inputMode="email" placeholder="Manager email" />
                      </div>
                    </div>
                  )}
                </section>
                <details className="message-preview">
                  <summary>Preview/edit invite</summary>
                  <textarea rows={4} value={renterRequest.message} onChange={(event) => updateRenterRequest("message", event.target.value)} />
                </details>
                <div className="request-action-grid request-send-row">
                  <div className="channel-toggle-group" aria-label="Delivery channels">
                    <label><input type="checkbox" checked={renterRequest.textChannel} onChange={(event) => updateRenterRequest("textChannel", event.target.checked)} /> Text</label>
                    <label><input type="checkbox" checked={renterRequest.emailChannel} onChange={(event) => updateRenterRequest("emailChannel", event.target.checked)} /> Email</label>
                  </div>
                  <button type="submit" className="primary" disabled={renterRequestStatus.state === "saving"}>
                    <Send size={16} /> {renterRequestStatus.state === "saving" ? "Sending" : "Send LivingRelay invite"}
                  </button>
                </div>
                {renterRequestStatus.message && <p className={`form-status ${renterRequestStatus.state}`}>{renterRequestStatus.message}</p>}
              </form>
            ) : (
              <>
                <form className="signup-form" onSubmit={createOnboardingProperty}>
                  <label>Property name<GooglePlacesAddressInput required value={signupForm.propertyName} onChange={(value) => updateSignup("propertyName", value)} selectedValueForPrediction={(prediction) => prediction.mainText || prediction.description} onPlaceSelect={(place, prediction) => setSignupForm((current) => ({ ...current, propertyName: formatPlaceName(place, prediction) || current.propertyName, address: formatPlaceAddress(place) || prediction?.description || current.address }))} placeholder="Noe Valley Duplex" autoComplete="organization" /></label>
                  <label>Address<GooglePlacesAddressInput value={signupForm.address} onChange={(value) => updateSignup("address", value)} onPlaceSelect={(place, prediction) => setSignupForm((current) => {
                    const address = formatPlaceAddress(place) || prediction?.description || current.address;
                    const propertyName = current.propertyName.trim()
                      ? current.propertyName
                      : formatPropertyNameFromAddress(place, prediction) || current.propertyName;
                    return { ...current, address, propertyName };
                  })} placeholder="11820 Pacific Ave" /></label>
                  <label>Your name<input value={signupForm.managerName} onChange={(event) => updateSignup("managerName", event.target.value)} placeholder="Jordan Lee" /></label>
                  <label>Your role<select value={signupForm.role} onChange={(event) => updateSignup("role", event.target.value)}><option>Property manager</option><option>Owner</option><option>Owner and property manager</option></select></label>
                  <label>Phone<input required value={signupForm.managerPhone} onChange={(event) => updateSignup("managerPhone", formatPhoneInput(event.target.value))} inputMode="tel" autoComplete="tel" placeholder="(310) 555-0100" /></label>
                  <label>PIN<PinCodeInput value={signupForm.pin} onChange={(value) => updateSignup("pin", value)} /></label>
                  {showReferralCode || signupForm.referralToken ? (
                    <label className="span-2 optional-referral-field">
                      <span>{signupForm.referralToken ? "Referral applied" : "Referral code"}</span>
                      <input value={signupForm.referralToken} onChange={(event) => updateSignup("referralToken", event.target.value.toUpperCase())} placeholder="LR-ABC12345" />
                    </label>
                  ) : (
                    <button className="link-button subtle-referral-toggle" type="button" onClick={() => setShowReferralCode(true)}>
                      <Gift size={14} /> I have a referral code
                    </button>
                  )}
                  {signupVerification.challengeId && (
                    <label className="span-2">Verification code<input value={signupVerification.code} onChange={(event) => setSignupVerification((current) => ({ ...current, code: formatVerificationCodeInput(event.target.value) }))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" /></label>
                  )}
                  <button className="primary wide" type="submit" disabled={signupStatus.state === "saving"}><ArrowRight size={16} /> {signupStatus.state === "saving" ? "Working" : signupVerification.challengeId ? "Verify and create" : "Send code"}</button>
                  {signupVerification.message && <p className={`form-status ${signupVerification.state}`}>{signupVerification.message}</p>}
                  {signupStatus.message && <p className={`form-status ${signupStatus.state}`}>{signupStatus.message}</p>}
                </form>
              </>
            )}
          </section>
        </div>
      </section>

      <section className="vendor-ai-band" aria-label="AI vendor coordination">
        <div className="vendor-ai-copy">
          <span className="eyebrow">AI vendor desk</span>
          <h2>The part nobody wants to do manually.</h2>
          <p>LivingRelay can call plumbers, HVAC techs, electricians, handypeople, and cleaners with the repair scope, ask the practical questions, and bring back the vendor who can actually take the job.</p>
        </div>
        <div className="vendor-ai-flow">
          <article>
            <Phone size={21} />
            <strong>Calls multiple vendors</strong>
            <p>AI voice outreach explains the issue, confirms service area, availability, trip fees, rough range, warranty, and invoice delivery.</p>
          </article>
          <article>
            <Search size={21} />
            <strong>Compares who is best</strong>
            <p>Owners and managers see the fastest option, best fit, quote notes, schedule constraints, and why a vendor is recommended.</p>
          </article>
          <article>
            <MessageSquare size={21} />
            <strong>Coordinates the tenant window</strong>
            <p>LivingRelay keeps the tenant schedule, access notes, vendor booking, and manager updates connected in one thread.</p>
          </article>
        </div>
      </section>

      <section className="value-band" id="how-it-works">
        <article><Bot size={22} /><strong>AI turns texts into scopes</strong><p>Residents report the issue by text. LivingRelay asks follow-ups, captures photos and access notes, then prepares a vendor-ready scope.</p></article>
        <article><Phone size={22} /><strong>Vendor calls happen for you</strong><p>AI voice agents reach out, gather availability and quote signals, and surface the most practical booking option.</p></article>
        <article><ShieldCheck size={22} /><strong>Owners approve with context</strong><p>Owners see the repair history, recommendation, estimate range, thresholds, and booking status before approving spend.</p></article>
        <article><FileText size={22} /><strong>Invoices and records stay put</strong><p>Vendor invoices, closeout notes, tax-year totals, and repair history stay organized by property for the owner.</p></article>
      </section>

      <section className="pricing-band" id="pricing">
        <div>
          <span className="eyebrow">Simple pricing</span>
          <h2>No monthly property fee.</h2>
          <p>Start with a city rental home, duplex, townhome, or small multifamily property. LivingRelay charges when AI vendor coordination turns into a booked dispatch.</p>
        </div>
        <article className="price-card">
          <span>Launch price</span>
          <strong>$0/property</strong>
          <p>plus $25 only when a vendor is booked</p>
          <button className="primary wide" onClick={() => setLandingMode("create")}><Building2 size={16} /> Setup property</button>
        </article>
      </section>
      <SalesLeadEmbed context="Homepage" compact />
      <PublicFooter />
    </main>
  );
}

function LoginForm({ phone, setPhone, pin, setPin, sitePassword, setSitePassword, login, loginCandidate, loginError, loginVerification, setLoginVerification, rememberedPhone, editingRememberedPhone, setEditingRememberedPhone }) {
  const usingRememberedPhone = Boolean(rememberedPhone && !editingRememberedPhone);
  const changeRememberedPhone = () => {
    setEditingRememberedPhone(true);
    setPhone("");
    setPin("");
    setLoginVerification({ challengeId: "", code: "", state: "idle", message: "" });
  };

  return (
    <form className="stack" onSubmit={login}>
      {usingRememberedPhone ? (
        <div className="remembered-phone">
          <span>Phone</span>
          <strong>{rememberedPhone}</strong>
          <button type="button" className="ghost" onClick={changeRememberedPhone}>Enter different phone number</button>
        </div>
      ) : (
        <label>
          Phone
          <input value={phone} onChange={(event) => setPhone(formatPhoneInput(event.target.value))} inputMode="tel" autoComplete="tel" placeholder="(555) 555-5555" />
        </label>
      )}
      <label>
        PIN
        <PinCodeInput value={pin} onChange={setPin} />
      </label>
      {loginCandidate?.role === "Site Admin" && (
        <label>
          Admin password
          <PasswordInput value={sitePassword} onChange={setSitePassword} autoComplete="current-password" />
        </label>
      )}
      {loginVerification?.challengeId && (
        <label>
          Verification code
          <input value={loginVerification.code} onChange={(event) => setLoginVerification((current) => ({ ...current, code: formatVerificationCodeInput(event.target.value) }))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-digit code" />
        </label>
      )}
      <button className="primary wide" type="submit"><LockKeyhole size={16} /> {loginVerification?.challengeId ? "Verify and enter" : "Send code"}</button>
      {loginVerification?.message && <p className={`form-status ${loginVerification.state}`}>{loginVerification.message}</p>}
      {loginError && <p className="login-error">{loginError}</p>}
    </form>
  );
}

function PropertyOverlapNotice({ groups, onReview }) {
  const propertyCount = groups.reduce((sum, group) => sum + group.properties.length, 0);
  return (
    <section className="property-overlap-notice" aria-label="Possible duplicate properties">
      <MapPin size={18} />
      <div>
        <strong>{groups.length} possible address overlap{groups.length === 1 ? "" : "s"}</strong>
        <p>{propertyCount} property records look like they may share an address. Signup stays open, but you can merge duplicates after logging in.</p>
      </div>
      <button className="secondary" type="button" onClick={onReview}>Review</button>
    </section>
  );
}

function PinCodeInput({ value, onChange }) {
  const digits = formatPinInput(value);
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "Hide PIN" : "Show PIN";

  return (
    <span className="pin-code-field">
      <input
        aria-label="PIN"
        value={digits}
        onChange={(event) => onChange(formatPinInput(event.target.value))}
        inputMode="numeric"
        maxLength={4}
      />
      <span className="pin-slots" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => <span key={index}>{digits[index] ? (visible ? digits[index] : "*") : ""}</span>)}
      </span>
      <button
        type="button"
        className="pin-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}

function PasswordInput({ value, onChange, name, autoComplete, autoFocus = false }) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "Hide password" : "Show password";

  return (
    <span className="password-field">
      <input
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}

function LegacyLandingPage({ phone, setPhone, pin, setPin, sitePassword, setSitePassword, siteAdminConsoleAvailable, login, loginCandidate, loginError, loginPeople, setLoginError, landingMode, setLandingMode, signupForm, setSignupForm, signupStatus, createOnboardingProperty }) {
  if (siteAdminConsoleAvailable) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <div className="brand-lock">
            <div className="app-mark"><LockKeyhole size={22} /></div>
            <span>LivingRelay</span>
          </div>
          <h1>Admin console for the LivingRelay platform.</h1>
          <p>This private console is for customer accounts, revenue, support load, usage, logins, and production operations.</p>
          <form className="stack" onSubmit={login}>
            <label>
              Phone
              <input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label>
              PIN
              <input className="pin-code-input" value={pin} onChange={(event) => setPin(formatPinInput(event.target.value))} inputMode="numeric" maxLength={4} />
            </label>
            {loginCandidate?.role === "Site Admin" && (
              <label>
                Site admin password
                <PasswordInput value={sitePassword} onChange={setSitePassword} autoComplete="current-password" />
              </label>
            )}
            <button className="primary wide" type="submit"><LockKeyhole size={16} /> Enter site admin</button>
            {loginError && <p className="login-error">{loginError}</p>}
          </form>
          <div className="pin-grid">
            {loginPeople.map((person) => (
              <button key={person.id} onClick={() => { setPhone(person.phone); setPin(person.pin); setSitePassword(""); setLoginError(""); }}>
                <strong>{person.role}</strong>
                <span>{person.pin}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand-lock">
          <div className="app-mark"><Wrench size={22} /></div>
          <span>LivingRelay</span>
        </div>
        <h1>{landingMode === "signup" ? "Add a property and start routing repairs." : "One URL. Role-specific PIN access."}</h1>
        <p>{landingMode === "signup" ? "Create a customer account, property, and first manager login." : "Managers, owners, and residents enter the same place. Phone + PIN decides what they can see and do."}</p>
        <div className="landing-toggle">
          <button className={landingMode === "login" ? "active" : ""} onClick={() => setLandingMode("login")}>Log in</button>
          <button className={landingMode === "signup" ? "active" : ""} onClick={() => setLandingMode("signup")}>Add property</button>
        </div>
        {landingMode === "login" ? (
          <>
            <form className="stack" onSubmit={login}>
              <label>
                Phone
                <input value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
              <label>
                PIN
                <input className="pin-code-input" value={pin} onChange={(event) => setPin(formatPinInput(event.target.value))} inputMode="numeric" maxLength={4} />
              </label>
              <button className="primary wide" type="submit"><LockKeyhole size={16} /> Enter</button>
              {loginError && <p className="login-error">{loginError}</p>}
            </form>
            <div className="pin-grid">
              {loginPeople.map((person) => (
                <button key={person.id} onClick={() => { setPhone(person.phone); setPin(person.pin); setLoginError(""); }}>
                  <strong>{person.role}</strong>
                  <span>{person.pin}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <form className="stack" onSubmit={createOnboardingProperty}>
            <label>Property name<input required value={signupForm.propertyName} onChange={(event) => setSignupForm({ ...signupForm, propertyName: event.target.value })} /></label>
            <label>Address<input value={signupForm.address} onChange={(event) => setSignupForm({ ...signupForm, address: event.target.value })} /></label>
            <label>Manager name<input value={signupForm.managerName} onChange={(event) => setSignupForm({ ...signupForm, managerName: event.target.value })} /></label>
            <label>Manager phone<input required value={signupForm.managerPhone} onChange={(event) => setSignupForm({ ...signupForm, managerPhone: event.target.value })} /></label>
            <button className="primary wide" type="submit" disabled={signupStatus.state === "saving"}><Plus size={16} /> Setup property</button>
            {signupStatus.message && <p className={`login-error ${signupStatus.state === "ok" ? "ok" : ""}`}>{signupStatus.message}</p>}
          </form>
        )}
      </section>
    </main>
  );
}

const LandingPage = LandingPageUnused;

function AdminConsoleNav({ active, setActive }) {
  const items = [
    ["accounts", LayoutDashboard, "Customers"],
    ["inboundLeads", Mail, "Inbound"],
    ["prospecting", Target, "Prospecting"],
    ["accessRequests", Send, "Access"],
    ["directory", Users, "People"],
    ["properties", Building2, "Properties"],
    ["workOrders", ClipboardList, "Support"],
    ["qa", ShieldCheck, "QA"],
    ["billing", DollarSign, "Revenue"],
    ["integrations", Database, "Integrations"],
    ["diagnostics", Bot, "Diagnostics"],
    ["audit", Database, "Audit"]
  ];
  return (
    <nav className="admin-nav" aria-label="Admin console">
      {items.map(([id, Icon, label]) => (
        <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}>
          <Icon size={16} /> {label}
        </button>
      ))}
    </nav>
  );
}

function SiteOwnerHero({ accounts, people, properties, orders, billingEvents, accessRequests = [], prospectingLeads = [], stripe, twilioStatus, platformSettings }) {
  const openOrders = orders.filter((order) => order.status !== "Closed").length;
  const activeAccounts = accounts.filter((account) => account.status === "Active").length;
  const dispatchRevenue = billingEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
  const ownerUsers = people.filter((person) => person.role === "Owner").length;
  const recentAccessRequests = accessRequests.filter((request) => {
    const createdAt = new Date(request.createdAt || 0).getTime();
    return createdAt && Date.now() - createdAt < 1000 * 60 * 60 * 24 * 30;
  }).length;
  const newProspectingLeads = prospectingLeads.filter((lead) => ["New", "Ready to contact"].includes(lead.status || "New")).length;
  const inboundSalesLeads = prospectingLeads.filter(isInboundSalesLead).length;
  return (
    <section className="owner-console-hero">
      <div>
        <span className="eyebrow">Admin view</span>
        <h2>Platform admin command center</h2>
        <p>Track customers, revenue, usage, support load, and production readiness across the whole LivingRelay business.</p>
      </div>
      <div className="owner-signal-grid">
        <MiniRow icon={<LayoutDashboard />} label="Active customers" value={`${activeAccounts}/${accounts.length}`} />
        <MiniRow icon={<DollarSign />} label="Dispatch revenue" value={formatMoney(dispatchRevenue)} />
        <MiniRow icon={<ClipboardList />} label="Open support load" value={openOrders} />
        <MiniRow icon={<Send />} label="Access referrals" value={recentAccessRequests || accessRequests.length} />
        <MiniRow icon={<Mail />} label="Inbound leads" value={inboundSalesLeads} />
        <MiniRow icon={<Target />} label="Prospecting" value={newProspectingLeads || prospectingLeads.length} />
        <MiniRow icon={<Users />} label="Owner users" value={ownerUsers} />
        <MiniRow icon={<CreditCard />} label="Stripe" value={stripe.configured ? "Ready" : "Needs keys"} />
        <MiniRow icon={<Smartphone />} label="Twilio" value={twilioStatus?.configured ? "Ready" : "Needs config"} />
        <MiniRow icon={<Phone />} label="Vendor calls" value={platformSettings?.vendorCallTestMode ? "Test mode" : platformSettings?.productionVendorCallsEnabled ? "Production enabled" : "Production disabled"} />
      </div>
    </section>
  );
}

function RoleSectionAction({ active, setActive, role }) {
  const operationsLabel = role === "Owner" ? "Approvals" : "Operations";
  const items = ["Manager", "Owner"].includes(role)
    ? [
        ["operations", ClipboardList, operationsLabel],
        ["team", Users, "Team"],
        ["billing", CreditCard, "Billing"],
        ["account", UserRound, "Account"]
      ]
    : [
        ["dashboard", ClipboardList, "Dashboard"],
        ["account", UserRound, "Account"]
      ];
  return (
    <div className={`role-section-action ${active === "billing" ? "billing-active" : ""}`}>
      <span>{items.find(([id]) => id === active)?.[2] || operationsLabel}</span>
      <div className="role-section-tabs">
        {items.map(([id, Icon, label]) => (
          <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PropertyMergePanel({ groups, status, onMerge }) {
  if (!groups.length) return null;
  return (
    <section className="property-merge-panel">
      <div>
        <span className="eyebrow">Address cleanup</span>
        <h3>Possible duplicate properties</h3>
        <p>These records share a very similar street address. Keep the correct record and merge the others into it when they are really the same property.</p>
      </div>
      <div className="property-merge-list">
        {groups.map((group) => (
          <article className="property-merge-group" key={`${group.accountId}-${group.key}`}>
            <div>
              <strong>{group.properties.length} records near {group.displayAddress}</strong>
              <p>{group.properties.map((property) => `${property.name}${property.address ? ` (${property.address})` : ""}`).join(" · ")}</p>
            </div>
            <div className="property-merge-actions">
              {group.properties.map((property) => (
                <button
                  className="secondary"
                  type="button"
                  key={property.id}
                  onClick={() => onMerge(group, property)}
                >
                  <Building2 size={15} /> Keep {property.name}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
      {status?.message && <p className={`login-error ${status.state === "ok" ? "ok" : ""}`}>{status.message}</p>}
    </section>
  );
}

function AccountSettingsPanel({ user, account, property, properties, authHeaders, signOut, reloadState, setActivePropertyId, initialScope = "" }) {
  const canDeleteCustomerAccount = ["Manager", "Owner", "Admin"].includes(user.role) && account;
  const accountPhoneVerified = Boolean(account?.phoneVerifiedAt && samePhone(account?.verifiedPhone || user.phone, user.phone));
  const userPhoneVerified = Boolean(user.phoneVerifiedAt) || accountPhoneVerified;
  const verifiedAt = user.phoneVerifiedAt || account?.phoneVerifiedAt || "";
  const phoneVerifiedLabel = userPhoneVerified
    ? `${formatPhoneInput(user.phone || "") || "This phone"} is verified to ${user.name || "this person"}${verifiedAt ? ` since ${formatDateTime(verifiedAt)}` : ""}`
    : "Not verified yet";
  const [scope, setScope] = useState(initialScope || (canDeleteCustomerAccount ? "customer-account" : "personal"));
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [emailForm, setEmailForm] = useState(() => ({
    email: user.email || "",
    enabled: defaultNotify(user.role, user.notify).channels.email !== false
  }));
  const [emailStatus, setEmailStatus] = useState({ state: "idle", message: "" });
  const [mergeStatus, setMergeStatus] = useState({ state: "idle", message: "" });
  const customerConfirmation = account?.name || "DELETE";
  const personalConfirmation = user.name || "DELETE";
  const dataConfirmation = "DELETE DATA";
  const requiredConfirmation = scope === "customer-account" ? customerConfirmation : scope === "data" ? dataConfirmation : personalConfirmation;
  const propertyCount = scope === "customer-account" ? properties.length : user.propertyIds?.length || 0;
  const canSubmit = confirmation.trim() === requiredConfirmation;
  const propertyOverlapGroups = findPropertyAddressOverlapGroups(properties);

  useEffect(() => {
    setEmailForm({
      email: user.email || "",
      enabled: defaultNotify(user.role, user.notify).channels.email !== false
    });
  }, [user.id, user.email, user.notify, user.role]);

  useEffect(() => {
    if (initialScope === "data") {
      setScope("data");
      setConfirmation("");
    }
  }, [initialScope]);

  async function saveEmailSettings(event) {
    event.preventDefault();
    setEmailStatus({ state: "saving", message: "Saving email settings..." });
    try {
      const currentNotify = defaultNotify(user.role, user.notify);
      const response = await fetch(`/api/people/${user.id}/notify`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(await encryptContactTransitFields({
          email: emailForm.email,
          channels: {
            ...currentNotify.channels,
            email: emailForm.enabled
          }
        }))
      });
      const data = await response.json();
      if (!response.ok) {
        setEmailStatus({ state: "error", message: data.error || "Email settings could not be saved." });
        return;
      }
      await reloadState?.();
      setEmailStatus({
        state: "ok",
        message: emailForm.email.trim()
          ? "Email updates are saved."
          : "Email cleared. Add one any time to receive updates there."
      });
    } catch (error) {
      setEmailStatus({ state: "error", message: error.message });
    }
  }

  async function deleteAccount(event) {
    event.preventDefault();
    if (!canSubmit) {
      setStatus({ state: "error", message: `Type ${requiredConfirmation} exactly to confirm.` });
      return;
    }
    setStatus({ state: "saving", message: scope === "data" ? "Deleting data..." : "Deleting account..." });
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ scope, accountId: account?.id })
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus({ state: "error", message: data.error || "Account could not be deleted." });
        return;
      }
      if (scope === "data") {
        await reloadState?.();
        setConfirmation("");
        setStatus({ state: "ok", message: "Your repair and vendor data was deleted. Your account is still active." });
        return;
      }
      await signOut();
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  async function mergePropertyGroup(group, targetProperty) {
    const sourceProperties = group.properties.filter((item) => item.id !== targetProperty.id);
    if (!sourceProperties.length) return;
    const sourceNames = sourceProperties.map((item) => item.name).join(", ");
    const confirmed = window.confirm(`Merge ${sourceNames} into ${targetProperty.name}? Work orders, invoices, people, vendors, and billing events will move to the kept property.`);
    if (!confirmed) return;
    setMergeStatus({ state: "saving", message: "Merging property records..." });
    try {
      for (const sourceProperty of sourceProperties) {
        const response = await fetch(`/api/properties/${targetProperty.id}/merge`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ sourcePropertyId: sourceProperty.id })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Property merge failed.");
      }
      setActivePropertyId?.(targetProperty.id);
      await reloadState?.();
      setMergeStatus({ state: "ok", message: `${sourceNames} merged into ${targetProperty.name}.` });
    } catch (error) {
      setMergeStatus({ state: "error", message: error.message });
    }
  }

  return (
    <section className="account-settings-panel">
      <SectionTitle icon={<UserRound />} title="Account" eyebrow="Profile and deletion" />
      <div className="account-profile-grid">
        <MiniRow icon={<UserRound />} label="Signed in as" value={`${user.name} · ${user.role}`} />
        <MiniRow icon={<Phone />} label="Phone" value={formatPhoneInput(user.phone || "") || "Not set"} />
        <MiniRow
          icon={<ShieldCheck />}
          label="Phone verification"
          value={<span className={userPhoneVerified ? "verified-person-phone" : "unverified-person-phone"}>{phoneVerifiedLabel}</span>}
        />
        <MiniRow icon={<Mail />} label="Email" value={user.email || "Not set"} />
        <MiniRow icon={<Building2 />} label="Current property" value={property?.name || "Not assigned"} />
        <MiniRow icon={<LayoutDashboard />} label="Customer account" value={account?.name || "Not assigned"} />
      </div>
      <PropertyMergePanel
        groups={propertyOverlapGroups}
        status={mergeStatus}
        onMerge={mergePropertyGroup}
      />
      <form className="email-settings-card" onSubmit={saveEmailSettings}>
        <div>
          <span className="eyebrow">Notifications</span>
          <h3>Email updates</h3>
          <p>Add an email address if you want LivingRelay updates by email in addition to text or app notifications.</p>
        </div>
        <label>
          Email address
          <input
            value={emailForm.email}
            onChange={(event) => setEmailForm({ ...emailForm, email: event.target.value })}
            inputMode="email"
            autoComplete="email"
            placeholder="name@example.com"
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={emailForm.enabled}
            onChange={(event) => setEmailForm({ ...emailForm, enabled: event.target.checked })}
          />
          Send updates to this email
        </label>
        <button className="secondary wide" type="submit" disabled={emailStatus.state === "saving"}>
          <Mail size={15} /> {emailStatus.state === "saving" ? "Saving" : "Save email settings"}
        </button>
        {emailStatus.message && <p className={`login-error ${emailStatus.state === "ok" ? "ok" : ""}`}>{emailStatus.message}</p>}
      </form>
      <form className="danger-zone" onSubmit={deleteAccount}>
        <div>
          <span className="eyebrow">Danger zone</span>
          <h3>Delete account</h3>
          <p>
            {scope === "customer-account"
              ? `This deletes ${account?.name}, ${propertyCount} propert${propertyCount === 1 ? "y" : "ies"}, linked people, work orders, invoices, vendors, and billing events.`
              : scope === "data"
                ? "This deletes repair, invoice, vendor, and billing-event data while keeping your LivingRelay login, account, people, and property profiles active."
                : "This deletes your personal LivingRelay login and removes vendor profile data linked directly to you."}
          </p>
        </div>
        {canDeleteCustomerAccount && (
          <div className="delete-scope-toggle" role="group" aria-label="Deletion scope">
            <button type="button" className={scope === "customer-account" ? "active" : ""} onClick={() => { setScope("customer-account"); setConfirmation(""); }}>
              <Building2 size={15} /> Customer account
            </button>
            <button type="button" className={scope === "personal" ? "active" : ""} onClick={() => { setScope("personal"); setConfirmation(""); }}>
              <UserRound size={15} /> My login only
            </button>
            <button type="button" className={scope === "data" ? "active" : ""} onClick={() => { setScope("data"); setConfirmation(""); }}>
              <Database size={15} /> Data only
            </button>
          </div>
        )}
        {!canDeleteCustomerAccount && (
          <div className="delete-scope-toggle" role="group" aria-label="Deletion scope">
            <button type="button" className={scope === "personal" ? "active" : ""} onClick={() => { setScope("personal"); setConfirmation(""); }}>
              <UserRound size={15} /> My login
            </button>
            <button type="button" className={scope === "data" ? "active" : ""} onClick={() => { setScope("data"); setConfirmation(""); }}>
              <Database size={15} /> Data only
            </button>
          </div>
        )}
        <label>
          Type {requiredConfirmation} to confirm
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        </label>
        <button className="ghost danger wide" type="submit" disabled={!canSubmit || status.state === "saving"}>
          <Trash2 size={15} /> {status.state === "saving" ? "Deleting" : "Delete account"}
        </button>
        {status.message && <p className={`login-error ${status.state === "ok" ? "ok" : ""}`}>{status.message}</p>}
      </form>
    </section>
  );
}

function AdminConsole({ active, accounts, people, properties, vendors, orders, invoices, billingEvents, referrals = [], prospectingLeads = [], accessRequests = [], integrationConnections = [], integrationEvents = [], pmsProviders = [], auditLog, platformSettings, reloadState, siteAdminToken, onSiteAdminAuthExpired, setActivePropertyId, setActiveOrderId, setAdminSection }) {
  const activeProperties = properties.length;
  const pendingInvoices = invoices.filter((invoice) => !String(invoice.status).toLowerCase().includes("paid")).length;
  const openOrders = orders.filter((order) => order.status !== "Closed").length;
  const dispatchRevenue = billingEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
  const inboundLeads = prospectingLeads.filter(isInboundSalesLead);
  const openInboundLeads = inboundLeads.filter((lead) => ["New", "Researching", "Ready to contact"].includes(lead.status || "New")).length;
  return (
    <section className="admin-console">
      <div className="admin-overview">
        <Metric icon={<LayoutDashboard />} label="Customer accounts" value={accounts.length} />
        <Metric icon={<Mail />} label="Inbound leads" value={openInboundLeads || inboundLeads.length} />
        <Metric icon={<Target />} label="Prospecting leads" value={prospectingLeads.length} />
        <Metric icon={<Send />} label="Access requests" value={accessRequests.length} />
        <Metric icon={<DollarSign />} label="Dispatch fees" value={formatMoney(dispatchRevenue)} />
        <Metric icon={<ClipboardList />} label="Open support load" value={openOrders} />
      </div>
      {active === "accounts" && <>
        <PlatformVendorCallSettings platformSettings={platformSettings} reloadState={reloadState} siteAdminToken={siteAdminToken} />
        <SiteAccounts accounts={accounts} properties={properties} people={people} orders={orders} invoices={invoices} reloadState={reloadState} siteAdminToken={siteAdminToken} />
      </>}
      {active === "inboundLeads" && <AdminInboundLeads prospectingLeads={prospectingLeads} reloadState={reloadState} siteAdminToken={siteAdminToken} />}
      {active === "prospecting" && <AdminProspecting prospectingLeads={prospectingLeads} reloadState={reloadState} siteAdminToken={siteAdminToken} onSiteAdminAuthExpired={onSiteAdminAuthExpired} />}
      {active === "accessRequests" && <AdminAccessRequests accessRequests={accessRequests} referrals={referrals} reloadState={reloadState} siteAdminToken={siteAdminToken} />}
      {active === "directory" && <AdminDirectory people={people} properties={properties} accounts={accounts} reloadState={reloadState} />}
      {active === "properties" && <AdminProperties properties={properties} people={people} accounts={accounts} reloadState={reloadState} setActivePropertyId={setActivePropertyId} setAdminSection={setAdminSection} />}
      {active === "workOrders" && <AdminWorkOrders orders={orders} properties={properties} people={people} vendors={vendors} accounts={accounts} reloadState={reloadState} setActivePropertyId={setActivePropertyId} setActiveOrderId={setActiveOrderId} setAdminSection={setAdminSection} />}
      {active === "qa" && <AdminQaPanel siteAdminToken={siteAdminToken} onSiteAdminAuthExpired={onSiteAdminAuthExpired} reloadState={reloadState} setActivePropertyId={setActivePropertyId} setActiveOrderId={setActiveOrderId} setAdminSection={setAdminSection} />}
      {active === "billing" && <AdminBilling accounts={accounts} properties={properties} invoices={invoices} billingEvents={billingEvents} activeProperties={activeProperties} pendingInvoices={pendingInvoices} reloadState={reloadState} />}
      {active === "integrations" && <AdminIntegrations accounts={accounts} properties={properties} orders={orders} connections={integrationConnections} events={integrationEvents} providers={pmsProviders} reloadState={reloadState} siteAdminToken={siteAdminToken} />}
      {active === "diagnostics" && <AdminDiagnostics siteAdminToken={siteAdminToken} platformSettings={platformSettings} />}
      {active === "audit" && <AdminAudit auditLog={auditLog} />}
    </section>
  );
}

function AdminQaPanel({ siteAdminToken, onSiteAdminAuthExpired, reloadState, setActivePropertyId, setActiveOrderId, setAdminSection }) {
  const defaultScenarios = [
    { id: "leak_owner_approval", title: "Leak needs owner approval", trade: "Plumbing", severity: "Urgent", estimate: 325, issue: "Kitchen sink leak with active water under cabinet." },
    { id: "hvac_no_heat", title: "No heat urgent HVAC", trade: "HVAC", severity: "Urgent", estimate: 425, issue: "Heat is not turning on and thermostat is blank." },
    { id: "electrical_spark", title: "Electrical spark", trade: "Electrical", severity: "Urgent", estimate: 185, issue: "Bedroom outlet sparked and lights are out." }
  ];
  const defaultRoles = [
    { id: "tenant", label: "Tenant" },
    { id: "manager", label: "Manager" },
    { id: "owner", label: "Owner" },
    { id: "vendor", label: "Vendor" }
  ];
  const [scenarios, setScenarios] = useState(defaultScenarios);
  const [roles, setRoles] = useState(defaultRoles);
  const [form, setForm] = useState({ scenarioId: defaultScenarios[0].id, phone: "(386) 453-6280", email: "admin@stacksortenterprises.com", demoFallback: true, allowRealMessages: true, rolesToTest: ["tenant", "manager", "owner"] });
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [run, setRun] = useState(null);
  const [runLog, setRunLog] = useState([]);
  const [progress, setProgress] = useState([]);
  const [callbackInfo, setCallbackInfo] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);

  useEffect(() => {
    loadScenarios();
    loadRunLog();
  }, [siteAdminToken]);

  async function loadScenarios() {
    try {
      const response = await fetch("/api/site-admin/qa/scenarios", {
        headers: { Authorization: `Bearer ${siteAdminToken}` }
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (response.status === 401) {
        onSiteAdminAuthExpired?.(data.error || "Admin session expired. Please log in again.");
        return;
      }
      if (data.callbacks) setCallbackInfo(data.callbacks);
      if (data.notifications) setProviderStatus(data.notifications);
      if (data.roles?.length) setRoles(data.roles);
      if (response.ok && data.scenarios?.length) setScenarios(data.scenarios);
    } catch {
      setScenarios(defaultScenarios);
    }
  }

  function toggleRole(roleId) {
    setForm((current) => {
      const selected = new Set(current.rolesToTest || []);
      if (selected.has(roleId)) selected.delete(roleId);
      else selected.add(roleId);
      return { ...current, rolesToTest: Array.from(selected) };
    });
  }

  async function loadRunLog() {
    try {
      const response = await fetch("/api/site-admin/qa/runs?limit=30", {
        headers: { Authorization: `Bearer ${siteAdminToken}` }
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (response.status === 401) {
        onSiteAdminAuthExpired?.(data.error || "Admin session expired. Please log in again.");
        return;
      }
      if (response.ok) {
        setRunLog(data.runs || []);
        if (!run && data.runs?.[0]) setRun(data.runs[0]);
      }
    } catch {
      setRunLog([]);
    }
  }

  async function runQa(event) {
    event.preventDefault();
    setStatus({ state: "saving", message: "Running QA scenario..." });
    const nextProgress = [
      { id: "prepare", label: "Preparing scenario", state: "active" },
      { id: "environment", label: "Checking callback environment", state: "pending" },
      { id: "delivery", label: "Running message and call checks", state: "pending" },
      { id: "results", label: "Rendering findings", state: "pending" }
    ];
    setProgress(nextProgress);
    const updateProgress = (id, state) => {
      setProgress((items) => {
        const next = items.map((item) => item.id === id ? { ...item, state } : item);
        const activeIndex = next.findIndex((item) => item.id === id);
        if (state === "done" && activeIndex >= 0 && next[activeIndex + 1]?.state === "pending") {
          next[activeIndex + 1] = { ...next[activeIndex + 1], state: "active" };
        }
        return next;
      });
    };
    try {
      updateProgress("prepare", "done");
      const response = await fetch("/api/site-admin/qa/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
        body: JSON.stringify(await encryptContactTransitFields(form))
      });
      updateProgress("environment", "done");
      updateProgress("delivery", "done");
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (response.status === 401) {
        onSiteAdminAuthExpired?.(data.error || "Admin session expired. Please log in again.");
        return;
      }
      if (!response.ok) throw new Error(data.error || "QA run failed");
      setRun(data.run);
      setRunLog(data.history || [data.run, ...runLog.filter((item) => item.id !== data.run.id)]);
      if (data.run?.callbacks) setCallbackInfo(data.run.callbacks);
      if (data.run?.notificationProviders) setProviderStatus(data.run.notificationProviders);
      updateProgress("results", "done");
      const deliverySummary = summarizeQaDeliveries(data.run.deliveries || []);
      setStatus({
        state: data.run.issues?.some((issue) => issue.severity === "error") ? "error" : "ok",
        message: `${data.run.scenarioTitle} finished with ${data.run.issues?.length || 0} finding${data.run.issues?.length === 1 ? "" : "s"}.${deliverySummary ? ` ${deliverySummary}` : ""}`
      });
    } catch (error) {
      setProgress((items) => items.map((item) => item.state === "active" ? { ...item, state: "error" } : item));
      setStatus({ state: "error", message: error.message });
    }
  }

  function openWorkOrder() {
    if (!run?.workOrderId) return;
    setActivePropertyId(run.property?.id);
    setActiveOrderId(run.workOrderId);
    setAdminSection("workOrders");
  }

  const selectedScenario = scenarios.find((scenario) => scenario.id === form.scenarioId) || scenarios[0];
  return (
    <div className="qa-view">
      <section className="panel qa-runner-panel">
        <div className="diagnostics-head">
          <SectionTitle icon={<ShieldCheck />} title="QA runner" eyebrow="Admin smoke tests" />
          {run?.workOrderId && <button className="secondary" type="button" onClick={openWorkOrder}><ClipboardList size={15} /> Open work order</button>}
        </div>
        <form className="qa-form" onSubmit={runQa}>
          <label className="span-2">Scenario
            <select value={form.scenarioId} onChange={(event) => setForm({ ...form, scenarioId: event.target.value })}>
              {scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.title}</option>)}
            </select>
          </label>
          <label>QA phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: formatPhoneInput(event.target.value) })} inputMode="tel" placeholder="Real phone for SMS/test call" /></label>
          <label>QA email<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} inputMode="email" placeholder="Real email for delivery" /></label>
          <fieldset className="qa-role-picker span-2">
            <legend>Roles to test</legend>
            <div>
              {roles.map((role) => (
                <label className="check-row" key={role.id}>
                  <input type="checkbox" checked={(form.rolesToTest || []).includes(role.id)} onChange={() => toggleRole(role.id)} />
                  {role.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="check-row span-2"><input type="checkbox" checked={form.allowRealMessages} onChange={(event) => setForm({ ...form, allowRealMessages: event.target.checked })} /> Send real SMS/email to the QA contacts</label>
          <label className="check-row span-2"><input type="checkbox" checked={form.demoFallback} onChange={(event) => setForm({ ...form, demoFallback: event.target.checked })} /> Generate demo vendor outcomes when live calls are disabled</label>
          <button className="primary wide" type="submit" disabled={status.state === "saving"}><Radio size={16} /> {status.state === "saving" ? "Running" : "Run QA"}</button>
        </form>
        <div className={`qa-delivery-mode ${callbackInfo?.mismatch ? "warn" : "ok"}`}>
          <strong>{callbackInfo?.mismatch ? form.allowRealMessages ? "Real SMS/email, protected voice callbacks" : "Preview-only on this local page" : "Live delivery environment"}</strong>
          <p>
            {callbackInfo?.mismatch
              ? form.allowRealMessages
                ? `This page is running on ${callbackInfo.requestUrl}. QA will send real SMS/email to the test contacts, but replies and voice callbacks go to ${callbackInfo.appPublicUrl}; voice calls stay skipped here.`
                : `This page is running on ${callbackInfo.requestUrl}, but SMS replies and voice callbacks go to ${callbackInfo.appPublicUrl}. Local QA shows the exact SMS/email updates and skips callback-bound sends.`
              : "SMS, email, and voice checks use this same environment, so live delivery can be tested here."}
          </p>
        </div>
        {providerStatus && (
          <div className="qa-provider-grid">
            {qaProviderRows(providerStatus).map((item) => (
              <div className={`qa-provider-card ${item.tone}`} key={item.label}>
                <span>{item.label}</span>
                <strong>{item.status}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        )}
        {progress.length > 0 && (
          <div className="qa-progress-list" aria-live="polite">
            {progress.map((item) => (
              <div className={`qa-progress-step ${item.state}`} key={item.id}>
                <span>{item.state === "done" ? "OK" : item.state === "error" ? "!" : ""}</span>
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>
        )}
        {status.message && <p className={`form-status ${status.state}`}>{status.message}</p>}
      </section>
      <section className="panel qa-scenario-panel">
        <SectionTitle icon={<ClipboardList />} title="Scenario scope" eyebrow={selectedScenario?.trade || "Scenario"} />
        <div className="qa-scenario-summary">
          <strong>{selectedScenario?.title}</strong>
          <p>{selectedScenario?.issue}</p>
          <div>
            <span>{selectedScenario?.severity}</span>
            <span>{formatMoney(selectedScenario?.estimate || 0)}</span>
            <span>{selectedScenario?.trade}</span>
          </div>
        </div>
      </section>
      {(run || status.state === "saving") && (
        <section className="panel qa-results-panel">
          <SectionTitle icon={<Database />} title="QA results" eyebrow={run?.status || "Running"} />
          {run ? <div className="qa-result-grid">
            <DiagnosticBlock title="Findings">
              {run.issues.map((issue, index) => (
                <DiagnosticRow key={`${issue.area}-${index}`} label={issue.area} value={issue.detail} tone={issue.severity === "error" ? "error" : issue.severity === "warn" ? "warn" : "ok"} />
              ))}
            </DiagnosticBlock>
            <DiagnosticBlock title="Messages">
              {(run.deliveries || []).length === 0 && <DiagnosticRow label="Delivery" value="No phone or email entered." tone="warn" />}
              {(run.deliveries || []).filter((delivery) => !String(delivery.channel || "").startsWith("lifecycle_")).map((delivery, index) => (
                <DiagnosticRow key={`${delivery.channel}-${index}`} label={delivery.channel} value={[delivery.to, delivery.status, delivery.errorCode ? `Twilio ${delivery.errorCode}` : "", delivery.providerId, delivery.reason].filter(Boolean).join(" · ")} tone={delivery.skipped ? "warn" : delivery.sent ? "ok" : "error"} />
              ))}
            </DiagnosticBlock>
            <DiagnosticBlock title="Workflow Simulation">
              {!run.workflow?.length && <DiagnosticRow label="Flow" value="No workflow simulation returned." tone="warn" />}
              {run.workflow?.map((step) => (
                <QaWorkflowStep step={step} key={step.id} />
              ))}
            </DiagnosticBlock>
            <DiagnosticBlock title="Persona Experiences">
              {!run.personas?.length && <DiagnosticRow label="Roles" value="No personas selected for this QA run." tone="warn" />}
              {run.personas?.map((persona) => (
                <QaPersonaPreview persona={persona} key={persona.role} />
              ))}
            </DiagnosticBlock>
            <DiagnosticBlock title="User Updates">
              {run.userUpdates?.sms?.body && (
                <QaMessagePreview channel="SMS" to={run.userUpdates.sms.to} body={run.userUpdates.sms.body} />
              )}
              {run.userUpdates?.email?.body && (
                <QaMessagePreview channel="Email" to={run.userUpdates.email.to} subject={run.userUpdates.email.subject} body={run.userUpdates.email.body} />
              )}
            </DiagnosticBlock>
            <DiagnosticBlock title="Lifecycle Updates">
              {!(run.deliveries || []).some((delivery) => String(delivery.channel || "").startsWith("lifecycle_")) && <DiagnosticRow label="Lifecycle" value="No lifecycle notifications generated." tone="warn" />}
              {(run.deliveries || []).filter((delivery) => String(delivery.channel || "").startsWith("lifecycle_")).map((delivery, index) => (
                <QaDeliveryPreview delivery={delivery} key={`${delivery.channel}-${delivery.stepId}-${delivery.role}-${index}`} />
              ))}
            </DiagnosticBlock>
            <DiagnosticBlock title="Calls">
              <DiagnosticRow label="Call flow" value={run.callResult.reason || (run.callResult.demo ? "Demo fallback generated" : run.callResult.started ? "Started" : "Not started")} tone={run.callResult.skipped ? "warn" : run.callResult.started ? "ok" : "error"} />
              {run.calls.map((call, index) => (
                <DiagnosticRow key={`${call.vendor}-${index}`} label={call.vendor || "Vendor"} value={[call.to, call.callSid || call.conversationId || call.status, call.reason].filter(Boolean).join(" · ")} tone={call.success ? "ok" : "error"} />
              ))}
            </DiagnosticBlock>
            <DiagnosticBlock title="Callbacks">
              <DiagnosticRow label="Current app" value={run.callbacks?.requestUrl || "Unknown"} />
              <DiagnosticRow label="Twilio target" value={run.callbacks?.appPublicUrl || "Unknown"} tone={run.callbacks?.mismatch ? "warn" : "ok"} />
              <DiagnosticRow label="SMS replies" value={run.callbacks?.smsInboundUrl || "Unknown"} tone={run.callbacks?.mismatch ? "warn" : "ok"} />
              <DiagnosticRow label="Voice webhooks" value={run.callbacks?.voiceOutboundUrl || "Unknown"} tone={run.callbacks?.mismatch ? "warn" : "ok"} />
            </DiagnosticBlock>
            <DiagnosticBlock title="Artifacts">
              {run.notificationProviders && qaProviderRows(run.notificationProviders).map((item) => (
                <DiagnosticRow key={item.label} label={item.label} value={item.detail} tone={item.tone} />
              ))}
              <DiagnosticRow label="Run" value={run.id} />
              <DiagnosticRow label="Work order" value={run.workOrderId} tone="ok" />
              <DiagnosticRow label="Property" value={run.property?.name || "Unknown"} />
              <DiagnosticRow label="Completed" value={new Date(run.completedAt).toLocaleString()} />
            </DiagnosticBlock>
          </div> : <p className="form-note">QA is running. Results will appear here without leaving this tab.</p>}
        </section>
      )}
      <section className="panel qa-log-panel">
        <SectionTitle icon={<Database />} title="QA run log" eyebrow={`${runLog.length} saved`} />
        <div className="qa-run-log">
          {runLog.length === 0 && <p className="form-note">No saved QA runs yet. Production runs will appear here after each QA execution.</p>}
          {runLog.map((item) => {
            const errorCount = item.issues?.filter((issue) => issue.severity === "error").length || 0;
            const warnCount = item.issues?.filter((issue) => issue.severity === "warn").length || 0;
            const deliveries = qaDeliveryCounts(item.deliveries || []);
            const selected = run?.id === item.id;
            return (
              <button className={`qa-run-log-item ${selected ? "selected" : ""}`} type="button" key={item.id} onClick={() => setRun(item)}>
                <span>{item.environment || "local"}</span>
                <div>
                  <strong>{item.scenarioTitle}</strong>
                  <small>{item.workOrderId} · {new Date(item.completedAt || item.startedAt).toLocaleString()}</small>
                  <small>{item.workflow?.length || 0} lifecycle steps · {(item.personas || []).map((persona) => persona.label).join(", ") || "No roles"}</small>
                </div>
                <div className="qa-run-log-badges">
                  <em className={errorCount ? "error" : warnCount ? "warn" : "ok"}>{errorCount ? `${errorCount} errors` : warnCount ? `${warnCount} warnings` : "OK"}</em>
                  <em className={deliveries.sms.failed ? "error" : deliveries.sms.sent ? "ok" : "warn"}>SMS {deliveries.sms.sent}/{deliveries.sms.total}</em>
                  <em className={deliveries.email.failed ? "error" : deliveries.email.sent ? "ok" : "warn"}>Email {deliveries.email.sent}/{deliveries.email.total}</em>
                  <em className={deliveries.push.failed ? "error" : deliveries.push.total ? "warn" : "ok"}>Push {deliveries.push.sent}/{deliveries.push.total}</em>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function summarizeQaDeliveries(deliveries = []) {
  if (!deliveries.length) return "";
  const groups = deliveries.reduce((acc, delivery) => {
    const channel = String(delivery.channel || "delivery").replace("lifecycle_", "");
    acc[channel] ||= { sent: 0, failed: 0, skipped: 0, errors: new Set() };
    if (delivery.skipped) acc[channel].skipped += 1;
    else if (delivery.sent) acc[channel].sent += 1;
    else {
      acc[channel].failed += 1;
      if (delivery.errorCode) acc[channel].errors.add(delivery.errorCode);
    }
    return acc;
  }, {});
  return Object.entries(groups).map(([channel, counts]) => {
    const label = channel.toUpperCase();
    const errorText = counts.errors.size ? ` (${Array.from(counts.errors).join(", ")})` : "";
    return `${label}: ${counts.sent} sent, ${counts.failed} failed${errorText}, ${counts.skipped} skipped`;
  }).join("; ");
}

function qaProviderRows(providers = {}) {
  const sms = providers.sms || {};
  const email = providers.email || {};
  const push = providers.push || {};
  const smsUsesMessagingService = sms.senderMode === "messaging_service" || Boolean(sms.messagingServiceSid);
  return [
    {
      label: "SMS",
      status: sms.configured ? smsUsesMessagingService ? "Ready" : "A2P risk" : "Needs setup",
      tone: sms.configured && smsUsesMessagingService ? "ok" : "warn",
      detail: sms.configured
        ? smsUsesMessagingService
          ? ["Messaging Service", sms.messagingServiceSid].filter(Boolean).join(": ")
          : `Direct number ${sms.from || "configured"}; A2P delivery should use a registered Messaging Service`
        : `Missing ${sms.missing?.join(", ") || "Twilio sender config"}`
    },
    {
      label: "Email",
      status: email.configured ? "Ready" : "Needs email API",
      tone: email.configured ? "ok" : "warn",
      detail: email.configured
        ? `${email.provider || "email"} from ${email.from || "configured sender"}`
        : `Missing ${email.missing?.join(", ") || "Resend or SendGrid API key"}`
    },
    {
      label: "iOS push",
      status: push.ios?.configured ? "Ready" : "Needs APNS",
      tone: push.ios?.configured ? "ok" : "warn",
      detail: push.ios?.configured ? "APNS credentials configured" : `Missing ${push.ios?.missing?.join(", ") || "APNS credentials"}`
    },
    {
      label: "Android push",
      status: push.android?.configured ? "Ready" : "Needs FCM",
      tone: push.android?.configured ? "ok" : "warn",
      detail: push.android?.configured ? "Firebase Cloud Messaging configured" : `Missing ${push.android?.missing?.join(", ") || "FCM credentials"}`
    }
  ];
}

function qaDeliveryCounts(deliveries = []) {
  const counts = {
    sms: { total: 0, sent: 0, failed: 0, skipped: 0 },
    email: { total: 0, sent: 0, failed: 0, skipped: 0 },
    push: { total: 0, sent: 0, failed: 0, skipped: 0 }
  };
  deliveries.forEach((delivery) => {
    const raw = String(delivery.channel || "");
    const channel = raw.includes("sms") ? "sms" : raw.includes("email") ? "email" : raw.includes("push") ? "push" : "";
    if (!channel) return;
    counts[channel].total += 1;
    if (delivery.skipped) counts[channel].skipped += 1;
    else if (delivery.sent) counts[channel].sent += 1;
    else counts[channel].failed += 1;
  });
  return counts;
}

function QaDeliveryPreview({ delivery }) {
  const channel = String(delivery.channel || "").replace("lifecycle_", "").toUpperCase();
  const tone = delivery.skipped ? "warn" : delivery.sent ? "ok" : "error";
  return (
    <div className={`qa-message-preview ${tone}`}>
      <span>{channel} · {delivery.role ? qaRoleName(delivery.role) : "QA"} · {delivery.to || "not set"}</span>
      {delivery.subject && <strong>{delivery.subject}</strong>}
      <p>{delivery.preview || delivery.reason || "No preview returned."}</p>
      <small>{delivery.sent ? "Sent" : delivery.skipped ? "Preview" : "Failed"}{delivery.reason ? ` · ${delivery.reason}` : ""}</small>
    </div>
  );
}

function qaRoleName(role) {
  return String(role || "").replace(/^\w/, (letter) => letter.toUpperCase());
}

function QaPersonaPreview({ persona }) {
  const errorCount = persona.checks?.filter((check) => check.status === "error").length || 0;
  return (
    <div className="qa-persona-preview">
      <div>
        <span>{persona.label}</span>
        <strong>{persona.actor}</strong>
        <em className={errorCount ? "error" : "ok"}>{errorCount ? `${errorCount} issue${errorCount === 1 ? "" : "s"}` : "OK"}</em>
      </div>
      <p>{persona.summary}</p>
      <ul>
        {(persona.screens || []).map((screen) => <li key={screen}>{screen}</li>)}
      </ul>
      {Boolean(persona.journey?.length) && (
        <div className="qa-persona-journey">
          <strong>Role journey</strong>
          {persona.journey.map((step) => <p key={step}>{step}</p>)}
        </div>
      )}
      <div className="qa-persona-checks">
        {(persona.checks || []).map((check, index) => (
          <span className={check.status} key={`${persona.role}-${index}`}>{check.detail}</span>
        ))}
      </div>
    </div>
  );
}

function QaWorkflowStep({ step }) {
  return (
    <div className="qa-workflow-step">
      <span>{step.index}</span>
      <div>
        <strong>{step.title}</strong>
        <p>{step.detail}</p>
        <small>{step.actor} → {step.recipient} · {step.state} · {(step.channels || []).join(", ")}</small>
      </div>
    </div>
  );
}

function QaMessagePreview({ channel, to, subject, body }) {
  return (
    <div className="qa-message-preview">
      <span>{channel} to {to || "not set"}</span>
      {subject && <strong>{subject}</strong>}
      <p>{body}</p>
    </div>
  );
}

function ProspectingDetail({ label, value }) {
  if (!value) return null;
  return (
    <div className="prospecting-detail">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function prospectingOutreachMessage(lead) {
  const propertyContext = [lead.rentalAddress, lead.market].filter(Boolean).join(" in ") || "your rental";
  const signal = lead.maintenancePainSignals ? ` I noticed ${lead.maintenancePainSignals}.` : "";
  const angle = lead.recommendedAngle || "I am looking for a few small rental owners to test a text-first maintenance workflow.";
  const contact = lead.contactName ? `Hi ${lead.contactName.split(" ")[0]},` : "Hi,";
  return `${contact} ${angle}${signal} LivingRelay helps tenants report repairs by text, captures photos and access notes, and keeps vendor updates, owner approvals, and repair records tied to ${propertyContext}. Would you be open to testing it on one unit before the next maintenance issue?`;
}

function prospectingSourceMixCount(leads, target) {
  return leads.filter((lead) => {
    if (target.segments?.includes(lead.segment || "")) return true;
    if (target.sourceTypes?.includes(lead.sourceType || "")) return true;
    return false;
  }).length;
}

function AdminProspecting({ prospectingLeads = [], reloadState, siteAdminToken, onSiteAdminAuthExpired }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [segmentFilter, setSegmentFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("San Francisco");
  const [fitFilter, setFitFilter] = useState("Owner 1-5 + vacancy + phone");
  const [refreshStatus, setRefreshStatus] = useState({ state: "idle", message: "" });
  const [form, setForm] = useState({
    name: "",
    segment: "Small owner",
    priority: "Medium",
    status: "New",
    contactName: "",
    contactRole: "",
    email: "",
    phone: "",
    website: "",
    listingUrl: "",
    rentalAddress: "",
    market: "",
    unitCount: "",
    unitRange: "Unknown",
    activeVacancy: "Unknown",
    publicPhonePresent: false,
    ownerOperatorConfidence: "Medium",
    pmsComplexity: "Unknown",
    sourceType: "Other",
    maintenancePainSignals: "",
    recommendedAngle: "",
    leadScore: 0,
    sourceName: "",
    fit: "",
    notes: ""
  });
  const [saveStatus, setSaveStatus] = useState("");
  const searchable = (lead) => [
    lead.name,
    lead.segment,
    lead.status,
    lead.priority,
    lead.fit,
    lead.contactName,
    lead.contactRole,
    lead.email,
    lead.phone,
    lead.website,
    lead.listingUrl,
    lead.rentalAddress,
    lead.market,
    lead.unitCount,
    lead.unitRange,
    lead.activeVacancy,
    lead.ownerOperatorConfidence,
    lead.pmsComplexity,
    lead.sourceType,
    lead.maintenancePainSignals,
    lead.recommendedAngle,
    lead.leadScore,
    lead.sourceName,
    lead.notes
  ].join(" ").toLowerCase();
  const isOwnerOneToFive = (lead) => ["Small owner", "Small landlord"].includes(lead.segment || "") && ["1", "2-4", "5-10"].includes(lead.unitRange || "") && (lead.unitRange !== "5-10" || String(lead.unitCount || "").match(/\b5\b/));
  const hasVacancy = (lead) => ["Yes", "Likely"].includes(lead.activeVacancy || "");
  const hasPublicPhone = (lead) => Boolean(lead.publicPhonePresent || lead.phone);
  const lowComplexity = (lead) => !["Complex"].includes(lead.pmsComplexity || "");
  const leadCity = (lead) => String(lead.market || lead.city || "").trim();
  const cityOptions = Array.from(new Set([
    ...prospectingTargetMarkets,
    ...prospectingLeads.map(leadCity).filter(Boolean)
  ]));
  const marketLeads = prospectingLeads.filter((lead) => cityFilter === "All" || leadCity(lead).toLowerCase() === cityFilter.toLowerCase());
  const filteredLeads = prospectingLeads
    .filter((lead) => statusFilter === "All" || (lead.status || "New") === statusFilter)
    .filter((lead) => segmentFilter === "All" || (lead.segment || "Property manager") === segmentFilter)
    .filter((lead) => cityFilter === "All" || leadCity(lead).toLowerCase() === cityFilter.toLowerCase())
    .filter((lead) => {
      if (fitFilter === "All") return true;
      if (fitFilter === "Owner 1-5 + vacancy + phone") return isOwnerOneToFive(lead) && hasVacancy(lead) && hasPublicPhone(lead) && lowComplexity(lead);
      if (fitFilter === "Has maintenance signals") return Boolean(lead.maintenancePainSignals);
      if (fitFilter === "No complex PMS") return lowComplexity(lead);
      if (fitFilter === "Small PM mix") return (lead.segment || "") === "Property manager" && lowComplexity(lead);
      return true;
    })
    .filter((lead) => searchable(lead).includes(query.toLowerCase()))
    .sort((left, right) => {
      const priorityOrder = { High: 0, Medium: 1, Low: 2 };
      return (priorityOrder[left.priority] ?? 1) - (priorityOrder[right.priority] ?? 1) || Number(right.leadScore || 0) - Number(left.leadScore || 0) || new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0);
    });

  async function addLead(event) {
    event.preventDefault();
    setSaveStatus("Saving...");
    try {
      await fetch("/api/site-admin/prospecting-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
        body: JSON.stringify(await encryptContactTransitFields(form))
      });
      setForm({ ...form, name: "", contactName: "", email: "", phone: "", website: "", listingUrl: "", rentalAddress: "", unitCount: "", unitRange: "Unknown", activeVacancy: "Unknown", publicPhonePresent: false, maintenancePainSignals: "", recommendedAngle: "", leadScore: 0, fit: "", notes: "" });
      setSaveStatus("Lead saved");
      await reloadState?.();
    } catch (error) {
      setSaveStatus(error.message || "Could not save lead");
    }
  }

  async function updateLead(lead, updates) {
    await fetch(`/api/site-admin/prospecting-leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
      body: JSON.stringify(await encryptContactTransitFields(updates))
    });
    await reloadState?.();
  }

  async function runProspectingRefresh() {
    setRefreshStatus({ state: "running", message: `Generating ${cityFilter === "All" ? "target-market" : cityFilter} leads...` });
    try {
      const response = await fetch("/api/site-admin/prospecting-refresh/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
        body: JSON.stringify({ market: cityFilter, limit: cityFilter === "All" ? 18 : 12 })
      });
      if (response.status === 401) {
        await onSiteAdminAuthExpired?.();
        throw new Error("Admin session expired. Please log in again.");
      }
      if (!response.ok || !response.body) {
        const text = await response.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }
        throw new Error(data.error || `Prospecting refresh failed (${response.status})`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let totals = { added: 0, updated: 0, market: cityFilter };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const event = parseSseEvent(part);
          if (!event) continue;
          if (event.event === "progress") {
            setRefreshStatus({ state: "running", message: event.data.message || "Searching public sources..." });
          } else if (event.event === "leads") {
            totals = { added: event.data.added || 0, updated: event.data.updated || 0, market: event.data.market || cityFilter };
            setRefreshStatus({ state: "running", message: `${totals.added} added, ${totals.updated} updated. Showing latest batch...` });
            await reloadState?.();
          } else if (event.event === "done") {
            totals = { added: event.data.added || 0, updated: event.data.updated || 0, market: event.data.market || cityFilter };
          } else if (event.event === "error") {
            throw new Error(event.data.error || "Prospecting refresh failed");
          }
        }
      }
      setRefreshStatus({ state: "ok", message: `${totals.added} added, ${totals.updated} updated for ${totals.market}.` });
      await reloadState?.();
    } catch (error) {
      setRefreshStatus({ state: "error", message: error.message || "Prospecting refresh failed" });
    }
  }

  return (
    <section className="panel">
      <SectionTitle icon={<Target />} title="Prospecting pipeline" eyebrow="Public rental leads" />
      <div className="admin-overview">
        <Metric icon={<Target />} label="Total leads" value={prospectingLeads.length} />
        <Metric icon={<Home />} label="Owner 1-5 fit" value={prospectingLeads.filter((lead) => isOwnerOneToFive(lead) && hasVacancy(lead) && hasPublicPhone(lead) && lowComplexity(lead)).length} />
        <Metric icon={<Bell />} label="Ready to contact" value={prospectingLeads.filter((lead) => lead.status === "Ready to contact").length} />
        <Metric icon={<Check />} label="Contacted" value={prospectingLeads.filter((lead) => lead.status === "Contacted").length} />
      </div>
      <div className="prospecting-source-mix">
        {prospectingSourceMixTargets.map((target) => (
          <div key={target.label}>
            <span>{target.label}</span>
            <strong>{prospectingSourceMixCount(marketLeads, target)}</strong>
            <small>target {target.target}</small>
          </div>
        ))}
      </div>
      <div className="prospecting-refresh-row">
        <button className="primary" type="button" onClick={runProspectingRefresh} disabled={refreshStatus.state === "running"}>
          <Sparkles size={16} /> Generate leads
        </button>
        {refreshStatus.message && <p className={`integration-status ${refreshStatus.state === "error" ? "error" : refreshStatus.state === "ok" ? "ok" : "idle"}`}>{refreshStatus.message}</p>}
      </div>
      <div className="search-box">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, market, source, contact, notes, or listing URL" />
      </div>
      <div className="prospecting-market-bar">
        <label>City<select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
          <option>All</option>
          {cityOptions.map((city) => <option key={city}>{city}</option>)}
        </select></label>
        <div className="market-chip-list">
          {prospectingTargetMarkets.map((city) => (
            <button key={city} type="button" className={cityFilter === city ? "active" : ""} onClick={() => setCityFilter(city)}>{city}</button>
          ))}
        </div>
      </div>
      <div className="role-section-tabs prospecting-filters">
        {["All", "New", "Ready to contact", "Contacted", "Replied", "Not a fit", "Do not contact"].map((status) => (
          <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status}</button>
        ))}
      </div>
      <div className="role-section-tabs prospecting-filters">
        {["All", "Small owner", "Small landlord", "Apartment rental", "Property manager"].map((segment) => (
          <button key={segment} className={segmentFilter === segment ? "active" : ""} onClick={() => setSegmentFilter(segment)}>{segment}</button>
        ))}
      </div>
      <div className="role-section-tabs prospecting-filters">
        {prospectingFitFilters.map((filter) => (
          <button key={filter} className={fitFilter === filter ? "active" : ""} onClick={() => setFitFilter(filter)}>{filter}</button>
        ))}
      </div>
      <div className="admin-card-list">
        {filteredLeads.length === 0 && <p className="form-note">No prospecting leads match this view yet.</p>}
        {filteredLeads.map((lead) => (
          <article className="admin-record prospecting-record" key={lead.id}>
            <div>
              <span>{lead.segment || "Property manager"} · {lead.priority || "Medium"} priority · {lead.status || "New"} · Score {lead.leadScore || 0}</span>
              <strong>{lead.name}</strong>
              <div className="prospecting-summary">
                <ProspectingDetail label="Found via" value={[lead.sourceName, lead.website || lead.listingUrl].filter(Boolean).join(" · ")} />
                <ProspectingDetail label="Portfolio / properties" value={[lead.market, lead.rentalAddress, lead.unitCount].filter(Boolean).join(" · ") || "Portfolio details pending"} />
                <ProspectingDetail label="Owner/vacancy fit" value={[`Units: ${lead.unitRange || "Unknown"}`, `Vacancy: ${lead.activeVacancy || "Unknown"}`, `Phone: ${hasPublicPhone(lead) ? "Yes" : "No"}`, `Owner confidence: ${lead.ownerOperatorConfidence || "Medium"}`, `PMS: ${lead.pmsComplexity || "Unknown"}`, lead.sourceType].filter(Boolean).join(" · ")} />
                <ProspectingDetail label="Public contact" value={[lead.contactName, lead.contactRole, lead.email, lead.phone].filter(Boolean).join(" · ") || "Public contact details pending"} />
                <ProspectingDetail label="Maintenance signals" value={lead.maintenancePainSignals} />
                <ProspectingDetail label="Suggested angle" value={lead.recommendedAngle} />
                <ProspectingDetail label="Starter outreach" value={prospectingOutreachMessage(lead)} />
                <ProspectingDetail label="Why LivingRelay may help" value={lead.fit} />
                <ProspectingDetail label="Source notes" value={lead.notes} />
              </div>
            </div>
            <div className="record-actions">
              <select value={lead.status || "New"} onChange={(event) => updateLead(lead, { status: event.target.value })}>
                {["New", "Researching", "Ready to contact", "Contacted", "Replied", "Not a fit", "Do not contact"].map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={lead.priority || "Medium"} onChange={(event) => updateLead(lead, { priority: event.target.value })}>
                {["High", "Medium", "Low"].map((priority) => <option key={priority}>{priority}</option>)}
              </select>
              {lead.website && <a className="ghost link-like-button" href={lead.website} target="_blank" rel="noreferrer">Website</a>}
              {lead.listingUrl && <a className="ghost link-like-button" href={lead.listingUrl} target="_blank" rel="noreferrer">Listing</a>}
            </div>
          </article>
        ))}
      </div>
      <SectionTitle icon={<Plus />} title="Add lead" eyebrow="Manual or automation entry" />
      <form className="admin-form" onSubmit={addLead}>
        <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label>Segment<select value={form.segment} onChange={(event) => setForm({ ...form, segment: event.target.value })}><option>Property manager</option><option>Apartment rental</option><option>Small landlord</option><option>Small owner</option></select></label>
        <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></label>
        <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>New</option><option>Researching</option><option>Ready to contact</option><option>Contacted</option><option>Replied</option><option>Not a fit</option><option>Do not contact</option></select></label>
        <label>Contact name<input value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} /></label>
        <label>Contact role<input value={form.contactRole} onChange={(event) => setForm({ ...form, contactRole: event.target.value })} /></label>
        <label>Email<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value, publicPhonePresent: Boolean(event.target.value.trim()) })} /></label>
        <label>Website<input value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} /></label>
        <label>Listing URL<input value={form.listingUrl} onChange={(event) => setForm({ ...form, listingUrl: event.target.value })} /></label>
        <label>Market<input list="prospecting-target-markets" value={form.market} onChange={(event) => setForm({ ...form, market: event.target.value })} /></label>
        <datalist id="prospecting-target-markets">{prospectingTargetMarkets.map((city) => <option value={city} key={city} />)}</datalist>
        <label>Rental address<input value={form.rentalAddress} onChange={(event) => setForm({ ...form, rentalAddress: event.target.value })} /></label>
        <label>Unit count<input value={form.unitCount} onChange={(event) => setForm({ ...form, unitCount: event.target.value })} /></label>
        <label>Unit range<select value={form.unitRange} onChange={(event) => setForm({ ...form, unitRange: event.target.value })}>{prospectingUnitRanges.map((range) => <option key={range}>{range}</option>)}</select></label>
        <label>Active vacancy<select value={form.activeVacancy} onChange={(event) => setForm({ ...form, activeVacancy: event.target.value })}>{prospectingVacancyStates.map((state) => <option key={state}>{state}</option>)}</select></label>
        <label>Public phone<select value={form.publicPhonePresent ? "Yes" : "No"} onChange={(event) => setForm({ ...form, publicPhonePresent: event.target.value === "Yes" })}><option>Yes</option><option>No</option></select></label>
        <label>Owner confidence<select value={form.ownerOperatorConfidence} onChange={(event) => setForm({ ...form, ownerOperatorConfidence: event.target.value })}>{prospectingOwnerConfidence.map((confidence) => <option key={confidence}>{confidence}</option>)}</select></label>
        <label>PMS complexity<select value={form.pmsComplexity} onChange={(event) => setForm({ ...form, pmsComplexity: event.target.value })}>{prospectingPmsComplexity.map((complexity) => <option key={complexity}>{complexity}</option>)}</select></label>
        <label>Source type<select value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value })}>{prospectingSourceTypes.map((sourceType) => <option key={sourceType}>{sourceType}</option>)}</select></label>
        <label>Lead score<input type="number" min="0" max="100" value={form.leadScore} onChange={(event) => setForm({ ...form, leadScore: event.target.value })} /></label>
        <label>Source<input value={form.sourceName} onChange={(event) => setForm({ ...form, sourceName: event.target.value })} /></label>
        <label className="span-2">Fit<input value={form.fit} onChange={(event) => setForm({ ...form, fit: event.target.value })} /></label>
        <label className="span-2">Maintenance signals<input value={form.maintenancePainSignals} onChange={(event) => setForm({ ...form, maintenancePainSignals: event.target.value })} /></label>
        <label className="span-2">Suggested angle<input value={form.recommendedAngle} onChange={(event) => setForm({ ...form, recommendedAngle: event.target.value })} /></label>
        <label className="span-2">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <button className="primary" type="submit"><Plus size={16} /> Save lead</button>
        {saveStatus && <p className="form-note">{saveStatus}</p>}
      </form>
    </section>
  );
}

function AdminInboundLeads({ prospectingLeads = [], reloadState, siteAdminToken }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Open");
  const inboundLeads = prospectingLeads
    .filter(isInboundSalesLead)
    .filter((lead) => statusFilter === "All" || (
      statusFilter === "Open"
        ? ["New", "Researching", "Ready to contact"].includes(lead.status || "New")
        : (lead.status || "New") === statusFilter
    ))
    .filter((lead) => [
      lead.name,
      lead.contactName,
      lead.contactRole,
      lead.email,
      lead.phone,
      lead.market,
      lead.unitCount,
      lead.notes,
      lead.fit,
      lead.sourceName
    ].join(" ").toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0));
  const openCount = prospectingLeads.filter((lead) => isInboundSalesLead(lead) && ["New", "Researching", "Ready to contact"].includes(lead.status || "New")).length;
  const contactedCount = prospectingLeads.filter((lead) => isInboundSalesLead(lead) && ["Contacted", "Replied"].includes(lead.status || "")).length;

  async function updateLead(lead, updates) {
    await fetch(`/api/site-admin/prospecting-leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
      body: JSON.stringify(await encryptContactTransitFields(updates))
    });
    await reloadState?.();
  }

  return (
    <section className="panel">
      <SectionTitle icon={<Mail />} title="Inbound leads" eyebrow="Owner and manager requests" />
      <div className="admin-overview">
        <Metric icon={<Bell />} label="Open inbound" value={openCount} />
        <Metric icon={<Check />} label="Contacted or replied" value={contactedCount} />
        <Metric icon={<Target />} label="Total inbound" value={prospectingLeads.filter(isInboundSalesLead).length} />
      </div>
      <div className="search-box">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search inbound leads by name, contact, market, page, or message" />
      </div>
      <div className="role-section-tabs prospecting-filters">
        {["Open", "All", "New", "Researching", "Ready to contact", "Contacted", "Replied", "Not a fit", "Do not contact"].map((status) => (
          <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status}</button>
        ))}
      </div>
      <div className="admin-card-list">
        {inboundLeads.length === 0 && <p className="form-note">No inbound sales leads match this view yet.</p>}
        {inboundLeads.map((lead) => (
          <article className="admin-record prospecting-record inbound-lead-record" key={lead.id}>
            <div>
              <span>{lead.createdAt ? new Date(lead.createdAt).toLocaleString() : "Unknown date"} · {lead.status || "New"} · {lead.priority || "High"} priority</span>
              <strong>{lead.name}</strong>
              <div className="prospecting-summary">
                <ProspectingDetail label="Contact" value={[lead.contactName, lead.contactRole, lead.email, lead.phone].filter(Boolean).join(" · ") || "Contact details pending"} />
                <ProspectingDetail label="Portfolio" value={[lead.market, lead.unitCount].filter(Boolean).join(" · ") || "Portfolio details pending"} />
                <ProspectingDetail label="Submitted from" value={inboundLeadSource(lead) || lead.sourceName || "Public sales form"} />
                <ProspectingDetail label="Message" value={inboundLeadMessage(lead) || lead.notes || lead.fit} />
              </div>
            </div>
            <div className="record-actions">
              <select value={lead.status || "New"} onChange={(event) => updateLead(lead, { status: event.target.value })}>
                {["New", "Researching", "Ready to contact", "Contacted", "Replied", "Not a fit", "Do not contact"].map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={lead.priority || "High"} onChange={(event) => updateLead(lead, { priority: event.target.value })}>
                {["High", "Medium", "Low"].map((priority) => <option key={priority}>{priority}</option>)}
              </select>
              {lead.email && <a className="primary link-like-button" href={`mailto:${lead.email}`}>Email</a>}
              {lead.phone && <a className="ghost link-like-button" href={`tel:${lead.phone}`}>Call</a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function isInboundSalesLead(lead = {}) {
  const source = String(lead.sourceName || lead.source || "").toLowerCase();
  const fit = String(lead.fit || "").toLowerCase();
  const notes = String(lead.notes || "").toLowerCase();
  return source.includes("sales lead form")
    || source.includes("inbound sales")
    || fit.includes("talk to someone")
    || notes.includes("submitted from");
}

function inboundLeadSource(lead = {}) {
  const match = String(lead.notes || "").match(/Submitted from\s+(.+?)(?:\.\s|$)/i);
  return match?.[1] || "";
}

function inboundLeadMessage(lead = {}) {
  return String(lead.notes || "")
    .replace(/Submitted from\s+.+?(?:\.\s|$)/i, "")
    .replace(/Contact:\s+.+?(?:\.\s|$)/i, "")
    .trim();
}

function AdminAccessRequests({ accessRequests, referrals = [], reloadState, siteAdminToken }) {
  const [query, setQuery] = useState("");
  const filteredRequests = accessRequests
    .filter((request) => [
      request.renterName,
      request.rentalAddress,
      request.unit,
      request.message,
      ...(request.recipients || []).flatMap((recipient) => [recipient.name, recipient.role, recipient.phone, recipient.email])
    ].join(" ").toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
  async function validateReferral(referral, legitimate = true) {
    await fetch(`/api/site-admin/referrals/${referral.id}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
      body: JSON.stringify({ legitimate })
    });
    await reloadState?.();
  }

  return (
    <section className="panel">
      <SectionTitle icon={<Gift />} title="Referral service" eyebrow="Invites and validation" />
      <div className="admin-card-list referral-admin-list">
        {!referrals.length && <p className="form-note">No manager or owner referral invites yet.</p>}
        {referrals.map((referral) => (
          <article className="admin-record access-request-record" key={referral.id}>
            <div>
              <span>{referral.createdAt ? new Date(referral.createdAt).toLocaleString() : "Unknown date"} · {referral.status}</span>
              <strong>{referral.referrerName || "Referrer"} invited {referral.referredName || "a contact"}</strong>
              <p>{referral.referredRole} · {referral.referredEmail} · code {referral.token}</p>
              <p>{referral.rewardSummary}</p>
              {referral.referredPropertyName && <p>Created property: {referral.referredPropertyName}</p>}
            </div>
            <div className="record-actions access-delivery-list">
              <span>{referral.validationStatus || referral.inviteDelivery?.reason || "Awaiting signup"}</span>
              {referral.status === "Property created" && (
                <>
                  <button className="primary" onClick={() => validateReferral(referral, true)}><Check size={15} /> Validate</button>
                  <button className="ghost" onClick={() => validateReferral(referral, false)}>Reject</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <SectionTitle icon={<Send />} title="Request access entries" eyebrow="Renter invites" />
      <div className="search-box">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search renter, address, owner, manager, phone, or email" />
      </div>
      <div className="admin-card-list">
        {filteredRequests.length === 0 && <p className="form-note">No request access entries yet.</p>}
        {filteredRequests.map((request) => {
          const delivery = request.deliveryResults || [];
          const sent = delivery.filter((item) => item.sent).length;
          return (
            <article className="admin-record access-request-record" key={request.id}>
              <div>
                <span>{request.createdAt ? new Date(request.createdAt).toLocaleString() : "Unknown date"} · {request.status || "Delivery pending"}</span>
                <strong>{request.renterName || "Renter"} referred {request.rentalAddress || "a rental"}</strong>
                <p>{[request.rentalAddress, request.unit].filter(Boolean).join(" · ") || "No rental address provided"}</p>
                <p>{request.message}</p>
                <div className="access-recipient-list">
                  {(request.recipients || []).map((recipient, index) => (
                    <div key={`${request.id}-${recipient.role}-${index}`}>
                      <span>{recipient.role}</span>
                      <strong>{recipient.name || "Unnamed"}</strong>
                      <p>{[recipient.phone, recipient.email].filter(Boolean).join(" · ") || "No contact detail"}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="record-actions access-delivery-list">
                <span>{sent}/{delivery.length} sent</span>
                {delivery.map((item, index) => (
                  <p key={`${request.id}-${item.channel}-${item.role}-${index}`}>
                    {item.channel} {item.role}: {item.sent ? "sent" : item.reason || "pending"}
                  </p>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AdminDiagnostics({ siteAdminToken, platformSettings }) {
  const [diagnostics, setDiagnostics] = useState(null);
  const [status, setStatus] = useState({ state: "idle", message: "" });

  useEffect(() => {
    loadDiagnostics();
  }, [siteAdminToken]);

  async function loadDiagnostics() {
    setStatus({ state: "checking", message: "Refreshing diagnostics..." });
    try {
      const response = await fetch("/api/site-admin/diagnostics", {
        headers: { Authorization: `Bearer ${siteAdminToken}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Diagnostics failed");
      setDiagnostics(data);
      setStatus({ state: "ok", message: `Updated ${new Date(data.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}` });
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  const readiness = diagnostics?.service?.readinessOk;
  const envItems = diagnostics?.vendorCalls?.env || [];
  const webhookUrls = diagnostics?.vendorCalls?.webhookUrls || {};
  const attempts = diagnostics?.vendorCalls?.attempts?.recent || [];
  return (
    <div className="diagnostics-view">
      <section className="panel">
        <div className="diagnostics-head">
          <SectionTitle icon={<Bot />} title="API diagnostics" eyebrow="Platform health" />
          <button className="secondary" onClick={loadDiagnostics}><Settings2 size={15} /> Refresh</button>
        </div>
        {status.message && <p className={`integration-status ${status.state === "error" ? "error" : status.state === "ok" ? "ok" : "idle"}`}>{status.message}</p>}
        <div className="admin-overview diagnostics-overview">
          <Metric icon={<Database />} label="Readiness" value={readiness ? "Ready" : "Needs setup"} />
          <Metric icon={<Smartphone />} label="Twilio" value={diagnostics?.twilio?.configured ? "Ready" : "Missing"} />
          <Metric icon={<CreditCard />} label="Stripe" value={diagnostics?.stripe?.configured ? "Ready" : "Missing"} />
          <Metric icon={<Bot />} label="Anthropic" value={diagnostics?.ai?.anthropicConfigured ? "Ready" : "Missing"} />
        </div>
        <div className="diagnostic-grid">
          <DiagnosticBlock title="Service">
            <DiagnosticRow label="Environment" value={diagnostics?.service?.nodeEnv || "loading"} />
            <DiagnosticRow label="Public URL" value={diagnostics?.service?.publicUrl || "loading"} />
            <DiagnosticRow label="Database" value={diagnostics?.service?.database?.ok ? "Postgres ready" : diagnostics?.service?.database?.mode || "not configured"} tone={diagnostics?.service?.database?.ok ? "ok" : "warn"} />
            <DiagnosticRow label="Missing required" value={diagnostics?.service?.missingRequired?.length ? diagnostics.service.missingRequired.join(", ") : "None"} tone={diagnostics?.service?.missingRequired?.length ? "warn" : "ok"} />
            <DiagnosticRow label="Uptime" value={diagnostics?.service?.uptimeSeconds ? `${diagnostics.service.uptimeSeconds}s` : "loading"} />
          </DiagnosticBlock>
          <DiagnosticBlock title="Vendor Calls">
            <DiagnosticRow label="Mode" value={platformSettings?.vendorCallTestMode ? "Test mode" : "Production mode"} tone={platformSettings?.vendorCallTestMode ? "warn" : "ok"} />
            <DiagnosticRow label="Provider" value={diagnostics?.vendorCalls?.provider || "loading"} />
            <DiagnosticRow label="Production enabled" value={diagnostics?.vendorCalls?.productionEnabled ? "Yes" : "No"} tone={diagnostics?.vendorCalls?.productionEnabled ? "ok" : "warn"} />
            <DiagnosticRow label="Test number" value={diagnostics?.vendorCalls?.testNumberConfigured ? "Configured" : "Missing"} tone={diagnostics?.vendorCalls?.testNumberConfigured ? "ok" : "warn"} />
            <DiagnosticRow label="Retry queued" value={diagnostics?.vendorCalls?.attempts ? diagnostics.vendorCalls.attempts.retryNeeded : "loading"} />
          </DiagnosticBlock>
          <DiagnosticBlock title="Webhooks">
            {Object.entries(webhookUrls).map(([key, value]) => <DiagnosticRow key={key} label={formatDiagnosticLabel(key)} value={value} />)}
          </DiagnosticBlock>
          <DiagnosticBlock title="Environment">
            {envItems.map((item) => (
              <DiagnosticRow key={item.key} label={item.key} value={item.configured ? item.value || "configured" : "missing"} tone={item.configured ? "ok" : "warn"} />
            ))}
          </DiagnosticBlock>
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<Phone />} title="Recent vendor call attempts" eyebrow="Call pipeline" />
        <div className="attempt-list">
          {attempts.length === 0 && <p>No vendor call attempts yet.</p>}
          {attempts.map((attempt) => (
            <article className="attempt-card" key={`${attempt.workOrderId}-${attempt.vendorName}-${attempt.startedAt}`}>
              <div className="attempt-card-head">
                <strong>{attempt.vendorName}</strong>
                <span className={`diagnostic-pill ${attempt.status === "completed" ? "ok" : attempt.status === "failed" ? "error" : "warn"}`}>{attempt.status}</span>
              </div>
              <p>{attempt.workOrderId} · {attempt.provider || "provider unknown"} · attempt {attempt.attemptNumber} · {attempt.phone || "no phone"}</p>
              <p>Transcript {attempt.hasTranscript ? "stored" : "not stored yet"} · Outcome {attempt.hasOutcome ? "captured" : "pending"} · Retry {attempt.retry?.needed ? `queued for ${new Date(attempt.retry.retryAfter).toLocaleString()}` : "not queued"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function DiagnosticBlock({ title, children }) {
  return (
    <div className="diagnostic-block">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function DiagnosticRow({ label, value, tone = "idle" }) {
  return (
    <div className="diagnostic-row">
      <span>{label}</span>
      <strong className={tone}>{String(value || "—")}</strong>
    </div>
  );
}

function formatDiagnosticLabel(value) {
  return String(value).replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function PlatformVendorCallSettings({ platformSettings, reloadState, siteAdminToken }) {
  const [form, setForm] = useState({
    vendorCallTestMode: platformSettings?.vendorCallTestMode !== false,
    productionVendorCallsEnabled: platformSettings?.productionVendorCallsEnabled !== false,
    vendorCallTestNumber: platformSettings?.vendorCallTestNumber || ""
  });

  useEffect(() => {
    setForm({
      vendorCallTestMode: platformSettings?.vendorCallTestMode !== false,
      productionVendorCallsEnabled: platformSettings?.productionVendorCallsEnabled !== false,
      vendorCallTestNumber: platformSettings?.vendorCallTestNumber || ""
    });
  }, [platformSettings?.updatedAt]);

  async function saveSettings(event) {
    event.preventDefault();
    await fetch("/api/site-admin/platform-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
      body: JSON.stringify(await encryptContactTransitFields(form))
    });
    await reloadState();
  }

  return (
    <section className="panel platform-settings-panel">
      <SectionTitle icon={<Phone />} title="Vendor call safety" eyebrow="Global override" />
      <form className="dispatch-settings-form" onSubmit={saveSettings}>
        <label className="check-row span-2">
          <input type="checkbox" checked={form.vendorCallTestMode} onChange={(event) => setForm({ ...form, vendorCallTestMode: event.target.checked })} />
          Route vendor calls to test mode
        </label>
        <label className="check-row span-2">
          <input type="checkbox" checked={form.productionVendorCallsEnabled} onChange={(event) => setForm({ ...form, productionVendorCallsEnabled: event.target.checked })} />
          Enable production vendor calls
        </label>
        <label className="span-2">Test vendor phone<input value={form.vendorCallTestNumber} onChange={(event) => setForm({ ...form, vendorCallTestNumber: event.target.value })} placeholder="+1..." /></label>
        <button className="secondary wide" type="submit"><Settings2 size={15} /> Save platform call settings</button>
      </form>
    </section>
  );
}

function SiteAccounts({ accounts, properties, people, orders, invoices, reloadState, siteAdminToken }) {
  const [form, setForm] = useState({ name: "", status: "Trial", plan: "$0/property + $25 vendor dispatch", stripeCustomerId: "", billingPayerRole: "Owner", productionVendorCallsEnabled: true });

  async function createAccount(event) {
    event.preventDefault();
    await fetch("/api/site-admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
      body: JSON.stringify(form)
    });
    setForm({ name: "", status: "Trial", plan: "$0/property + $25 vendor dispatch", stripeCustomerId: "", billingPayerRole: "Owner", productionVendorCallsEnabled: true });
    await reloadState();
  }

  async function updateAccount(account, patch) {
    await fetch(`/api/site-admin/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
      body: JSON.stringify(patch)
    });
    await reloadState();
  }

  async function deleteAccount(account) {
    const typed = window.prompt(`Delete ${account.name} and all linked properties, users, work orders, invoices, and billing events? Type the account name to confirm.`);
    if (typed !== account.name) return;
    await fetch(`/api/site-admin/accounts/${account.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${siteAdminToken}` }
    });
    await reloadState();
  }

  return (
    <div className="admin-grid">
      <section className="panel">
        <SectionTitle icon={<LayoutDashboard />} title="Customer accounts" eyebrow="Business operations" />
        <div className="admin-card-list">
          {accounts.map((account) => {
            const accountProperties = properties.filter((property) => property.accountId === account.id);
            const accountPropertyIds = accountProperties.map((property) => property.id);
            const accountPeople = people.filter((person) => person.accountIds?.includes(account.id) || person.propertyIds?.some((id) => accountPropertyIds.includes(id)));
            const accountOrders = orders.filter((order) => accountPropertyIds.includes(order.propertyId));
            const accountInvoices = invoices.filter((invoice) => accountPropertyIds.includes(invoice.propertyId));
            const invoiceTotal = accountInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
            return (
              <article className="admin-record" key={account.id}>
                <div>
                  <span>{account.status} · {account.stripeCustomerId || "No Stripe customer"}</span>
                  <strong>{account.name}</strong>
                  <p>{account.plan} · Default payer: {account.billingPayerRole || "Owner"} · {account.billingSetupStatus || (account.stripeCustomerId ? "Card on file" : "Needs card")} · Vendor calls {account.productionVendorCallsEnabled === false ? "off" : "on"}</p>
                  <p>{accountProperties.length} properties · {accountPeople.length} users · {accountOrders.length} work orders · {formatMoney(invoiceTotal)} vendor invoices</p>
                </div>
                <div className="record-actions">
                  <button className="ghost" onClick={() => updateAccount(account, { status: "Active" })}><Check size={15} /> Active</button>
                  <button className="ghost" onClick={() => updateAccount(account, { status: "Suspended" })}><AlertTriangle size={15} /> Suspend</button>
                  <button className="ghost" onClick={() => updateAccount(account, { productionVendorCallsEnabled: account.productionVendorCallsEnabled === false })}><Phone size={15} /> Calls {account.productionVendorCallsEnabled === false ? "on" : "off"}</button>
                  <button className="ghost danger" onClick={() => deleteAccount(account)}><Trash2 size={15} /> Delete</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<Plus />} title="Create customer account" eyebrow="Admin action" />
        <form className="admin-form" onSubmit={createAccount}>
          <label>Account<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Trial</option><option>Active</option><option>Past due</option><option>Suspended</option></select></label>
          <label>Default payer<select value={form.billingPayerRole} onChange={(event) => setForm({ ...form, billingPayerRole: event.target.value })}><option>Owner</option><option>Property manager</option></select></label>
          <label className="check-row span-2"><input type="checkbox" checked={form.productionVendorCallsEnabled} onChange={(event) => setForm({ ...form, productionVendorCallsEnabled: event.target.checked })} /> Enable production vendor calls</label>
          <label className="span-2">Plan<input value={form.plan} onChange={(event) => setForm({ ...form, plan: event.target.value })} /></label>
          <label className="span-2">Stripe customer ID<input value={form.stripeCustomerId} onChange={(event) => setForm({ ...form, stripeCustomerId: event.target.value })} /></label>
          <button className="primary wide" type="submit"><LayoutDashboard size={16} /> Create customer</button>
        </form>
      </section>
    </div>
  );
}

function AdminDirectory({ people, properties, accounts, reloadState }) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", role: "Manager", phone: "", pin: "", accountId: accounts[0]?.id || "", propertyId: properties[0]?.id || "", unit: "", trade: "" });
  const filteredPeople = people.filter((person) => `${person.name} ${person.role} ${person.phone}`.toLowerCase().includes(query.toLowerCase()));
  const accountProperties = properties.filter((property) => property.accountId === form.accountId);

  async function addPerson(event) {
    event.preventDefault();
    await fetch("/api/admin/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await encryptContactTransitFields(form))
    });
    setForm({ name: "", role: "Manager", phone: "", pin: "", accountId: accounts[0]?.id || "", propertyId: properties[0]?.id || "", unit: "", trade: "" });
    await reloadState();
  }

  return (
    <div className="admin-grid">
      <section className="panel">
        <SectionTitle icon={<Users />} title="Platform people" eyebrow="All customer and internal users" />
        <SearchBox value={query} setValue={setQuery} placeholder="Search users" />
        <DataTable
          columns={["Name", "Role", "Phone", "Account", "Properties", "PIN"]}
          rows={filteredPeople.map((person) => [
            person.name,
            person.role,
            person.phone,
            person.accountIds?.map((id) => accounts.find((account) => account.id === id)?.name || id).join(", ") || inferAccounts(person, properties, accounts),
            person.propertyIds?.map((id) => properties.find((property) => property.id === id)?.name || id).join(", ") || "None",
            person.pin || "Auto"
          ])}
        />
      </section>
      <section className="panel">
        <SectionTitle icon={<Plus />} title="Invite or create user" eyebrow="Admin action" />
        <form className="admin-form" onSubmit={addPerson}>
          <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Phone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Site Admin</option><option>Manager</option><option>Owner</option><option>Tenant</option><option>Vendor</option></select></label>
          <label>Account<select value={form.accountId} onChange={(event) => {
            const nextProperties = properties.filter((property) => property.accountId === event.target.value);
            setForm({ ...form, accountId: event.target.value, propertyId: nextProperties[0]?.id || "" });
          }}>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label>
          <label>Property<select value={form.propertyId} onChange={(event) => setForm({ ...form, propertyId: event.target.value })}><option value="">No property</option>{accountProperties.map((property) => <option value={property.id} key={property.id}>{property.name}</option>)}</select></label>
          <label>PIN<input value={form.pin} placeholder="Auto-generate" onChange={(event) => setForm({ ...form, pin: event.target.value })} /></label>
          {form.role === "Vendor" && <label>Trade<input value={form.trade} onChange={(event) => setForm({ ...form, trade: event.target.value })} /></label>}
          <button className="primary wide" type="submit"><Plus size={16} /> Create user</button>
        </form>
      </section>
    </div>
  );
}

function AdminProperties({ properties, people, accounts, reloadState, setActivePropertyId, setAdminSection }) {
  const [setupNotice, setSetupNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    address: "",
    accountId: accounts[0]?.id || "",
    adminId: people.find((person) => person.role === "Manager")?.id || "admin-1",
    ownerId: people.find((person) => person.role === "Owner")?.id || "owner-1",
    creatorRole: "Property manager",
    billingPayerRole: "Owner"
  });

  async function createProperty(event) {
    event.preventDefault();
    const response = await fetch("/api/admin/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json();
    setForm({ ...form, name: "", address: "" });
    await reloadState();
    if (data.property?.id) {
      setActivePropertyId(data.property.id);
      setAdminSection("billing");
      setSetupNotice(data.billingSetupRequired
        ? `${data.property.name} is created. Add a card on file now so vendor dispatch can be billed later.`
        : `${data.property.name} is created and billing already has a card on file.`);
    }
  }

  async function updateProperty(property, patch) {
    await fetch(`/api/admin/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    await reloadState();
  }

  async function deleteProperty(property) {
    const typed = window.prompt(`Delete ${property.name} and all linked work orders, invoices, and billing events? Type the property name to confirm.`);
    if (typed !== property.name) return;
    await fetch(`/api/admin/properties/${property.id}`, {
      method: "DELETE"
    });
    const nextProperty = properties.find((item) => item.id !== property.id);
    setActivePropertyId(nextProperty?.id || "");
    await reloadState();
  }

  return (
    <div className="admin-grid">
      <section className="panel">
        <SectionTitle icon={<Building2 />} title="Customer properties" eyebrow="Cross-account inventory" />
        <div className="admin-card-list">
          {properties.map((property) => (
            <article className="admin-record" key={property.id}>
              <div>
                <span>{property.subscription}</span>
                <strong>{property.name}</strong>
                <p>{accounts.find((account) => account.id === property.accountId)?.name || "Unassigned account"} · {property.address}</p>
                <p>{property.plan} · Payer: {property.billingPayerRole || "Owner"}</p>
              </div>
              <div className="record-actions">
                <button className="ghost" onClick={() => { setActivePropertyId(property.id); setAdminSection("operations"); }}><ChevronRight size={15} /> Open</button>
                <button className="ghost" onClick={() => { setActivePropertyId(property.id); setAdminSection("billing"); }}><CreditCard size={15} /> Billing</button>
                <button className="ghost danger" onClick={() => deleteProperty(property)}><Trash2 size={15} /> Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<Plus />} title="Register customer property" eyebrow="Admin action" />
        <p className="form-note">Adding tenants, owners, or managers here saves their role and phone number. LivingRelay does not text them immediately; after setup is launched, they receive a role-specific message explaining that they were added and what to do next.</p>
        {setupNotice && <p className="billing-alert">{setupNotice}</p>}
        <form className="admin-form" onSubmit={createProperty}>
          <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Account<select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label>
          <label>Address<GooglePlacesAddressInput value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} onPlaceSelect={(place, prediction) => setForm((current) => ({ ...current, address: formatPlaceAddress(place) || prediction?.description || current.address, name: current.name || formatPlaceName(place, prediction) }))} /></label>
          <label>Manager<select value={form.adminId} onChange={(event) => setForm({ ...form, adminId: event.target.value })}>{people.filter((person) => person.role === "Manager").map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
          <label>Owner<select value={form.ownerId} onChange={(event) => setForm({ ...form, ownerId: event.target.value })}>{people.filter((person) => person.role === "Owner").map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
          <label>Your role<select value={form.creatorRole} onChange={(event) => setForm({ ...form, creatorRole: event.target.value })}><option>Property manager</option><option>Owner</option><option>Owner and property manager</option></select></label>
          <label>Who pays dispatch fees?<select value={form.billingPayerRole} onChange={(event) => setForm({ ...form, billingPayerRole: event.target.value })}><option>Owner</option><option>Property manager</option></select></label>
          <button className="primary wide" type="submit"><Building2 size={16} /> Setup property</button>
        </form>
      </section>
    </div>
  );
}

function AdminWorkOrders({ orders, properties, people, vendors, accounts, reloadState, setActivePropertyId, setActiveOrderId, setAdminSection }) {
  const [form, setForm] = useState({ propertyId: properties[0]?.id || "", unit: propertyLocationLabel(properties[0]), tenantId: "", trade: "General", severity: "Normal", status: "Manager review", estimate: "", vendorId: "", issue: "", access: "" });
  async function createWorkOrder(event) {
    event.preventDefault();
    await fetch("/api/admin/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ ...form, estimate: "", issue: "", access: "" });
    await reloadState();
  }

  return (
    <div className="admin-grid">
      <section className="panel">
        <SectionTitle icon={<ClipboardList />} title="Support and dispatch load" eyebrow="All customer issues" />
        <DataTable
          columns={["ID", "Account", "Property", "Trade", "Status", "Estimate"]}
          rows={orders.map((order) => [
            <button className="link-button" onClick={() => { setActivePropertyId(order.propertyId); setActiveOrderId(order.id); setAdminSection("operations"); }}>{order.id}</button>,
            accounts.find((account) => account.id === properties.find((property) => property.id === order.propertyId)?.accountId)?.name || "Unassigned",
            properties.find((property) => property.id === order.propertyId)?.name || order.propertyId,
            order.trade,
            order.status,
            formatMoney(Number(order.estimate || 0))
          ])}
        />
      </section>
      <section className="panel">
        <SectionTitle icon={<Plus />} title="Create customer issue" eyebrow="Support action" />
        <form className="admin-form" onSubmit={createWorkOrder}>
          <label>Property<select value={form.propertyId} onChange={(event) => {
            const nextProperty = properties.find((property) => property.id === event.target.value);
            setForm({ ...form, propertyId: event.target.value, unit: propertyLocationLabel(nextProperty) });
          }}>{properties.map((property) => <option value={property.id} key={property.id}>{accounts.find((account) => account.id === property.accountId)?.name || "Account"} · {property.name}</option>)}</select></label>
          <label>Tenant<select value={form.tenantId} onChange={(event) => setForm({ ...form, tenantId: event.target.value })}><option value="">Unassigned</option>{people.filter((person) => person.role === "Tenant").map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
          <label>Vendor<select value={form.vendorId} onChange={(event) => setForm({ ...form, vendorId: event.target.value })}><option value="">Unassigned</option>{vendors.map((vendor) => <option value={vendor.id} key={vendor.id}>{vendor.name} · {vendor.trade}</option>)}</select></label>
          <label>Trade<input value={form.trade} onChange={(event) => setForm({ ...form, trade: event.target.value })} /></label>
          <label>Severity<select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}><option>Normal</option><option>Urgent</option></select></label>
          <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Manager review</option><option>Owner approval</option><option>Vendor scheduled</option><option>Closed</option></select></label>
          <label>Estimate<input type="number" min="0" value={form.estimate} onChange={(event) => setForm({ ...form, estimate: event.target.value })} /></label>
          <label className="span-2">Issue<textarea required rows="4" value={form.issue} onChange={(event) => setForm({ ...form, issue: event.target.value })} /></label>
          <label className="span-2">Access notes<textarea rows="3" value={form.access} onChange={(event) => setForm({ ...form, access: event.target.value })} /></label>
          <button className="primary wide" type="submit"><ClipboardList size={16} /> Create work order</button>
        </form>
      </section>
    </div>
  );
}

function AdminIntegrations({ accounts, properties, orders, connections, events, providers, reloadState, siteAdminToken }) {
  const firstAccountId = accounts[0]?.id || "";
  const firstProviderId = providers.find((provider) => ["doorloop", "buildium"].includes(provider.id))?.id || providers[0]?.id || "doorloop";
  const [form, setForm] = useState({ accountId: firstAccountId, provider: firstProviderId, credentialRef: "" });
  const [csvImport, setCsvImport] = useState({ connectionId: connections[0]?.id || "", csv: csvImportTemplate() });
  const [exportPreview, setExportPreview] = useState([]);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const headers = siteAdminToken ? { Authorization: `Bearer ${siteAdminToken}` } : {};

  async function createConnection(event) {
    event.preventDefault();
    setStatus({ state: "saving", message: "Creating integration connection..." });
    const response = await fetch("/api/integrations", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus({ state: "error", message: data.error || "Could not create integration connection." });
      return;
    }
    setStatus({ state: "ok", message: "Integration connection created." });
    setForm({ ...form, credentialRef: "" });
    await reloadState();
  }

  async function dryRun(connection) {
    setStatus({ state: "saving", message: `Preparing ${connection.providerName || connection.provider} dry run...` });
    const response = await fetch(`/api/integrations/${connection.id}/dry-run`, {
      method: "POST",
      headers
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus({ state: "error", message: data.error || "Dry run failed." });
      return;
    }
    setStatus({ state: "ok", message: `${data.connection.providerName || data.connection.provider} dry run updated.` });
    await reloadState();
  }

  async function importCsv(event) {
    event.preventDefault();
    const connectionId = csvImport.connectionId || connections[0]?.id || "";
    if (!connectionId) {
      setStatus({ state: "error", message: "Create a connection before importing a CSV." });
      return;
    }
    setStatus({ state: "saving", message: "Importing PMS directory CSV..." });
    const response = await fetch(`/api/integrations/${connectionId}/import-directory`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ csv: csvImport.csv })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus({ state: "error", message: data.error || "CSV import failed." });
      return;
    }
    const result = data.result || {};
    setStatus({ state: "ok", message: `Imported ${result.propertiesCreated || 0} properties, ${result.peopleCreated || 0} people, and ${result.vendorsCreated || 0} vendors.` });
    await reloadState();
  }

  async function previewExport(connection) {
    setStatus({ state: "saving", message: `Preparing ${connection.providerName || connection.provider} writeback preview...` });
    const response = await fetch(`/api/integrations/${connection.id}/work-order-export-preview`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 10 })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus({ state: "error", message: data.error || "Could not prepare writeback preview." });
      return;
    }
    setExportPreview(data.payloads || []);
    setStatus({ state: "ok", message: `Prepared ${(data.payloads || []).length} work-order writeback payloads.` });
    await reloadState();
  }

  const connectionAccount = (connection) => accounts.find((account) => account.id === connection.accountId);
  const providerFor = (connection) => providers.find((provider) => provider.id === connection.provider);

  return (
    <div className="admin-grid">
      <section className="panel">
        <SectionTitle icon={<Database />} title="PMS connections" eyebrow="Maintenance sync spine" />
        <div className="admin-card-list">
          {connections.map((connection) => {
            const counts = connection.counts || {};
            return (
              <article className="admin-record" key={connection.id}>
                <div>
                  <span>{connection.status} · {connectionAccount(connection)?.name || connection.accountId}</span>
                  <strong>{connection.providerName || connection.provider}</strong>
                  <p>{providerFor(connection)?.notes || "Provider-neutral connection ready for importer and writeback work."}</p>
                  <p>{counts.importedProperties || 0} properties · {counts.importedPeople || 0} people · {counts.importedVendors || 0} vendors · {counts.exportedWorkOrders || 0} work orders</p>
                  {connection.lastError && <p className="integration-status error">{connection.lastError}</p>}
                </div>
                <div className="record-actions">
                  <button className="ghost" onClick={() => dryRun(connection)}><Database size={15} /> Dry run</button>
                  <button className="ghost" onClick={() => previewExport(connection)}><ClipboardList size={15} /> Preview writeback</button>
                </div>
              </article>
            );
          })}
          {!connections.length && <p className="muted">No PMS connections yet. Start with DoorLoop or Buildium once a customer has credentials ready.</p>}
        </div>
      </section>

      <section className="panel">
        <SectionTitle icon={<Plus />} title="Add connector" eyebrow="No live API calls yet" />
        <form className="admin-form" onSubmit={createConnection}>
          <label>Account<select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label>
          <label>Provider<select value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })}>{providers.map((provider) => <option value={provider.id} key={provider.id}>{provider.name}</option>)}</select></label>
          <label className="span-2">Credential reference<input value={form.credentialRef} onChange={(event) => setForm({ ...form, credentialRef: event.target.value })} placeholder="Secret manager key, sandbox label, or leave blank" /></label>
          <button className="primary wide" type="submit"><Database size={16} /> Create connection</button>
        </form>
        {status.message && <p className={`integration-status ${status.state === "error" ? "error" : status.state === "ok" ? "ok" : "idle"}`}>{status.message}</p>}
      </section>

      <section className="panel span-2">
        <SectionTitle icon={<Upload />} title="CSV directory import" eyebrow="Bootstrap properties and contacts" />
        <form className="admin-form" onSubmit={importCsv}>
          <label className="span-2">Connection<select value={csvImport.connectionId || connections[0]?.id || ""} onChange={(event) => setCsvImport({ ...csvImport, connectionId: event.target.value })}>{connections.map((connection) => <option value={connection.id} key={connection.id}>{connection.providerName || connection.provider} · {connectionAccount(connection)?.name || connection.accountId}</option>)}</select></label>
          <label className="span-2">CSV<textarea rows="7" value={csvImport.csv} onChange={(event) => setCsvImport({ ...csvImport, csv: event.target.value })} /></label>
          <button className="primary wide" type="submit"><Upload size={16} /> Import directory</button>
        </form>
      </section>

      <section className="panel span-2">
        <SectionTitle icon={<ClipboardList />} title="Provider shortlist" eyebrow="Build order" />
        <DataTable
          columns={["Provider", "Readiness", "Auth", "Useful first sync"]}
          rows={providers.map((provider) => [
            provider.name,
            provider.readiness,
            provider.authMode,
            [
              provider.supported?.importDirectory ? "directory import" : "",
              provider.supported?.importMaintenanceRequests ? "request ingest" : "",
              provider.supported?.exportWorkOrders ? "work-order writeback" : ""
            ].filter(Boolean).join(", ") || "manual"
          ])}
        />
      </section>

      <section className="panel span-2">
        <SectionTitle icon={<Database />} title="Recent integration events" eyebrow={`${orders.length} current work orders can be mapped later`} />
        <DataTable
          columns={["When", "Provider", "Action", "Status", "Summary"]}
          rows={events.slice(0, 8).map((event) => [
            formatDateTime(event.createdAt),
            event.provider,
            event.action,
            event.status,
            event.summary
          ])}
        />
      </section>

      {exportPreview.length > 0 && (
        <section className="panel span-2">
          <SectionTitle icon={<ClipboardList />} title="Work-order writeback preview" eyebrow="Provider-neutral payload" />
          <DataTable
            columns={["State", "Work order", "Status", "Property", "Vendor"]}
            rows={exportPreview.map((payload) => [
              payload.exportState,
              payload.internalId,
              payload.workOrder?.status,
              [payload.workOrder?.property?.name, payload.workOrder?.property?.unit].filter(Boolean).join(" · "),
              payload.workOrder?.vendor?.name || "Unassigned"
            ])}
          />
        </section>
      )}
    </div>
  );
}

function csvImportTemplate() {
  return [
    "propertyExternalId,propertyName,address,unit,tenantName,tenantPhone,ownerName,ownerPhone,managerName,managerPhone,vendorName,vendorTrade,vendorPhone",
    "prop-101,Oak Street Duplex,\"101 Oak St, Austin, TX\",A,Sam Rivera,+15125550101,Alex Owner,+15125550102,Morgan PM,+15125550103,Clear Pipe Plumbing,Plumbing,+15125550104"
  ].join("\n");
}

function AdminBilling({ accounts, properties, invoices, billingEvents, activeProperties, pendingInvoices, reloadState }) {
  const dispatchRevenue = (billingEvents || []).filter((event) => event.status !== "Not charged").reduce((sum, event) => sum + Number(event.amount || 0), 0);
  const repairTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  async function updateProperty(property, patch) {
    await fetch(`/api/admin/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    await reloadState();
  }

  return (
    <div className="admin-grid">
      <section className="panel">
        <SectionTitle icon={<CreditCard />} title="Revenue monitor" eyebrow="Platform billing" />
        <div className="billing-kpis">
          <MiniRow icon={<Building2 />} label="Properties" value={activeProperties} />
          <MiniRow icon={<DollarSign />} label="Dispatch fees" value={formatMoney(dispatchRevenue)} />
          <MiniRow icon={<ReceiptText />} label="Unpaid vendor invoices" value={pendingInvoices} />
          <MiniRow icon={<Banknote />} label="Vendor invoice total" value={formatMoney(repairTotal)} />
        </div>
        <div className="admin-card-list">
          {accounts.map((account) => {
            const accountProperties = properties.filter((property) => property.accountId === account.id);
            return (
              <article className="admin-record" key={account.id}>
                <div>
                  <span>{account.status} · {account.stripeCustomerId || "No Stripe customer"}</span>
                  <strong>{account.name}</strong>
                  <p>{account.plan} · Default payer: {account.billingPayerRole || "Owner"} · {account.billingSetupStatus || (account.stripeCustomerId ? "Card on file" : "Needs card")}</p>
                  <p>{accountProperties.length} properties: {accountProperties.map((property) => `${property.name} (${property.subscription})`).join(", ") || "none yet"}</p>
                </div>
                <div className="record-actions">
                  {accountProperties.slice(0, 2).map((property) => (
                    <button className="ghost" key={property.id} onClick={() => updateProperty(property, { billingPayerRole: property.billingPayerRole === "Owner" ? "Property manager" : "Owner" })}><CreditCard size={15} /> Toggle payer</button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<ReceiptText />} title="Dispatch fees" eyebrow="$25 when vendor booked" />
        {(billingEvents || []).map((event) => (
          <BillingEventRow key={event.id} event={event} />
        ))}
        {!(billingEvents || []).length && <p className="empty-copy">No dispatch fees yet. Properties can be added without a monthly charge.</p>}
        <SectionTitle icon={<ReceiptText />} title="Vendor invoices" eyebrow="Direct vendor payment" />
        {invoices.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} onPaid={async () => {
            await fetch(`/api/invoices/${invoice.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "Paid", paymentStatus: "Paid", paidAt: new Date().toISOString() })
            });
            await reloadState();
          }} />
        ))}
      </section>
    </div>
  );
}

function AdminAudit({ auditLog }) {
  return (
    <section className="panel">
      <SectionTitle icon={<Database />} title="Platform audit log" eyebrow="Owner oversight" />
      <div className="audit-table">
        {auditLog.map((item) => (
          <article key={item.id}>
            <span>{new Date(item.stamp).toLocaleString()}</span>
            <strong>{item.action}</strong>
            <p>{item.actor} · {item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SearchBox({ value, setValue, placeholder }) {
  return (
    <label className="search-box">
      <Search size={16} />
      <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function DataTable({ columns, rows }) {
  const gridStyle = { gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))` };
  return (
    <div className="data-table">
      <div className="data-row head" style={gridStyle}>
        {columns.map((column) => <strong key={column}>{column}</strong>)}
      </div>
      {rows.map((row, rowIndex) => (
        <div className="data-row" key={rowIndex} style={gridStyle}>
          {row.map((cell, cellIndex) => <span key={cellIndex}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

function inferAccounts(person, properties, accounts) {
  const ids = new Set(
    (person.propertyIds || [])
      .map((propertyId) => properties.find((property) => property.id === propertyId)?.accountId)
      .filter(Boolean)
  );
  if (!ids.size) return "Platform";
  return Array.from(ids).map((id) => accounts.find((account) => account.id === id)?.name || id).join(", ");
}

const vendorOnboardingTrades = ["Plumbing", "HVAC", "Electrical", "Appliance", "Handyman", "Cleaning", "Painting", "Roofing", "Landscaping", "General"];

function VendorTeamOnboarding({ property, account, people, vendors, properties = [], reloadState }) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [sourcePropertyId, setSourcePropertyId] = useState("");
  const [backupForm, setBackupForm] = useState({ trade: "Plumbing", name: "", phone: "", notes: "" });
  const [form, setForm] = useState({
    name: "",
    trade: "Plumbing",
    phone: "",
    useFor: "First call for tenant maintenance",
    notes: ""
  });
  const manager = people.find((person) => person.id === property.managerId || person.id === property.adminId);
  const owner = people.find((person) => person.id === property.ownerId);
  const team = preferredVendorTeam(property, vendors);
  const assignedVendorCount = team.reduce((count, item) => count + item.names.length, 0);
  const reusableProperties = properties.filter((item) => item.id !== property.id && preferredVendorTeam(item, vendors).length);

  useEffect(() => {
    const preferences = property.dispatchSettings?.vendorPreferences || {};
    setForm((current) => {
      const next = { ...current };
      vendorOnboardingTrades.forEach((trade) => {
        next[trade] = (preferences[trade] || []).join(", ");
      });
      return next;
    });
  }, [property.id, property.dispatchSettings]);

  async function saveVendor(event) {
    event.preventDefault();
    setStatus({ state: "saving", message: "Adding vendor to this property's team..." });
    try {
      const response = await fetch(`/api/properties/${property.id}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await encryptContactTransitFields({ ...form, propertyId: property.id, accountId: account?.id, preferred: true, placement: "primary" }))
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add vendor.");
      setForm({ ...form, name: "", phone: "", useFor: "First call for tenant maintenance", notes: "" });
      setStatus({ state: "ok", message: `${data.vendor.name} is now part of this property's team.` });
      await reloadState?.();
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  async function saveTeamPlan(event) {
    event.preventDefault();
    setStatus({ state: "saving", message: "Saving vendor assignments..." });
    const vendorPreferences = {};
    vendorOnboardingTrades.forEach((trade) => {
      vendorPreferences[trade] = String(form[trade] || "").split(",").map((item) => item.trim()).filter(Boolean);
    });
    try {
      const response = await fetch(`/api/properties/${property.id}/vendor-team`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorPreferences })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save vendor assignments.");
      setStatus({ state: "ok", message: "Team assignments saved." });
      await reloadState?.();
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  async function addBackupVendor(event) {
    event.preventDefault();
    if (!backupForm.name.trim()) return;
    setStatus({ state: "saving", message: "Adding pre-approved backup..." });
    try {
      const response = await fetch(`/api/properties/${property.id}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await encryptContactTransitFields({ ...backupForm, preferred: true, placement: "backup", useFor: `${backupForm.trade} backup` }))
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add backup vendor.");
      setBackupForm({ trade: backupForm.trade, name: "", phone: "", notes: "" });
      setStatus({ state: "ok", message: `${data.vendor.name} is pre-approved as a ${backupForm.trade} backup.` });
      await reloadState?.();
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  async function copyTeam(event) {
    event.preventDefault();
    if (!sourcePropertyId) return;
    setStatus({ state: "saving", message: "Copying vendor team..." });
    try {
      const response = await fetch(`/api/properties/${property.id}/vendor-team/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePropertyId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not copy vendor team.");
      setStatus({ state: "ok", message: `Copied team from ${data.sourceProperty?.name || "that property"}.` });
      await reloadState?.();
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }

  return (
    <section className="panel vendor-onboarding-panel">
      <div className="vendor-onboarding-head">
        <SectionTitle icon={<Users />} title="Their team" eyebrow="Vendor onboarding" />
        <button className={wizardOpen ? "ghost" : "secondary"} type="button" onClick={() => setWizardOpen(!wizardOpen)}>
          {wizardOpen ? <><Check size={15} /> Done</> : <><Plus size={15} /> Add vendor</>}
        </button>
      </div>
      <div className="team-summary-grid">
        <MiniRow icon={<UserRound />} label="Owner" value={owner ? `${owner.name} · ${owner.phone || "no phone"}` : "No owner assigned"} />
        <MiniRow icon={<Users />} label="Manager" value={manager ? `${manager.name} · ${manager.phone || "no phone"}` : "No manager assigned"} />
        <MiniRow icon={<Wrench />} label="Preferred vendors" value={assignedVendorCount ? `${assignedVendorCount} assigned` : "Not assigned"} />
      </div>
      <form className="team-reuse-row" onSubmit={copyTeam}>
        <label>
          Reuse a team from another property
          <select value={sourcePropertyId} onChange={(event) => setSourcePropertyId(event.target.value)}>
            <option value="">Choose property</option>
            {reusableProperties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <button className="secondary" type="submit" disabled={!sourcePropertyId}><ClipboardList size={15} /> Copy team</button>
      </form>
      <div className="vendor-team-list">
        {team.length ? team.map((item) => (
          <article key={item.trade}>
            <span>{item.trade}</span>
            <strong>{item.primary || "No main vendor"}</strong>
            <p>{item.backups.length ? `Backups: ${item.backups.join(", ")}` : "No pre-approved backups yet"}</p>
          </article>
        )) : (
          <p className="empty-copy">Add preferred vendors when an owner or property manager already knows who to use. LivingRelay will prioritize these names when dispatch starts.</p>
        )}
      </div>
      {wizardOpen && (
        <div className="vendor-wizard-grid">
          <form className="vendor-wizard-card" onSubmit={saveVendor}>
            <h3>Add a vendor</h3>
            <label>Vendor<VendorAutocompleteInput required value={form.name} trade={form.trade} propertyId={property.id} onChange={(value) => setForm({ ...form, name: value })} onVendorSelect={(vendor) => setForm((current) => ({ ...current, name: vendor.name, phone: vendor.phone || current.phone, trade: vendor.trade || current.trade, notes: vendor.websiteUri ? `${current.notes ? `${current.notes}\n` : ""}${vendor.websiteUri}` : current.notes }))} placeholder="Carlos Plumbing" /></label>
            <label>Trade<select value={form.trade} onChange={(event) => setForm({ ...form, trade: event.target.value })}>{vendorOnboardingTrades.map((trade) => <option key={trade}>{trade}</option>)}</select></label>
            <label>Phone<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(310) 555-0104" /></label>
            <label>Use for<input value={form.useFor} onChange={(event) => setForm({ ...form, useFor: event.target.value })} placeholder="Water leaks under $500" /></label>
            <label className="span-2">Notes<textarea rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Licensing, after-hours rules, invoice contact, or owner preference" /></label>
            <button className="primary wide" type="submit"><Wrench size={16} /> Add to team</button>
          </form>
          <form className="vendor-wizard-card" onSubmit={saveTeamPlan}>
            <h3>Main and backup order</h3>
            {vendorOnboardingTrades.map((trade) => (
              <label key={trade}>{trade}<VendorAutocompleteInput value={form[trade] || ""} trade={trade} propertyId={property.id} onChange={(value) => setForm({ ...form, [trade]: value })} onVendorSelect={(vendor) => setForm((current) => ({ ...current, [trade]: addVendorPreference(current[trade], vendor.name) }))} placeholder={trade === "General" ? "Fallback vendor" : "Main vendor, then backups"} /></label>
            ))}
            <button className="secondary wide" type="submit"><ClipboardList size={16} /> Save assignments</button>
          </form>
          <form className="vendor-wizard-card" onSubmit={addBackupVendor}>
            <h3>Pull in a local backup</h3>
            <label>Trade<select value={backupForm.trade} onChange={(event) => setBackupForm({ ...backupForm, trade: event.target.value })}>{vendorOnboardingTrades.map((trade) => <option key={trade}>{trade}</option>)}</select></label>
            <label>Vendor<VendorAutocompleteInput required value={backupForm.name} trade={backupForm.trade} propertyId={property.id} onChange={(value) => setBackupForm({ ...backupForm, name: value })} onVendorSelect={(vendor) => setBackupForm((current) => ({ ...current, name: vendor.name, phone: vendor.phone || current.phone, trade: vendor.trade || current.trade, notes: vendor.websiteUri ? `${current.notes ? `${current.notes}\n` : ""}${vendor.websiteUri}` : current.notes }))} placeholder="Search saved and local vendors" /></label>
            <label>Phone<input value={backupForm.phone} onChange={(event) => setBackupForm({ ...backupForm, phone: event.target.value })} placeholder="Filled from Google when available" /></label>
            <label>Notes<input value={backupForm.notes} onChange={(event) => setBackupForm({ ...backupForm, notes: event.target.value })} placeholder="Why this backup is approved" /></label>
            <button className="secondary wide" type="submit"><Plus size={16} /> Add as backup</button>
          </form>
        </div>
      )}
      {status.message && <p className={`send-status ${status.state}`}>{status.message}</p>}
    </section>
  );
}

function preferredVendorTeam(property, vendors = []) {
  const preferences = property?.dispatchSettings?.vendorPreferences || {};
  return Object.entries(preferences)
    .map(([trade, names]) => {
      const directNames = Array.isArray(names) ? names : [];
      const propertyVendors = vendors
        .filter((vendor) => vendor.trade === trade && (vendor.propertyIds || []).includes(property.id))
        .map((vendor) => vendor.name);
      const merged = [...directNames, ...propertyVendors]
        .map((name) => String(name || "").trim())
        .filter(Boolean)
        .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index);
      return { trade, names: merged, primary: merged[0] || "", backups: merged.slice(1) };
    })
    .filter((item) => item.names.length);
}

function addVendorPreference(current = "", name = "") {
  const nextName = String(name || "").trim();
  if (!nextName) return current || "";
  const names = String(current || "").split(",").map((item) => item.trim()).filter(Boolean);
  return [nextName, ...names.filter((item) => item.toLowerCase() !== nextName.toLowerCase())].join(", ");
}

function AdminManagerView({ property, orders, invoices, activeOrder, setActiveOrderId, patchOrder, addInvoice, sendSms, sendStatus, people, vendors, auditLog, staleOrders, demoScenarios, demoStatus, demoExperienceAvailable, reloadState, runDemoOutreach, selectDemoQuote, runFullFlowDemo, createDemoScenario, nudgeOrder, nudgeStaleOrders, updateLiveCall, startVendorOutreach, selectVendorOutcome, recordCompletionPackage, bookVendor, setAdminSection }) {
  if (!activeOrder) {
    return (
      <section className="panel">
        <SectionTitle icon={<ClipboardList />} title="No work orders" eyebrow={property.name} />
        <p className="empty-copy">Create a work order from the manager console to start managing this property.</p>
      </section>
    );
  }
  const vendor = vendors.find((item) => item.id === activeOrder.vendorId);
  const manager = people.find((person) => person.id === property.managerId || person.id === property.adminId);
  const owner = people.find((person) => person.id === property.ownerId);
  const vendorTeam = preferredVendorTeam(property, vendors);
  const selectedOutcome = (activeOrder.vendorOutreach?.outcomes || []).find((item) => item.selected || item.id === activeOrder.vendorOutreach?.selectedOutcomeId);
  const vendorScope = vendorScopeSummary(activeOrder, property);
  const vendorNextStep = vendorActionSummary(activeOrder);
  return (
    <section className="split-view">
      <div className="panel">
        <SectionTitle icon={<Settings2 />} title="Property setup" eyebrow="Manager controls" />
        <div className="subscription-card">
          <div>
            <span className="eyebrow">Billing</span>
            <h3>{property.subscription}</h3>
            <p>{property.plan}</p>
          </div>
          <button className="secondary" onClick={() => setAdminSection("billing")}><CreditCard size={16} /> Manage billing</button>
        </div>
        <div className="people-list">
          <MiniRow icon={<Users />} label="Manager" value={`${manager?.name || "Manager"} · ${manager?.phone || ""}`} />
          <MiniRow icon={<UserRound />} label="Owner" value={`${owner?.name || "Owner"} · ${owner?.phone || ""}`} />
          <MiniRow icon={<Wrench />} label="Rules" value={property.rules} />
          <MiniRow icon={<ClipboardList />} label="Their team" value={vendorTeam.length ? vendorTeam.map((item) => `${item.trade}: ${item.names.join(", ")}`).join(" · ") : "No preferred vendors assigned yet"} />
          <MiniRow icon={<AlertTriangle />} label="Vendor records" value={vendorRecordSummary(vendors.filter((item) => item.propertyIds?.includes(property.id) || item.preferred || item.trade === activeOrder.trade))} />
        </div>
        <AdminTools property={property} people={people} vendors={vendors} auditLog={auditLog} reloadState={reloadState} />
        <StaleNudgePanel
          staleOrders={staleOrders}
          setActiveOrderId={setActiveOrderId}
          nudgeOrder={nudgeOrder}
          nudgeStaleOrders={nudgeStaleOrders}
        />
        {demoExperienceAvailable && (
          <DemoControlCenter
            people={people}
            scenarios={demoScenarios}
            demoStatus={demoStatus}
            createDemoScenario={createDemoScenario}
          />
        )}
      </div>

      <div className="panel">
        <SectionTitle icon={<MessageSquare />} title="SMS work orders" eyebrow="Manager desk" />
        <div className="order-tabs">
          {orders.map((order) => (
            <button key={order.id} className={order.id === activeOrder.id ? "active" : ""} onClick={() => setActiveOrderId(order.id)}>
              <strong>{property.name}</strong>
              <span>{order.status}</span>
            </button>
          ))}
        </div>
        <article className="work-card">
          <div className="work-head">
            <div>
              <span className="eyebrow">{activeOrder.id}</span>
              <h2>{activeOrder.trade} · {property.name}</h2>
            </div>
            <span className={`pill ${activeOrder.severity === "Urgent" ? "urgent" : ""}`}>{activeOrder.severity}</span>
          </div>
          <p>{activeOrder.issue}</p>
          <div className="decision-grid">
            <MiniRow icon={<Bot />} label="AI summary" value={`${activeOrder.trade}, ${formatMoney(activeOrder.estimate)}, suggested ${vendor?.name}`} />
            <MiniRow icon={<MapPin />} label="Scope packet" value={vendorScope} />
            <MiniRow icon={<Phone />} label="Tenant access" value={activeOrder.access} />
            <MiniRow icon={<AlertTriangle />} label="Service timing" value={`${activeOrder.tenantAvailability?.serviceWindow || activeOrder.serviceWindow || activeOrder.severity} · ${(activeOrder.tenantAvailability?.preferredWindows || []).join(", ") || "Needs tenant confirmation"}`} />
            <MiniRow icon={<Wrench />} label="Vendor outreach" value={selectedOutcome ? `${selectedOutcome.vendorName}: ${selectedOutcome.availability}; ${selectedOutcome.quote}` : `Send scope to ${vendor?.phone || "vendor"}${vendorRealityLabel(vendor) ? ` (${vendorRealityLabel(vendor)})` : ""}: ${vendorScope}`} />
            <MiniRow icon={<ClipboardList />} label="Next action" value={vendorNextStep} />
            <MiniRow icon={<ReceiptText />} label="Invoice request" value={activeOrder.vendorOutreach?.invoiceDeliveryInstructions || "Ask vendor to send invoice to the property manager, owner, and LivingRelay records unless instructed otherwise."} />
          </div>
          <div className="button-grid">
            <button className="primary" onClick={() => patchOrder({ managerApproved: true, status: "Owner approval" }, "Manager approved", "Owner approval requested by SMS.")}>
              <Check size={16} /> Approve
            </button>
            <button className="secondary" onClick={() => patchOrder({ ownerApproved: true, status: "Vendor scheduled" }, "Owner approved", "Vendor coordination can begin.")}>
              <ShieldCheck size={16} /> Owner approved
            </button>
            <button className="secondary" onClick={() => {
              bookVendor(activeOrder);
              sendSms?.(vendor?.phone, `${activeOrder.id}: ${activeOrder.trade} job at ${property.name}. Issue: ${activeOrder.issue}. Reply ACCEPT or DECLINE.`);
            }}>
              <Send size={16} /> Book vendor
            </button>
            <button className="secondary" onClick={() => startVendorOutreach(activeOrder.id)}>
              <Phone size={16} /> Start AI calls
            </button>
            <button className="secondary" onClick={() => startVendorOutreach(activeOrder.id, "test")}>
              <Smartphone size={16} /> Call me first
            </button>
            <button className="ghost" onClick={() => addInvoice(activeOrder)}>
              <ReceiptText size={16} /> Create invoice
            </button>
            {demoExperienceAvailable && (
              <>
                <button className="ghost" onClick={() => runDemoOutreach(activeOrder.id)}>
                  <Bot size={16} /> Demo outreach
                </button>
                <button className="ghost" onClick={() => startVendorOutreach(activeOrder.id, "demo")}>
                  <Radio size={16} /> Demo AI calls
                </button>
                <button className="ghost" onClick={() => runFullFlowDemo(activeOrder.id)}>
                  <SparkleIcon /> Full demo
                </button>
              </>
            )}
            <button className="ghost" onClick={() => nudgeOrder(activeOrder.id)}>
              <AlertTriangle size={16} /> Nudge
            </button>
          </div>
          {sendStatus && <p className="send-status">{sendStatus}</p>}
        </article>
        <DispatchFlowPanel order={activeOrder} bookVendor={bookVendor} selectVendorOutcome={selectVendorOutcome} recordCompletionPackage={recordCompletionPackage} />
        <VendorAttemptsPanel order={activeOrder} />
        <TroubleshootingPanel order={activeOrder} />
        <LiveCallPanel order={activeOrder} updateLiveCall={updateLiveCall} />
        {demoExperienceAvailable && <DemoOutreachPanel order={activeOrder} selectDemoQuote={selectDemoQuote} />}
        {demoExperienceAvailable && <FullFlowPanel order={activeOrder} />}
        <Timeline items={activeOrder.timeline} />
      </div>
    </section>
  );
}

function DemoModeBanner({ activeOrder, runFullFlowDemo }) {
  if (!activeOrder) return null;
  return (
    <section className="demo-banner">
      <div>
        <span className="eyebrow">Demo mode</span>
        <h2>Show the whole LivingRelay loop</h2>
        <p>Simulate tenant report, AI triage, manager review, owner approval, vendor quote, tenant update, invoice, and audit trail.</p>
      </div>
      <button className="primary" onClick={() => runFullFlowDemo(activeOrder.id)}>
        <Bot size={16} /> Run full demo
      </button>
    </section>
  );
}

function DispatchFlowPanel({ order, bookVendor, selectVendorOutcome, recordCompletionPackage }) {
  const outreach = order.vendorOutreach || {};
  const outcomes = outreach.outcomes || [];
  const selected = outcomes.find((item) => item.selected || item.id === outreach.selectedOutcomeId);
  const stage = order.dispatchStage || inferDispatchStage(order);
  return (
    <div className="dispatch-flow-panel">
      <div className="dispatch-flow-head">
        <div>
          <span className="eyebrow">Dispatch flow</span>
          <h3>{formatStage(stage)}</h3>
        </div>
        <span className="pill">{outreach.status || "Not started"}</span>
      </div>
      <div className="stage-rail">
        {["self_fix", "research", "vendor_calls", "recommendation", "approvals", "tenant_confirm", "booked", "closeout"].map((item) => (
          <span key={item} className={stageMatches(stage, item) ? "active" : ""}>{item.replace("_", " ")}</span>
        ))}
      </div>
      <div className="call-questions">
        {(outreach.questions || []).slice(0, 6).map((question) => <span key={question}>{question}</span>)}
      </div>
      {!!outcomes.length && (
        <div className="quote-grid">
          {outcomes.map((outcome) => (
            <article className={outcome.selected ? "quote-card selected" : "quote-card"} key={outcome.id}>
              <div className="quote-top">
                <strong>{outcome.vendorName}</strong>
                <span>{outcome.status}</span>
              </div>
              <p>{outcome.notes || `${outcome.availability}; ${outcome.quote}`}</p>
              <dl>
                <div><dt>Quote</dt><dd>{outcome.quote}</dd></div>
                <div><dt>Availability</dt><dd>{outcome.availability}</dd></div>
                <div><dt>Discount</dt><dd>{outcome.discount}</dd></div>
                <div><dt>Warranty</dt><dd>{outcome.warranty}</dd></div>
                {outcome.scopeSufficiency && <div><dt>Scope</dt><dd>{outcome.scopeSufficiency}</dd></div>}
                {!!outcome.missingFields?.length && <div><dt>Needs</dt><dd>{outcome.missingFields.join(", ")}</dd></div>}
                {(outcome.recommendedNextStep || outcome.managerActionRequired || outcome.nextAction) && <div><dt>Next</dt><dd>{outcome.recommendedNextStep || outcome.managerActionRequired || formatNextAction(outcome.nextAction)}</dd></div>}
                <div><dt>Invoice</dt><dd>{outcome.invoiceEmail}</dd></div>
                {!!outcome.invoiceRecipients?.length && <div><dt>Recipients</dt><dd>{formatInvoiceRecipients(outcome.invoiceRecipients)}</dd></div>}
              </dl>
              <button className="secondary wide" onClick={() => selectVendorOutcome(order.id, outcome.id)}>
                <Check size={15} /> Recommend
              </button>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <div className="selected-vendor-bar">
          <div>
            <strong>{selected.vendorName}</strong>
            <span>{selected.availability} · {selected.quote}</span>
          </div>
          <button className="primary" onClick={() => bookVendor(order)}><Send size={15} /> Final booking</button>
        </div>
      )}
      <div className="selected-vendor-bar">
        <div>
          <strong>Completion package</strong>
          <span>{order.completionPackage?.status || "Not requested"} · {order.completionPackage?.invoiceDelivery || "No invoice yet"}</span>
        </div>
        <button className="ghost" onClick={() => recordCompletionPackage(order.id)}><ReceiptText size={15} /> Log package</button>
      </div>
    </div>
  );
}

function VendorAttemptsPanel({ order }) {
  const attempts = order.vendorOutreach?.attempts || [];
  if (!attempts.length) return null;
  return (
    <div className="dispatch-flow-panel">
      <div className="dispatch-flow-head">
        <div>
          <span className="eyebrow">Vendor outreach log</span>
          <h3>{attempts.length} call attempt{attempts.length === 1 ? "" : "s"}</h3>
        </div>
      </div>
      <div className="attempt-list">
        {attempts.slice(0, 6).map((attempt) => (
          <article className="attempt-card" key={attempt.id}>
            <div className="quote-top">
              <strong>{attempt.vendorName}</strong>
              <span>{attempt.status} · try {attempt.attemptNumber}</span>
            </div>
            <p>{attempt.outcome || attempt.retry?.reason || "No outcome yet."}</p>
            {attempt.retry?.needed && <span className="monitor-url">Retry queued after {attempt.retry.retryAfter}</span>}
            {attempt.hold?.detected && <span className="monitor-url">Hold detected: {attempt.hold.phrase}</span>}
            {!!attempt.transcript?.length && (
              <div className="call-transcript">
                {attempt.transcript.slice(-4).map((line, index) => (
                  <div key={`${attempt.id}-${index}`}>
                    <strong>{line.speaker}</strong>
                    <span>{line.text}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function AdminTools({ property, people, vendors, auditLog, reloadState }) {
  const [personForm, setPersonForm] = useState({ name: "", role: "Tenant", phone: "", email: "", unit: propertyLocationLabel(property), trade: "Plumbing" });
  const [vendorForm, setVendorForm] = useState({ name: "", trade: "Plumbing", phone: "" });
  const notifyPeople = people.filter((person) =>
    ["Manager", "Owner", "Tenant", "Vendor"].includes(person.role)
      && (person.propertyIds || []).includes(property.id)
  );

  async function addPerson(event) {
    event.preventDefault();
    await fetch("/api/admin/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await encryptContactTransitFields({ ...personForm, propertyId: property.id }))
    });
    setPersonForm({ name: "", role: "Tenant", phone: "", email: "", unit: propertyLocationLabel(property), trade: "Plumbing" });
    await reloadState();
  }

  async function addVendor(event) {
    event.preventDefault();
    await fetch("/api/admin/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await encryptContactTransitFields(vendorForm))
    });
    setVendorForm({ name: "", trade: "Plumbing", phone: "" });
    await reloadState();
  }

  async function updateNotify(person, patch) {
    await fetch(`/api/people/${person.id}/notify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await encryptContactTransitFields(patch))
    });
    await reloadState();
  }

  return (
    <div className="admin-tools">
      <h3>Setup</h3>
      <p className="form-note">Added people are staged silently. When setup is launched, tenants get reporting instructions, owners get approval and billing instructions, and vendors get dispatch instructions only when a job is sent.</p>
      <form className="compact-form" onSubmit={addPerson}>
        <input placeholder="Name" value={personForm.name} onChange={(event) => setPersonForm({ ...personForm, name: event.target.value })} />
        <input placeholder="Phone" value={personForm.phone} onChange={(event) => setPersonForm({ ...personForm, phone: event.target.value })} />
        <input placeholder="Email" value={personForm.email} onChange={(event) => setPersonForm({ ...personForm, email: event.target.value })} />
        <select value={personForm.role} onChange={(event) => setPersonForm({ ...personForm, role: event.target.value })}>
          <option>Tenant</option>
          <option>Owner</option>
          <option>Vendor</option>
        </select>
        {personForm.role === "Vendor" && <input placeholder="Trade" value={personForm.trade} onChange={(event) => setPersonForm({ ...personForm, trade: event.target.value })} />}
        <button className="secondary" type="submit"><Plus size={15} /> Add person</button>
      </form>

      <form className="compact-form" onSubmit={addVendor}>
        <VendorAutocompleteInput value={vendorForm.name} trade={vendorForm.trade} propertyId={property.id} onChange={(value) => setVendorForm({ ...vendorForm, name: value })} onVendorSelect={(vendor) => setVendorForm((current) => ({ ...current, name: vendor.name, phone: vendor.phone || current.phone, trade: vendor.trade || current.trade }))} placeholder="Vendor" />
        <input placeholder="Trade" value={vendorForm.trade} onChange={(event) => setVendorForm({ ...vendorForm, trade: event.target.value })} />
        <input placeholder="Phone" value={vendorForm.phone} onChange={(event) => setVendorForm({ ...vendorForm, phone: event.target.value })} />
        <button className="secondary" type="submit"><Wrench size={15} /> Add vendor</button>
      </form>

      <DispatchSettingsEditor property={property} vendors={vendors} reloadState={reloadState} />

      <h3>Notifications</h3>
      {notifyPeople.map((person) => (
        <div className="notify-row" key={person.id}>
          <div className="notify-person-head">
            <strong>{person.name}</strong>
            <span>{person.role}</span>
          </div>
          <input
            placeholder="Email for alerts"
            defaultValue={person.email || ""}
            onBlur={(event) => updateNotify(person, { email: event.target.value })}
          />
          <div className="notify-channel-grid">
            {[
              ["sms", "Text"],
              ["email", "Email"],
              ["push", "App"]
            ].map(([key, label]) => {
              const notify = defaultNotify(person.role, person.notify);
              return (
                <label className="check-row" key={key}>
                  <input
                    type="checkbox"
                    checked={notify.channels[key] !== false}
                    onChange={(event) => updateNotify(person, { channels: { ...notify.channels, [key]: event.target.checked } })}
                  />
                  {label}
                </label>
              );
            })}
          </div>
          <div className="notify-event-grid">
            {notificationEvents
              .filter(([, , roles]) => roles.includes(person.role))
              .map(([key, label]) => {
                const notify = defaultNotify(person.role, person.notify);
                return (
                  <label className="check-row" key={key}>
                    <input
                      type="checkbox"
                      checked={notify.events[key] !== false}
                      onChange={(event) => updateNotify(person, { events: { ...notify.events, [key]: event.target.checked } })}
                    />
                    {label}
                  </label>
                );
              })}
          </div>
        </div>
      ))}

      <h3>Audit</h3>
      <div className="audit-list">
        {auditLog.slice(0, 5).map((item) => (
          <div key={item.id}>
            <strong>{item.action}</strong>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaleNudgePanel({ staleOrders, setActiveOrderId, nudgeOrder, nudgeStaleOrders }) {
  return (
    <div className="stale-panel">
      <div className="stale-head">
        <div>
          <span className="eyebrow">Closeout nudges</span>
          <h3>{staleOrders.length} stale item{staleOrders.length === 1 ? "" : "s"}</h3>
        </div>
        <button className="secondary" disabled={!staleOrders.length} onClick={() => nudgeStaleOrders(false)}>
          <Bell size={15} /> Nudge all
        </button>
      </div>
      <div className="stale-list">
        {staleOrders.length ? staleOrders.slice(0, 4).map((order) => (
          <article key={order.id} className="stale-card">
            <div>
              <span>{order.id} · {order.hoursIdle ?? "?"}h idle</span>
              <strong>{order.nextAction}</strong>
              <p>{order.status} · {order.trade}</p>
            </div>
            <div className="stale-actions">
              <button className="ghost" onClick={() => setActiveOrderId(order.id)}>
                <ChevronRight size={15} /> View
              </button>
              <button className="ghost" onClick={() => nudgeOrder(order.id)}>
                <Send size={15} /> Prep
              </button>
            </div>
          </article>
        )) : (
          <div className="stale-empty">
            <Check size={16} />
            <span>No stale open items over 12 hours.</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DispatchSettingsEditor({ property, vendors, reloadState }) {
  const settings = property.dispatchSettings || {};
  const initialPreferences = normalizeVendorPreferences(settings.vendorPreferences);
  const [form, setForm] = useState({
    vendorOutreachMode: settings.vendorOutreachMode || "manager_approval",
    emergencyOutreachMode: settings.emergencyOutreachMode || "manager_approval",
    productionVendorCallsEnabled: settings.productionVendorCallsEnabled !== false,
    maxVendorsToCall: settings.maxVendorsToCall || 5,
    inboundInvoiceEmail: settings.inboundInvoiceEmail || "invoices@livingrelay.com",
    vendorPreferences: initialPreferences
  });
  const [vendorDrafts, setVendorDrafts] = useState({ Plumbing: "", HVAC: "", Electrical: "", Painting: "", General: "" });

  useEffect(() => {
    const nextSettings = property.dispatchSettings || {};
    setForm({
      vendorOutreachMode: nextSettings.vendorOutreachMode || "manager_approval",
      emergencyOutreachMode: nextSettings.emergencyOutreachMode || "manager_approval",
      productionVendorCallsEnabled: nextSettings.productionVendorCallsEnabled !== false,
      maxVendorsToCall: nextSettings.maxVendorsToCall || 5,
      inboundInvoiceEmail: nextSettings.inboundInvoiceEmail || "invoices@livingrelay.com",
      vendorPreferences: normalizeVendorPreferences(nextSettings.vendorPreferences)
    });
    setVendorDrafts({ Plumbing: "", HVAC: "", Electrical: "", Painting: "", General: "" });
  }, [property.id, property.dispatchSettings]);

  function updatePreferences(trade, updater) {
    setForm((current) => ({
      ...current,
      vendorPreferences: {
        ...current.vendorPreferences,
        [trade]: updater(current.vendorPreferences?.[trade] || [])
      }
    }));
  }

  function addVendorPreference(trade, vendor) {
    const normalized = normalizeVendorPreference(vendor, trade);
    if (!normalized.name) return;
    updatePreferences(trade, (existing) => {
      const withoutDuplicate = existing.filter((item) => `${item.name}:${item.phone}`.toLowerCase() !== `${normalized.name}:${normalized.phone}`.toLowerCase());
      return [...withoutDuplicate, normalized];
    });
    setVendorDrafts((current) => ({ ...current, [trade]: "" }));
  }

  function moveVendorPreference(trade, index, direction) {
    updatePreferences(trade, (existing) => {
      const next = [...existing];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveSettings(event) {
    event.preventDefault();
    await fetch(`/api/admin/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dispatchSettings: {
          ...settings,
          vendorOutreachMode: form.vendorOutreachMode,
          autoOutreachAfterTenantConfirmed: form.vendorOutreachMode === "automatic_after_confirmed",
          emergencyOutreachMode: form.emergencyOutreachMode,
          productionVendorCallsEnabled: form.productionVendorCallsEnabled,
          maxVendorsToCall: Number(form.maxVendorsToCall || 5),
          inboundInvoiceEmail: form.inboundInvoiceEmail,
          vendorPreferences: normalizeVendorPreferences(form.vendorPreferences)
        }
      })
    });
    await reloadState();
  }

  return (
    <form className="dispatch-settings-form" onSubmit={saveSettings}>
      <h3>Dispatch preferences</h3>
      <label className="check-row span-2"><input type="checkbox" checked={form.productionVendorCallsEnabled} onChange={(event) => setForm({ ...form, productionVendorCallsEnabled: event.target.checked })} /> Enable production vendor calls</label>
      <label>Outreach mode<select value={form.vendorOutreachMode} onChange={(event) => setForm({ ...form, vendorOutreachMode: event.target.value })}><option value="manager_approval">Manager starts calls</option><option value="automatic_after_confirmed">Auto after tenant confirms unresolved</option></select></label>
      <label>Emergency mode<select value={form.emergencyOutreachMode} onChange={(event) => setForm({ ...form, emergencyOutreachMode: event.target.value })}><option value="manager_approval">Manager approval first</option><option value="automatic">Call immediately after approval rules clear</option></select></label>
      <label>Vendors to call<input type="number" min="1" max="5" value={form.maxVendorsToCall} onChange={(event) => setForm({ ...form, maxVendorsToCall: event.target.value })} /></label>
      <label>Inbound invoice email<input value={form.inboundInvoiceEmail} onChange={(event) => setForm({ ...form, inboundInvoiceEmail: event.target.value })} /></label>
      {["Plumbing", "HVAC", "Electrical", "Painting", "General"].map((trade) => (
        <div className="vendor-priority-editor span-2" key={trade}>
          <div className="vendor-priority-head">
            <span>{trade} priority</span>
            <small>{(form.vendorPreferences?.[trade] || []).length || 0} saved</small>
          </div>
          <VendorAutocompleteInput
            value={vendorDrafts[trade] || ""}
            onChange={(value) => setVendorDrafts((current) => ({ ...current, [trade]: value }))}
            onVendorSelect={(vendor) => addVendorPreference(trade, vendor)}
            trade={trade}
            propertyId={property.id}
            placeholder="Search saved vendors or Google business profiles"
          />
          {vendorDrafts[trade]?.trim() && (
            <button className="ghost compact" type="button" onClick={() => addVendorPreference(trade, { name: vendorDrafts[trade], trade, source: "Manual entry" })}><Plus size={14} /> Add typed vendor</button>
          )}
          <div className="vendor-priority-list">
            {(form.vendorPreferences?.[trade] || []).map((vendor, index) => (
              <div className="vendor-priority-item" key={`${vendor.name}-${vendor.phone}-${index}`}>
                <strong>{index + 1}. {vendor.name}</strong>
                <span>{vendorPreferenceSummary(vendor) || "No phone or address saved yet"}</span>
                <div className="vendor-priority-actions">
                  <button type="button" className="icon-btn" onClick={() => moveVendorPreference(trade, index, -1)} disabled={index === 0} aria-label={`Move ${vendor.name} up`}>↑</button>
                  <button type="button" className="icon-btn" onClick={() => moveVendorPreference(trade, index, 1)} disabled={index === (form.vendorPreferences?.[trade] || []).length - 1} aria-label={`Move ${vendor.name} down`}>↓</button>
                  <button type="button" className="icon-btn danger" onClick={() => updatePreferences(trade, (existing) => existing.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${vendor.name}`}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button className="secondary wide" type="submit"><Settings2 size={15} /> Save dispatch preferences</button>
    </form>
  );
}

function DemoControlCenter({ people, scenarios, demoStatus, createDemoScenario }) {
  const fallbackScenarios = [
    { id: "leak", title: "Kitchen leak", trade: "Plumbing", severity: "Urgent", estimate: 325, tenantText: "Kitchen sink leak with water under the cabinet." },
    { id: "heat", title: "No heat", trade: "HVAC", severity: "Urgent", estimate: 425, tenantText: "Heat is not turning on and the thermostat is blank." },
    { id: "spark", title: "Outlet spark", trade: "Electrical", severity: "Urgent", estimate: 185, tenantText: "Bedroom outlet sparked and lights are out." }
  ];
  const availableScenarios = scenarios.length ? scenarios : fallbackScenarios;
  const rolePeople = people.filter((person) => ["Manager", "Owner", "Tenant"].includes(person.role));

  return (
    <div className="demo-control">
      <div className="demo-control-head">
        <div>
          <span className="eyebrow">Demo console</span>
          <h3>Launch a clean scenario</h3>
        </div>
        {demoStatus && <span className="demo-status">{demoStatus}</span>}
      </div>
      <div className="scenario-grid">
        {availableScenarios.map((scenario) => (
          <article key={scenario.id} className="scenario-card">
            <span>{scenario.trade} · {scenario.severity}</span>
            <strong>{scenario.title}</strong>
            <p>{scenario.tenantText}</p>
            <button className="secondary wide" onClick={() => createDemoScenario(scenario.id)}>
              <Bot size={15} /> Run
            </button>
          </article>
        ))}
      </div>
      <div className="demo-reference">
        <div>
          <strong>Role logins</strong>
          {rolePeople.map((person) => (
            <span key={person.id}>{person.role}: {person.phone} / {person.pin}</span>
          ))}
        </div>
        <div>
          <strong>SMS commands</strong>
          <span>APPROVE WO-1234</span>
          <span>VENDOR WO-1234 1</span>
          <span>PAID WO-1234</span>
          <span>CLOSE WO-1234</span>
        </div>
      </div>
    </div>
  );
}

function DemoOutreachPanel({ order, selectDemoQuote }) {
  const outcomes = order.demoOutreach?.outcomes || [];
  if (!outcomes.length) {
    return (
      <div className="demo-outreach empty">
        <strong>Demo outreach</strong>
        <span>Run demo outreach to simulate vendor calls, quote ranges, availability, and manager selection.</span>
      </div>
    );
  }

  return (
    <div className="demo-outreach">
      <div className="demo-head">
        <div>
          <span className="eyebrow">Demo mode</span>
          <h3>Vendor outreach outcomes</h3>
        </div>
        <span className="pill">{order.demoOutreach.status}</span>
      </div>
      <div className="quote-grid">
        {outcomes.map((quote) => (
          <article className={order.selectedQuoteId === quote.id ? "quote-card selected" : "quote-card"} key={quote.id}>
            <div className="quote-top">
              <strong>{quote.vendorName}</strong>
              <span>{quote.outcome}</span>
            </div>
            <p>{quote.notes}</p>
            <dl>
              <div><dt>Quote</dt><dd>{quote.quote}</dd></div>
              <div><dt>Availability</dt><dd>{quote.availability}</dd></div>
              <div><dt>Confidence</dt><dd>{quote.confidence}</dd></div>
            </dl>
            <button className="secondary wide" onClick={() => selectDemoQuote(order.id, quote.id)}>
              <Check size={15} /> Select
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function TroubleshootingPanel({ order }) {
  const tenantMessages = (order.messages || []).filter((item) => ["tenant", "relay"].includes(item.from)).slice(-6);
  const mediaItems = order.media || [];
  const mediaReview = order.mediaReview;
  if (!order.troubleshooting && !mediaItems.length && !tenantMessages.length && !mediaReview) return null;

  return (
    <div className="troubleshooting-panel">
      <div className="troubleshooting-head">
        <div>
          <span className="eyebrow">Tenant guidance</span>
          <h3>{order.troubleshooting?.status || "Conversation"}</h3>
        </div>
        <span className="pill">{mediaItems.length} media</span>
      </div>
      <div className="guidance-thread">
        {tenantMessages.map((item, index) => (
          <div className={item.from === "tenant" ? "tenant-line" : "relay-line"} key={`${item.stamp}-${index}`}>
            <strong>{item.from === "tenant" ? "Tenant" : "LivingRelay"}</strong>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
      {mediaReview && (
        <div className="media-review-box">
          <div className="media-review-head">
            <span className="eyebrow"><Sparkles size={13} /> AI media review</span>
            <small>{mediaReview.provider || "ai"} · {mediaReview.status}</small>
          </div>
          {mediaReview.insights ? (
            <div className="media-review-grid">
              <MediaReviewItem label="Summary" value={mediaReview.insights.summary} />
              <MediaReviewItem label="Conditions" value={mediaReview.insights.observedConditions} />
              <MediaReviewItem label="Urgency" value={mediaReview.insights.urgencySignals} />
              <MediaReviewItem label="Follow-ups" value={mediaReview.insights.suggestedFollowUps} />
              <MediaReviewItem label="Safety" value={mediaReview.insights.safetyNotes} />
              <MediaReviewItem label="Vendor prep" value={mediaReview.insights.vendorPrep} />
            </div>
          ) : (
            <p>{mediaReview.rawSummary || mediaReview.reason || "Media is attached; AI review has not produced a summary yet."}</p>
          )}
        </div>
      )}
      {!!mediaItems.length && (
        <div className="media-list">
          {mediaItems.map((item, index) => (
            <a href={item.url} target="_blank" rel="noreferrer" key={`${item.url || item.name}-${index}`}>
              <FileText size={15} /> {item.name || item.contentType || "Media"} · {index + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaReviewItem({ label, value }) {
  if (!value || (Array.isArray(value) && !value.length)) return null;
  const text = Array.isArray(value) ? value.join("; ") : String(value);
  return (
    <div>
      <strong>{label}</strong>
      <span>{text}</span>
    </div>
  );
}

function LiveCallPanel({ order, updateLiveCall }) {
  const calls = order.vendorCalls || [];
  const [audioState, setAudioState] = useState({});
  const liveCount = calls.filter(isLiveVendorCall).length;
  if (!calls.length) {
    return (
      <div className="live-call-panel empty">
        <strong>Live vendor calls</strong>
        <span>Vendor calls will appear here with live controls while active and results after completion.</span>
      </div>
    );
  }

  return (
    <div className="live-call-panel">
      <div className="live-call-head">
        <div>
          <span className="eyebrow">Live vendor calls</span>
          <h3>{liveCount ? "Listen or take over" : "Vendor call results"}</h3>
        </div>
        <span className="pill">{liveCount} live</span>
      </div>
      <div className="call-grid">
        {calls.map((call) => (
          <LiveCallCard
            audioMessage={audioState[call.id]}
            call={call}
            key={call.id}
            order={order}
            setAudioState={setAudioState}
            updateLiveCall={updateLiveCall}
          />
        ))}
      </div>
    </div>
  );
}

function LiveCallCard({ audioMessage, call, order, setAudioState, updateLiveCall }) {
  const outcome = findOutcomeForCall(order, call);
  const isLive = isLiveVendorCall(call);
  const recordingUrl = call.recordingUrl || call.audioUrl || call.recording_url || outcome?.recordingUrl || outcome?.audioUrl || outcome?.recording_url;
  const transcript = call.transcript?.length ? call.transcript : outcome?.transcript || [];
  return (
    <article className="call-card" key={call.id}>
      <div className="call-card-top">
        <div>
          <span>{call.status} · {call.mode}</span>
          <strong>{call.vendorName}</strong>
        </div>
        <Radio size={18} />
      </div>
      <p>{outcome?.notes || call.summary || "Call details are being saved."}</p>
      {isLive ? (
        <div className="call-actions">
          <button className="secondary" onClick={() => updateLiveCall(order.id, call.id, "listen")}>
            <Phone size={15} /> Listen
          </button>
          <button className="secondary" onClick={() => startBrowserListen(call, setAudioState)}>
            <Radio size={15} /> Audio
          </button>
          <button className="secondary" onClick={() => updateLiveCall(order.id, call.id, "join")}>
            <Smartphone size={15} /> Join
          </button>
          <button className="ghost" onClick={() => updateLiveCall(order.id, call.id, "takeover")}>
            <UserRound size={15} /> Take over
          </button>
        </div>
      ) : (
        <CompletedCallResult outcome={outcome} recordingUrl={recordingUrl} />
      )}
      {isLive && call.monitorUrl && <span className="monitor-url">Call monitor ready</span>}
      {isLive && call.listenInAvailable && <span className="monitor-url">Listen-in ready</span>}
      {isLive && audioMessage && <span className="monitor-url">{audioMessage}</span>}
      {isLive && call.listener && <span className="monitor-url">{call.listener.name} listening</span>}
      {isLive && call.takeover && <span className="monitor-url">Takeover: {call.takeover.name}</span>}
      {!!transcript.length && (
        <div className="call-transcript">
          {transcript.slice(-6).map((line, index) => (
            <div key={`${call.id}-line-${index}`}>
              <strong>{line.speaker}</strong>
              <span>{line.text}</span>
            </div>
          ))}
        </div>
      )}
      {!isLive && !transcript.length && <span className="monitor-url">Transcript will appear after the provider sends post-call analysis.</span>}
    </article>
  );
}

function CompletedCallResult({ outcome, recordingUrl }) {
  const status = outcome?.status || "Completed";
  return (
    <div className="completed-call-result">
      <dl>
        <div><dt>Outcome</dt><dd>{status}</dd></div>
        {outcome?.availability && <div><dt>Availability</dt><dd>{outcome.availability}</dd></div>}
        {outcome?.quote && <div><dt>Quote</dt><dd>{outcome.quote}</dd></div>}
        {(outcome?.recommendedNextStep || outcome?.managerActionRequired || outcome?.nextAction) && (
          <div><dt>Next</dt><dd>{outcome.recommendedNextStep || outcome.managerActionRequired || formatNextAction(outcome.nextAction)}</dd></div>
        )}
      </dl>
      {recordingUrl ? (
        <div className="call-recording">
          <audio controls src={recordingUrl} />
          <a href={recordingUrl} target="_blank" rel="noreferrer">Open recording</a>
        </div>
      ) : (
        <span className="monitor-url">Recording will appear after Twilio or ElevenLabs sends it.</span>
      )}
    </div>
  );
}

function isLiveVendorCall(call = {}) {
  return String(call.status || "").toLowerCase() === "live";
}

function findOutcomeForCall(order, call = {}) {
  return (order.vendorOutreach?.outcomes || []).find((outcome) =>
    (call.conversationId && outcome.conversationId === call.conversationId) ||
    (call.callSid && outcome.callSid === call.callSid) ||
    (call.phone && outcome.phone === call.phone) ||
    (call.vendorName && namesMatch(outcome.vendorName, call.vendorName))
  );
}

function FullFlowPanel({ order }) {
  const steps = order.demoFlow || [];
  if (!steps.length) return null;
  return (
    <div className="full-flow">
      <div>
        <span className="eyebrow">All personas</span>
        <h3>Full flow demo</h3>
      </div>
      <div className="flow-steps">
        {steps.map((step, index) => (
          <article key={`${step.persona}-${index}`}>
            <span>{step.persona}</span>
            <strong>{step.action}</strong>
            <p>{step.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function SparkleIcon() {
  return <Bot size={16} />;
}

function BillingTab({ property, account, people, invoices, orders, billingEvents, stripe, reloadState }) {
  const [status, setStatus] = useState("");
  const owner = people.find((person) => person.id === property.ownerId);
  const manager = people.find((person) => person.id === property.managerId || person.id === property.adminId);
  const payerRole = property.billingPayerRole || account?.billingPayerRole || "Owner";
  const payer = payerRole === "Property manager" ? manager : owner;
  const billingSetupStatus = property.billingSetupStatus || account?.billingSetupStatus || (account?.stripeCustomerId ? "Card on file" : "Needs card");
  const billingReady = billingSetupStatus === "Card on file";
  const paymentSetupAvailable = stripe.configured;
  const dispatchTotal = billingEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
  const vendorBookedCount = orders.filter((order) => order.status === "Vendor scheduled" || order.dispatchFee?.status === "Submitted to Stripe").length;

  async function updatePayer(nextRole) {
    const payerPerson = nextRole === "Property manager" ? manager : owner;
    await fetch(`/api/admin/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billingPayerRole: nextRole, billingPayerPersonId: payerPerson?.id })
    });
    await reloadState();
  }

  async function startBillingSession(kind) {
    if (!paymentSetupAvailable) {
      setStatus("Payment setup is temporarily unavailable. LivingRelay support has been notified.");
      return;
    }
    setStatus(kind === "portal" ? "Opening card management..." : "Preparing secure payment setup...");
    const response = await fetch(`/api/billing/${kind === "portal" ? "portal" : "setup"}-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: account?.id,
        propertyId: property.id,
        payerRole,
        payerPersonId: payer?.id,
        successUrl: window.location.href,
        cancelUrl: window.location.href,
        returnUrl: window.location.href
      })
    });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setStatus(data.url ? "" : "Payment setup is temporarily unavailable. Please try again shortly or contact LivingRelay support.");
  }

  return (
    <section className="split-view">
      <div className="panel">
        <SectionTitle icon={<CreditCard />} title="Billing" eyebrow={property.name} />
        {!billingReady && (
          <div className="billing-required">
            <span className="eyebrow">Payment method needed</span>
            <h3>Add a card before resident SMS goes live</h3>
            <p>Properties are free to add. A card is only charged if LivingRelay books a vendor dispatch for this property.</p>
            <div className="button-grid">
              <button className="primary" onClick={() => startBillingSession("setup")}><CreditCard size={16} /> Add card</button>
              <button className="ghost" onClick={() => setStatus("Skipped for now. If a resident reports an issue before billing is complete, we will ask the property manager to finish setup before vendor dispatch.")}>Skip for now</button>
            </div>
          </div>
        )}
        <div className="billing-summary">
          <MiniRow icon={<Building2 />} label="Properties" value="No monthly charge" />
          <MiniRow icon={<Wrench />} label="Vendor booked" value={`${vendorBookedCount} dispatch${vendorBookedCount === 1 ? "" : "es"}`} />
          <MiniRow icon={<DollarSign />} label="Dispatch fee" value={`$${(stripe.dispatchFeeCents || 2500) / 100} when booked`} />
          <MiniRow icon={<ReceiptText />} label="Fees recorded" value={formatMoney(dispatchTotal)} />
        </div>
        <div className="payer-card">
          <span className="eyebrow">Who pays LivingRelay fees</span>
          <h3>{payerRole}</h3>
          <p>{payer?.name || "No payer selected"} pays only the LivingRelay coordination fee. Vendor repair invoices stay separate and are paid directly to the vendor.</p>
          <div className="button-grid">
            <button className={payerRole === "Owner" ? "primary" : "ghost"} onClick={() => updatePayer("Owner")}><UserRound size={16} /> Owner pays</button>
            <button className={payerRole === "Property manager" ? "primary" : "ghost"} onClick={() => updatePayer("Property manager")}><Users size={16} /> Manager pays</button>
          </div>
        </div>
        <div className="payer-card">
          <span className="eyebrow">Payment method</span>
          <h3>{billingReady ? "Card on file" : "No card on file"}</h3>
          <p>{billingReady ? "LivingRelay will use this card only when a vendor dispatch is booked." : "Add a card when you are ready to activate vendor dispatch for this property."}</p>
          <div className="button-grid">
            <button className="secondary" onClick={() => startBillingSession("setup")}><CreditCard size={16} /> Save payment method</button>
            {billingReady && <button className="ghost" onClick={() => startBillingSession("portal")}><ArrowRight size={16} /> Manage card</button>}
          </div>
          {status && <p className="send-status">{status}</p>}
        </div>
      </div>
      <div className="panel">
        <SectionTitle icon={<ReceiptText />} title="Dispatch ledger" eyebrow="$25 coordination fee" />
        {billingEvents.map((event) => <BillingEventRow key={event.id} event={event} />)}
        {!billingEvents.length && <p className="empty-copy">No dispatch fees yet. Resident intake, troubleshooting, and property setup do not create a charge.</p>}
        <SectionTitle icon={<Banknote />} title="Vendor invoices" eyebrow="Direct vendor payment" />
        {invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} onPaid={() => {}} />)}
      </div>
    </section>
  );
}

function ReferralServicePanel({ user, property, account, referrals, reloadState }) {
  const [form, setForm] = useState({ referredName: "", referredEmail: "", referredRole: "Property manager" });
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const accountReferrals = referrals.filter((referral) =>
    referral.referrerAccountId === account?.id
    || referral.referredAccountId === account?.id
    || referral.referrerPersonId === user.id
  );
  const rewards = account?.referralRewards || {};
  async function submitReferral(event) {
    event.preventDefault();
    setStatus({ state: "saving", message: "Sending referral invite..." });
    try {
      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(await encryptContactTransitFields({ ...form, propertyId: property.id, accountId: account?.id }))
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send referral invite.");
      setForm({ referredName: "", referredEmail: "", referredRole: "Property manager" });
      setStatus({ state: "ok", message: data.referral?.inviteDelivery?.sent ? "Referral invite sent." : "Referral saved. Email delivery needs RESEND_API_KEY." });
      await reloadState?.();
    } catch (error) {
      setStatus({ state: "error", message: error.message });
    }
  }
  return (
    <section className="split-view referral-service">
      <div className="panel">
        <SectionTitle icon={<Gift />} title="Referral rewards" eyebrow={property.name} />
        <div className="billing-summary">
          <MiniRow icon={<Wrench />} label="Free dispatch credits" value={rewards.dispatchCredits || 0} />
          <MiniRow icon={<CreditCard />} label="Second-year pending" value={rewards.ownerSecondYearPending || 0} />
          <MiniRow icon={<ShieldCheck />} label="Second-year banked" value={rewards.ownerSecondYearCredits || 0} />
        </div>
        <form className="tax-panel stack" onSubmit={submitReferral}>
          <div className="form-grid">
            <label>Name<input required value={form.referredName} onChange={(event) => setForm({ ...form, referredName: event.target.value })} placeholder="Sam Rivera" /></label>
            <label>Email<input required type="email" value={form.referredEmail} onChange={(event) => setForm({ ...form, referredEmail: event.target.value })} placeholder="sam@example.com" /></label>
            <label className="span-2">They are a<select value={form.referredRole} onChange={(event) => setForm({ ...form, referredRole: event.target.value })}><option>Property manager</option><option>Owner</option></select></label>
          </div>
          <button className="primary" type="submit"><Send size={16} /> Send referral invite</button>
          {status.message && <p className={`send-status ${status.state}`}>{status.message}</p>}
        </form>
      </div>
      <div className="panel">
        <SectionTitle icon={<ClipboardList />} title="Referral tracker" eyebrow="Validation and rewards" />
        <div className="admin-card-list">
          {!accountReferrals.length && <p className="empty-copy">No referrals yet. Invite another owner or property manager to start earning credits.</p>}
          {accountReferrals.map((referral) => (
            <article className="invoice-row referral-row" key={referral.id}>
              <div>
                <span className="eyebrow">{referral.status} · {referral.referredRole}</span>
                <h3>{referral.referredName}</h3>
                <p>{referral.rewardSummary}</p>
                {referral.referredPropertyName && <p>Property: {referral.referredPropertyName}</p>}
              </div>
              <div className="invoice-side">
                <strong>{referral.token}</strong>
                <span>{referral.validationStatus || "Invite outstanding"}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function OwnerView({ property, account, orders, invoices, patchInvoice, reloadState }) {
  const [taxSummary, setTaxSummary] = useState(null);
  const [taxYear, setTaxYear] = useState("2026");
  const [expenseForm, setExpenseForm] = useState({
    vendor: "",
    amount: "",
    taxYear: "2026",
    taxCategory: "repairs",
    documentName: "",
    capitalImprovementCandidate: false,
    note: ""
  });
  const [operatingForm, setOperatingForm] = useState({
    text: "",
    taxYear: "2026"
  });
  const [operatingStatus, setOperatingStatus] = useState({ state: "idle", message: "", result: null });

  useEffect(() => {
    loadTaxSummary();
  }, [property.id, taxYear]);

  async function loadTaxSummary() {
    const response = await fetch(`/api/properties/${property.id}/tax-summary?year=${taxYear}`);
    const data = await response.json();
    setTaxSummary(data);
  }

  async function emailBundle() {
    const response = await fetch(`/api/properties/${property.id}/tax-bundle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: taxYear })
    });
    const data = await response.json();
    setTaxSummary(data);
  }

  async function uploadOwnerExpense(event) {
    event.preventDefault();
    const response = await fetch(`/api/properties/${property.id}/owner-expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expenseForm)
    });
    const data = await response.json();
    if (data.summary) setTaxSummary(data.summary);
    setExpenseForm({ vendor: "", amount: "", taxYear, taxCategory: "repairs", documentName: "", capitalImprovementCandidate: false, note: "" });
    await reloadState?.();
  }

  async function buildOperatingSystem(event) {
    event.preventDefault();
    setOperatingStatus({ state: "saving", message: "Reading invoices and building your vendor map...", result: null });
    const response = await fetch(`/api/properties/${property.id}/owner-operating-system`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(operatingForm)
    });
    const data = await response.json();
    if (!response.ok) {
      setOperatingStatus({ state: "error", message: data.error || "Could not build operating system.", result: null });
      return;
    }
    if (data.summary) setTaxSummary(data.summary);
    setOperatingForm({ text: "", taxYear });
    setOperatingStatus({
      state: "ok",
      message: `${data.vendors.length} vendor${data.vendors.length === 1 ? "" : "s"} mapped and ${data.invoices.length} past record${data.invoices.length === 1 ? "" : "s"} added.`,
      result: data
    });
    await reloadState?.();
  }

  async function startOwnerSubscription() {
    const response = await fetch("/api/billing/owner-subscription-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: account?.id,
        propertyId: property.id,
        successUrl: window.location.href,
        cancelUrl: window.location.href
      })
    });
    const data = await response.json();
    if (data.url) window.location.href = data.url;
  }

  return (
    <section className="split-view">
      <div className="panel">
        <SectionTitle icon={<ShieldCheck />} title="Owner approvals" eyebrow={property.name} />
        {orders.filter((order) => order.status === "Owner approval").map((order) => (
          <article className="approval-card" key={order.id}>
            <span className="eyebrow">{order.id}</span>
            <h2>{formatMoney(order.estimate)} {order.trade} repair</h2>
            <p>{order.issue}</p>
            <div className="button-grid">
              <button className="primary"><Check size={16} /> Approve by SMS</button>
              <button className="ghost">Ask manager</button>
            </div>
          </article>
        ))}
        <OwnerVendorCallTranscriptPanel orders={orders} />
        <OwnerOperatingSystemBuilder
          form={operatingForm}
          setForm={setOperatingForm}
          status={operatingStatus}
          onSubmit={buildOperatingSystem}
        />
      </div>
      <div className="panel">
        <SectionTitle icon={<ReceiptText />} title="Vendor invoices and tax bundle" eyebrow="Direct vendor payment" />
        <TaxPacketPanel
          property={property}
          account={account}
          year={taxYear}
          setYear={setTaxYear}
          summary={taxSummary}
          emailBundle={emailBundle}
          startOwnerSubscription={startOwnerSubscription}
        />
        <OwnerExpenseUpload form={expenseForm} setForm={setExpenseForm} onSubmit={uploadOwnerExpense} property={property} />
        {invoices.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} onPaid={() => patchInvoice(invoice.id, "Paid")} />
        ))}
      </div>
    </section>
  );
}

function OwnerVendorCallTranscriptPanel({ orders }) {
  const callRecords = orders
    .flatMap((order) => [
      ...(order.vendorCalls || []).map((call) => ({ order, call, transcript: call.transcript || [], summary: call.summary || "" })),
      ...(order.vendorOutreach?.attempts || []).map((attempt) => ({ order, call: attempt, transcript: attempt.transcript || [], summary: attempt.outcome || "" }))
    ])
    .filter((item) => item.transcript.length || item.summary)
    .slice(0, 6);
  if (!callRecords.length) return null;
  return (
    <div className="tax-panel owner-call-transcripts">
      <SectionTitle icon={<Phone size={18} />} title="Vendor call transcripts" eyebrow="Repair coordination" />
      {callRecords.map(({ order, call, transcript, summary }, index) => (
        <article className="owner-call-transcript" key={`${order.id}-${call.id || call.callSid || call.callKey || index}`}>
          <div className="quote-top">
            <strong>{call.vendorName || "Vendor"} · {order.id}</strong>
            <span>{call.status || "Recorded"}</span>
          </div>
          {summary && <p>{summary}</p>}
          {!!transcript.length && (
            <div className="call-transcript">
              {transcript.slice(-6).map((line, lineIndex) => (
                <div key={`${order.id}-${index}-${lineIndex}`}>
                  <strong>{line.speaker}</strong>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function OwnerOperatingSystemBuilder({ form, setForm, status, onSubmit }) {
  const mappedVendors = status.result?.vendors || [];
  return (
    <form className="tax-panel owner-operating-builder" onSubmit={onSubmit}>
      <SectionTitle icon={<Database size={18} />} title="Build operating system" eyebrow="Past invoices and notes" />
      <label>
        Paste invoices, receipts, or vendor notes
        <textarea
          rows="7"
          value={form.text}
          onChange={(event) => setForm({ ...form, text: event.target.value })}
          placeholder={"Carlos Plumbing - sink leak paid $325 Apr 2026\nNova HVAC spring service $210\nUse Spark Right Electric for outlets and panels"}
          required
        />
      </label>
      <div className="form-grid">
        <label>Default tax year<select value={form.taxYear} onChange={(event) => setForm({ ...form, taxYear: event.target.value })}><option>2026</option><option>2025</option><option>2024</option></select></label>
        <button className="primary" type="submit"><Sparkles size={16} /> Build team map</button>
      </div>
      {status.message && <p className={`send-status ${status.state}`}>{status.message}</p>}
      {!!mappedVendors.length && (
        <div className="operating-result-grid">
          {mappedVendors.map((vendor) => (
            <article key={`${vendor.trade}-${vendor.name}`}>
              <span>{vendor.trade}</span>
              <strong>{vendor.name}</strong>
              <p>{vendor.useFor}{vendor.phone ? ` · ${vendor.phone}` : ""}</p>
            </article>
          ))}
        </div>
      )}
    </form>
  );
}

function TaxPacketPanel({ property, account, year, setYear, summary, emailBundle, startOwnerSubscription }) {
  const spreadsheetUrl = `/api/properties/${property.id}/tax-spreadsheet.csv?year=${year}`;
  const ownerSubscription = summary?.ownerSubscription || { status: account?.ownerSubscriptionStatus || "Free", active: account?.ownerSubscriptionStatus === "Active" };
  return (
    <div className="tax-panel">
      <div className="tax-head">
        <div>
          <span className="eyebrow">Owner expense intelligence</span>
          <h3>{formatMoney(summary?.totalExpenses || 0)} deductible expenses</h3>
        </div>
        <select value={year} onChange={(event) => setYear(event.target.value)}>
          <option>2026</option>
          <option>2025</option>
          <option>2024</option>
        </select>
      </div>
      <div className="owner-ai-summary">
        <p>{summary?.aiSummary?.headline || "Upload maintenance bills to see annual totals and AI-assisted categories."}</p>
        <p>{summary?.aiSummary?.capitalImprovementInsight || "Potential home-improvement records will be tallied for future sale-basis review."}</p>
      </div>
      <div className="tax-grid">
        {(summary?.categories || []).map((category) => (
          <article key={category.key}>
            <span>Schedule E line {category.scheduleELine}</span>
            <strong>{category.label}</strong>
            <p>{formatMoney(category.amount)} · {category.count} item{category.count === 1 ? "" : "s"}</p>
          </article>
        ))}
        {!summary?.categories?.length && (
          <article>
            <span>Schedule E</span>
            <strong>No expenses yet</strong>
            <p>Invoices for this tax year will appear here.</p>
          </article>
        )}
      </div>
      <div className="schedule-preview">
        <strong>Possible sale-basis improvements</strong>
        <span>{formatMoney(summary?.capitalImprovementTotal || 0)} flagged for owner/tax-preparer review</span>
        {(summary?.capitalImprovementCandidates || []).slice(0, 4).map((invoice) => (
          <div key={invoice.id}>
            <span>{invoice.vendor}</span>
            <strong>{formatMoney(invoice.amount)}</strong>
          </div>
        ))}
      </div>
      <div className="schedule-preview">
        <strong>Schedule E worksheet</strong>
        <span>{summary?.scheduleE?.propertyAddress || property.address}</span>
        {(summary?.scheduleE?.lines || []).map((line) => (
          <div key={`${line.line}-${line.label}`}>
            <span>Line {line.line}: {line.label}</span>
            <strong>{formatMoney(line.amount)}</strong>
          </div>
        ))}
        <div>
          <span>Total expenses</span>
          <strong>{formatMoney(summary?.scheduleE?.totalExpensesLine20 || 0)}</strong>
        </div>
      </div>
      <p className="tax-disclaimer">{summary?.scheduleE?.disclaimer || "Draft worksheet only. Verify with a tax professional before filing."}</p>
      <div className="payer-card">
        <span className="eyebrow">Owner Subscription</span>
        <h3>{ownerSubscription.active ? "Exports unlocked" : "$99/year for tax files"}</h3>
        <p>Free owners can upload bills and see summaries. Owner Subscription unlocks updated spreadsheet files and prefilled tax packet exports for rental property expenses.</p>
        {!ownerSubscription.active && <button className="primary" onClick={startOwnerSubscription}><CreditCard size={16} /> Subscribe yearly</button>}
      </div>
      <div className="button-grid">
        <a className={ownerSubscription.active ? "secondary" : "ghost disabled-link"} href={ownerSubscription.active ? spreadsheetUrl : undefined} onClick={(event) => { if (!ownerSubscription.active) event.preventDefault(); }}>
          <Download size={16} /> Spreadsheet
        </a>
        <button className="ghost" onClick={emailBundle} disabled={!ownerSubscription.active}>
          <FileText size={16} /> Build packet
        </button>
      </div>
    </div>
  );
}

function OwnerExpenseUpload({ form, setForm, onSubmit, property }) {
  return (
    <form className="tax-panel stack" onSubmit={onSubmit}>
      <SectionTitle icon={<Upload size={18} />} title="Upload bill" eyebrow="Free owner records" />
      <div className="form-grid">
        <label>Vendor or biller<VendorAutocompleteInput value={form.vendor} propertyId={property?.id || ""} onChange={(value) => setForm({ ...form, vendor: value })} onVendorSelect={(vendor) => setForm((current) => ({ ...current, vendor: vendor.name, taxCategory: ["Cleaning", "Landscaping"].includes(vendor.trade) ? "cleaningMaintenance" : current.taxCategory }))} placeholder="Example: Carlos Plumbing" required /></label>
        <label>Amount<input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></label>
        <label>Tax year<select value={form.taxYear} onChange={(event) => setForm({ ...form, taxYear: event.target.value })}><option>2026</option><option>2025</option><option>2024</option></select></label>
        <label>Category<select value={form.taxCategory} onChange={(event) => setForm({ ...form, taxCategory: event.target.value })}><option value="repairs">Repairs</option><option value="cleaningMaintenance">Cleaning and maintenance</option><option value="supplies">Supplies</option><option value="utilities">Utilities</option><option value="insurance">Insurance</option><option value="taxes">Taxes</option><option value="managementFees">Management fees</option><option value="legalProfessional">Professional fees</option><option value="depreciation">Depreciation / capital item</option><option value="other">Other</option></select></label>
        <label className="span-2">File name or receipt reference<input value={form.documentName} onChange={(event) => setForm({ ...form, documentName: event.target.value })} placeholder="receipt-roof-repair.pdf" /></label>
        <label className="span-2">Notes<textarea rows="3" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="What was repaired or improved?" /></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={form.capitalImprovementCandidate} onChange={(event) => setForm({ ...form, capitalImprovementCandidate: event.target.checked })} /> Track as possible home improvement for sale-basis review</label>
      <button className="primary" type="submit"><Upload size={16} /> Add bill</button>
    </form>
  );
}

function IssueMediaPicker({ request, setRequest, compact = false }) {
  const files = Array.from(request.mediaFiles || []);
  const onFilesSelected = (event) => {
    const selected = Array.from(event.target.files || []);
    const next = selected.slice(0, 10);
    setRequest({
      ...request,
      mediaFiles: next,
      mediaError: selected.length > 10 ? "Only the first 10 files will be attached." : ""
    });
  };

  return (
    <div className={compact ? "issue-media-picker compact" : "issue-media-picker"}>
      <label>
        Photos/videos
        <input type="file" accept="image/*,video/*" multiple onChange={onFilesSelected} />
      </label>
      <div className="issue-media-meta">
        <span><Upload size={14} /> {files.length ? `${files.length}/10 selected` : "Up to 10 files"}</span>
        <small>Images and video preview frames are reviewed by AI for added triage perspective.</small>
      </div>
      {!!files.length && (
        <div className="issue-media-chips">
          {files.map((file, index) => (
            <span key={`${file.name}-${file.size}-${index}`}>
              <FileText size={13} /> {file.name}
            </span>
          ))}
        </div>
      )}
      {request.mediaError && <p className="form-error">{request.mediaError}</p>}
    </div>
  );
}

function IssueCreatePanel({ request, setRequest, createOrder, property, user, handoff, activeOrder, onReviewWorkOrder, onCallMeFirst }) {
  const createdOrderId = handoff?.orderId || "";
  const createdOrderIsActive = createdOrderId && activeOrder?.id === createdOrderId;
  const canReviewWorkOrder = user?.role === "Manager" && createdOrderId;
  const canCallMeFirst = user?.role === "Manager" && createdOrderId;
  return (
    <section className="panel issue-create-panel">
      <SectionTitle icon={<Plus />} title="Create issue" eyebrow={`${user.role} dashboard`} />
      <form className="issue-create-form" onSubmit={createOrder}>
        <label className="span-2">
          What needs attention?
          <textarea rows="3" value={request.issue} onChange={(event) => setRequest({ ...request, issue: event.target.value })} placeholder="Example: water is leaking under the kitchen sink" required />
        </label>
        <label>
          Access notes
          <input value={request.access} onChange={(event) => setRequest({ ...request, access: event.target.value })} placeholder="Best entry window or contact note" />
        </label>
        <IssueMediaPicker request={request} setRequest={setRequest} compact />
        <button className="primary" type="submit" disabled={handoff?.state === "saving"}><Send size={16} /> {handoff?.state === "saving" ? "Creating" : "Create issue"}</button>
      </form>
      {handoff?.message && (
        <div className={`issue-handoff ${handoff.state}`}>
          <div>
            <strong>{handoff.state === "created" ? "Issue created" : handoff.state === "saving" ? "Creating issue" : "Could not create issue"}</strong>
            <span>{handoff.message}{createdOrderIsActive ? " It is selected below." : ""}</span>
          </div>
          {handoff.state === "created" && (
            <div className="issue-handoff-actions">
              {canReviewWorkOrder && <button className="secondary" type="button" onClick={onReviewWorkOrder}><ClipboardList size={16} /> Review work order</button>}
              {canCallMeFirst && <button className="secondary" type="button" onClick={() => onCallMeFirst?.(createdOrderId)}><Smartphone size={16} /> Call me first</button>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TenantView({ request, setRequest, createOrder, orders, property, user }) {
  const hasOrders = orders.length > 0;
  const hasOpenIssues = orders.some(isActiveWorkOrder);
  const maintenanceNotes = maintenanceNotesForProperty(property);
  const sortedOrders = [...orders].sort((a, b) => (a.status === "Closed") - (b.status === "Closed"));
  const defaultAvailability = request.defaultAvailability || user?.defaultAvailability || "";
  const selectedAccess = request.useDefaultAvailability && defaultAvailability ? defaultAvailability : request.access;
  const tenantGuidance = tenantSelfSolveGuidance(request.issue, property);
  const requestTrade = request.issue ? classifyIssue(request.issue).trade : "";
  const tenantPresenceRelevant = tenantPresenceLikelyRelevant(request.issue, requestTrade);
  const askingForVendor = request.escalationChoice === "vendor_outreach";
  const availabilityRequired = request.escalationChoice !== "self_solve" && (tenantPresenceRelevant || askingForVendor);

  return (
    <section className="tenant-dashboard">
      <div className={hasOpenIssues ? "tenant-welcome" : "tenant-welcome happy"}>
        <div>
          <span className="eyebrow">{hasOpenIssues ? "Resident home base" : "All quiet today"}</span>
          <h2>{hasOpenIssues ? "We will keep the repair thread tidy from here." : `Nice, ${user?.name?.split(" ")[0] || "neighbor"}: no open issues here.`}</h2>
          <p>{hasOpenIssues ? "Use this page for a new request, access notes, and the latest LivingRelay updates." : "Everything looks calm. If this is your first time here, the form below is the fastest way to get a manager the right details."}</p>
        </div>
        <div className="tenant-address-card">
          <MapPin size={18} />
          <span>{property?.name || "Your property"}</span>
          <strong>{property?.address || "Address on file"}</strong>
        </div>
      </div>

      <section className="split-view tenant-split">
      <div className="panel">
        <SectionTitle icon={<Home />} title="Report an issue" eyebrow="Tenant mobile web" />
        {!hasOpenIssues && (
          <div className="first-issue-box">
            <Sparkles size={18} />
            <div>
              <h3>{hasOrders ? "Need something new fixed?" : "Filing the first issue is easy"}</h3>
              <p>Pick a common starter or write it in your own words, then attach helpful photos or videos.</p>
            </div>
          </div>
        )}
        <div className="starter-grid" aria-label="Common issue starters">
          {tenantIssueStarters.map((starter) => (
            <button
              type="button"
              key={starter}
              onClick={() => setRequest({ ...request, issue: starter })}
            >
              {starter}
            </button>
          ))}
        </div>
        <form className="stack" onSubmit={createOrder}>
          <label>
            What is happening?
            <textarea rows="5" value={request.issue} onChange={(event) => setRequest({ ...request, issue: event.target.value })} placeholder="Example: water is leaking under the kitchen sink" required />
          </label>
          {request.issue && (
            <div className="tenant-guidance-box">
              <span className="eyebrow"><Sparkles size={13} /> Self-solve first</span>
              <h3>{tenantGuidance.title}</h3>
              <ul>
                {tenantGuidance.steps.map((step) => <li key={step}>{step}</li>)}
              </ul>
              {tenantGuidance.propertyNote && <p>{tenantGuidance.propertyNote}</p>}
            </div>
          )}
          {tenantPresenceRelevant && (
            <div className="tenant-presence-note">
              <Clock size={16} />
              <span>If this needs a repair person inside or you need to be home, add the windows that work below.</span>
            </div>
          )}
          <fieldset className="tenant-choice-group">
            <legend>What should happen next?</legend>
            <label>
              <input type="radio" name="tenant-escalation" checked={request.escalationChoice === "self_solve"} onChange={() => setRequest({ ...request, escalationChoice: "self_solve" })} />
              <span><strong>I will try this first</strong><small>No manager notification yet. You can still escalate from the repair thread.</small></span>
            </label>
            <label>
              <input type="radio" name="tenant-escalation" checked={request.escalationChoice === "notify_manager"} onChange={() => setRequest({ ...request, escalationChoice: "notify_manager" })} />
              <span><strong>Notify the property manager</strong><small>Send the issue, advice tried, photos, and availability.</small></span>
            </label>
            <label>
              <input type="radio" name="tenant-escalation" checked={request.escalationChoice === "vendor_outreach"} onChange={() => setRequest({ ...request, escalationChoice: "vendor_outreach" })} />
              <span><strong>Ask to start vendor outreach</strong><small>LivingRelay shares your availability with vendors when calling for openings.</small></span>
            </label>
          </fieldset>
          <label>
            Default availability
            <textarea rows="2" value={defaultAvailability} onChange={(event) => setRequest({ ...request, defaultAvailability: event.target.value, useDefaultAvailability: Boolean(event.target.value) })} placeholder="Example: Any time with text before entry" />
          </label>
          {defaultAvailability && (
            <label className="check-row">
              <input type="checkbox" checked={request.useDefaultAvailability} onChange={(event) => setRequest({ ...request, useDefaultAvailability: event.target.checked })} />
              Use my default availability for this issue
            </label>
          )}
          <label>
            {tenantPresenceRelevant || askingForVendor ? "Availability and access for this issue" : "Access notes if needed"}
            <textarea
              rows="3"
              value={request.useDefaultAvailability && defaultAvailability ? selectedAccess : request.access}
              onChange={(event) => setRequest({ ...request, access: event.target.value, useDefaultAvailability: false })}
              placeholder={tenantPresenceRelevant || askingForVendor ? "Example: ASAP, tonight 8-10 PM, or tomorrow 7-10 AM. Add pets, gate codes, parking, or permission to enter." : "Example: text before entry, gate code, parking, or anything the manager should know."}
              required={availabilityRequired && !defaultAvailability}
            />
            {availabilityRequired && !defaultAvailability && <span className="field-hint">This issue may need in-unit access, so availability is required before manager or vendor coordination.</span>}
          </label>
          <label className="check-row">
            <input type="checkbox" checked={request.saveDefaultAvailability} onChange={(event) => setRequest({ ...request, saveDefaultAvailability: event.target.checked })} />
            Save this as my default availability
          </label>
          <IssueMediaPicker request={request} setRequest={setRequest} />
          <button className="primary wide" type="submit"><Send size={16} /> {request.escalationChoice === "self_solve" ? "Start self-solve thread" : request.escalationChoice === "vendor_outreach" ? "Send and request vendor outreach" : "Send to manager"}</button>
        </form>
      </div>
      <div className="panel">
        <SectionTitle icon={<MessageSquare />} title="My updates" eyebrow="SMS mirror" />
        {!hasOrders && (
          <div className="tenant-empty-state">
            <ShieldCheck size={30} />
            <h3>No repair threads yet</h3>
            <p>When you send your first issue, manager updates and LivingRelay texts will appear here so you can follow along without digging through messages.</p>
          </div>
        )}
        {hasOrders && !hasOpenIssues && (
          <div className="tenant-empty-state compact">
            <ShieldCheck size={26} />
            <h3>Nothing active right now</h3>
            <p>Past threads stay below for reference. New manager updates will move back to the top.</p>
          </div>
        )}
        {sortedOrders.map((order) => (
          <article className="update-card" key={order.id}>
            <span className="eyebrow">{order.id} · {order.status}</span>
            <p>{order.issue}</p>
            {order.access && <small>Access: {order.access}</small>}
          </article>
        ))}
      </div>
      </section>

      <section className="tenant-notes-panel">
        <SectionTitle icon={<ClipboardList />} title="Maintenance notes" eyebrow="For this address" />
        <div className="tenant-note-grid">
          {maintenanceNotes.map((note) => (
            <article key={note}>
              <Check size={16} />
              <p>{note}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function VendorView({ orders }) {
  return (
    <section className="panel">
      <SectionTitle icon={<Wrench />} title="Vendor jobs" eyebrow="SMS accepting flow" />
      {!orders.length && <p className="empty-copy">No jobs have been sent to this vendor for this property yet.</p>}
      {orders.map((order) => (
        <article className="approval-card" key={order.id}>
          <span className="eyebrow">{order.id}</span>
          <h2>{order.trade} request</h2>
          <p>{order.issue}</p>
          <div className="button-grid">
            <button className="primary"><Check size={16} /> Accept</button>
            <button className="ghost">Decline</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SectionTitle({ icon, eyebrow, title }) {
  return (
    <div className="section-title">
      <div className="section-icon">{icon}</div>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function MiniRow({ icon, label, value }) {
  return (
    <div className="mini-row">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Timeline({ items }) {
  return (
    <div className="timeline">
      <h3>Timeline</h3>
      {items.map((item, index) => (
        <div className="timeline-item" key={`${item.label}-${index}`}>
          <div className="dot">{index + 1}</div>
          <div>
            <strong>{item.label}</strong>
            <p>{item.detail}</p>
            <span>{item.stamp}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvoiceRow({ invoice, onPaid }) {
  const paid = String(invoice.paymentStatus || invoice.status || "").toLowerCase().includes("paid");
  const recipientText = invoice.recipients?.length
    ? formatInvoiceRecipients(invoice.recipients)
    : `${invoice.recipientName || "property manager"}${invoice.recipientEmail ? ` · ${invoice.recipientEmail}` : ""}${invoice.recipientPhone ? ` · ${invoice.recipientPhone}` : ""}`;
  return (
    <article className="invoice-row">
      <div>
        <span className="eyebrow">{invoice.orderId} · {invoice.receivedAt} · {invoice.paymentRail || "Vendor direct"}</span>
        <h3>{invoice.vendor}</h3>
        <p>{invoice.note}</p>
        <p className="invoice-recipient">Invoice requested to {recipientText}</p>
      </div>
      <div className="invoice-side">
        <strong>{formatMoney(invoice.amount)}</strong>
        <span>{invoice.paymentStatus || invoice.status}</span>
        <button className="ghost" onClick={onPaid} disabled={paid}><Check size={15} /> Paid</button>
      </div>
    </article>
  );
}

function formatInvoiceRecipients(recipients = []) {
  return recipients
    .map((recipient) => `${recipient.role || "Recipient"}: ${recipient.email || recipient.phone || recipient.name}`)
    .join("; ");
}

function vendorScopeSummary(order = {}, property = {}) {
  const media = order.mediaReview?.insights?.vendorPrep || order.mediaReview?.insights?.summary || (order.media?.length ? `${order.media.length} attachment(s)` : "No photos yet");
  const windows = (order.tenantAvailability?.preferredWindows || []).join(", ");
  return [
    property.address ? `${property.address}` : property.name,
    order.unit ? `Unit/area: ${order.unit}` : "",
    order.issue ? `Issue: ${order.issue}` : "",
    `Timing: ${order.tenantAvailability?.serviceWindow || order.serviceWindow || order.severity || "Needs confirmation"}`,
    `Access: ${order.tenantAvailability?.accessNotes || order.access || windows || "Needs confirmation"}`,
    `Media: ${media}`
  ].filter(Boolean).join(" · ");
}

function vendorActionSummary(order = {}) {
  const outreach = order.vendorOutreach || {};
  const selected = (outreach.outcomes || []).find((item) => item.selected || item.id === outreach.selectedOutcomeId);
  const scopeMissing = missingVendorScopeFieldsForUi(order);
  if (scopeMissing.length && !(outreach.attempts || []).length && !(outreach.outcomes || []).length) {
    return `Before quoting, collect ${scopeMissing.join(", ")}.`;
  }
  const needsInfo = order.tenantAvailability?.missingFields?.length
    ? `Ask tenant/manager for ${order.tenantAvailability.missingFields.join(", ")}.`
    : "";
  if (needsInfo) return needsInfo;
  if (selected) return `Confirm ${selected.availability} with tenant, then final-book ${selected.vendorName}.`;
  const actionable = (outreach.outcomes || []).find((item) => item.recommendedNextStep || item.managerActionRequired || item.nextAction);
  if (actionable) return actionable.recommendedNextStep || actionable.managerActionRequired || formatNextAction(actionable.nextAction);
  if ((outreach.attempts || []).length) return "Review latest call attempt and wait for a structured vendor outcome.";
  if (outreach.status && outreach.status !== "Not started") return outreach.status;
  return "Start AI calls or send the vendor-ready scope.";
}

function missingVendorScopeFieldsForUi(order = {}) {
  const missing = [];
  if (!order.unit) missing.push("unit/exact area");
  if (!order.issue || String(order.issue).trim().split(/\s+/).length < 4) missing.push("more issue detail");
  if (!order.access && !order.tenantAvailability?.accessNotes && !order.tenantAvailability?.preferredWindows?.length) missing.push("tenant access");
  if (order.tenantAvailability?.needsFollowUp) missing.push("entry window or permission");
  return [...new Set(missing)];
}

function formatNextAction(action = "") {
  return String(action || "manager_review").replace(/_/g, " ");
}

function vendorRealityLabel(vendor = {}) {
  const phone = String(vendor.phone || "");
  if (vendor.testMode || vendor.source === "Demo fallback list" || vendor.metadata?.source === "Demo fallback list") return "test/demo";
  if (/55501\d{2}/.test(phone.replace(/\D/g, "")) || /555-01\d{2}/.test(phone)) return "sample phone";
  if (vendor.source === "Configured vendor list") return "configured";
  return "";
}

function vendorRecordSummary(vendorList = []) {
  if (!vendorList.length) return "No vendors configured for this property or trade yet.";
  const sampleCount = vendorList.filter((vendor) => vendorRealityLabel(vendor) === "sample phone").length;
  const liveCount = vendorList.length - sampleCount;
  if (sampleCount && !liveCount) return `${sampleCount} sample vendor record(s). Add real vendors or enable live vendor search before production outreach.`;
  if (sampleCount) return `${liveCount} configured vendor(s), ${sampleCount} sample record(s). Sample records route safely for testing.`;
  return `${liveCount} configured vendor record(s).`;
}

function BillingEventRow({ event }) {
  return (
    <article className="invoice-row">
      <div>
        <span className="eyebrow">{event.orderId || "Setup"} · {event.payerRole || "Owner"}</span>
        <h3>Vendor dispatch coordination</h3>
        <p>{event.note || "Charged only when LivingRelay books vendor coordination."}</p>
        {event.createdAt && <p className="muted">{new Date(event.createdAt).toLocaleString()}</p>}
      </div>
      <div className="invoice-side">
        <strong>{formatMoney(Number(event.amount || 0))}</strong>
        <span>{event.status}</span>
        {event.stripeInvoiceUrl && <a href={event.stripeInvoiceUrl} target="_blank" rel="noreferrer">Payment receipt</a>}
      </div>
    </article>
  );
}

function IntegrationCard({ icon, title, text, action, status, statusTone = "idle" }) {
  return (
    <div className="integration-card">
      <div>{icon}</div>
      <strong>{title}</strong>
      <span>{text}</span>
      {status && <p className={`integration-status ${statusTone}`}>{status}</p>}
      {action}
    </div>
  );
}

function startBrowserListen(call, setAudioState) {
  if (!call.browserListenUrl) {
    setAudioState((current) => ({ ...current, [call.id]: "Live audio is not available for this call yet." }));
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    setAudioState((current) => ({ ...current, [call.id]: "Browser audio is not supported here." }));
    return;
  }
  const audioContext = new AudioContextClass({ sampleRate: 8000 });
  let nextStartTime = audioContext.currentTime + 0.08;
  const socket = new WebSocket(call.browserListenUrl);
  socket.onopen = () => setAudioState((current) => ({ ...current, [call.id]: "Audio listener connected." }));
  socket.onerror = () => setAudioState((current) => ({ ...current, [call.id]: "Audio listener connection failed." }));
  socket.onclose = () => setAudioState((current) => ({ ...current, [call.id]: "Audio listener closed." }));
  socket.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "ready") {
      setAudioState((current) => ({ ...current, [call.id]: message.connected ? "Waiting for audio..." : "Connected; live audio is starting." }));
      return;
    }
    if (message.type === "media" && message.payload) {
      await audioContext.resume();
      const samples = decodeMulawBase64(message.payload);
      const buffer = audioContext.createBuffer(1, samples.length, 8000);
      buffer.copyToChannel(samples, 0);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      const startAt = Math.max(nextStartTime, audioContext.currentTime + 0.02);
      source.start(startAt);
      nextStartTime = startAt + buffer.duration;
      setAudioState((current) => ({ ...current, [call.id]: "Playing live audio." }));
    }
  };
}

function decodeMulawBase64(payload) {
  const binary = atob(payload);
  const samples = new Float32Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    samples[index] = mulawByteToFloat(binary.charCodeAt(index));
  }
  return samples;
}

function mulawByteToFloat(value) {
  const byte = ~value & 0xff;
  const sign = byte & 0x80;
  const exponent = (byte >> 4) & 0x07;
  const mantissa = byte & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  return (sign ? -sample : sample) / 32768;
}

function inferDispatchStage(order) {
  if (order.status === "Closed") return "closed";
  if (order.completionPackage?.status === "Received") return "completion_review";
  if (order.status === "Vendor scheduled") return "vendor_booked";
  if (order.vendorOutreach?.selectedOutcomeId) return "tenant_timing_confirmation";
  if (order.vendorOutreach?.outcomes?.length) return "manager_recommendation";
  if (order.vendorOutreach?.status && order.vendorOutreach.status !== "Not started") return "vendor_calls";
  if (order.status === "Owner approval") return "owner_approval";
  if (order.status === "Manager review") return "manager_approval";
  if (order.status === "Tenant troubleshooting") return "tenant_self_fix_check";
  return "tenant_intake";
}

function formatStage(stage) {
  const labels = {
    tenant_intake: "Tenant intake",
    tenant_self_fix_check: "Tenant self-fix check",
    manager_approval: "Manager approval",
    owner_approval: "Owner approval",
    vendor_calls: "Vendor calls",
    manager_recommendation: "Manager recommendation",
    tenant_timing_confirmation: "Tenant timing confirmation",
    vendor_booked: "Vendor booked",
    completion_review: "Completion review",
    closed: "Closed"
  };
  return labels[stage] || stage;
}

function stageMatches(stage, item) {
  const map = {
    self_fix: ["tenant_intake", "tenant_self_fix_check"],
    research: ["manager_approval", "owner_approval"],
    vendor_calls: ["vendor_calls"],
    recommendation: ["manager_recommendation"],
    approvals: ["manager_approval", "owner_approval"],
    tenant_confirm: ["tenant_timing_confirmation"],
    booked: ["vendor_booked"],
    closeout: ["completion_review", "closed"]
  };
  return map[item]?.includes(stage);
}

const rootElement = document.getElementById("root");
const root = globalThis.__livingRelayRoot || createRoot(rootElement);
globalThis.__livingRelayRoot = root;
root.render(<PublicSiteRouter />);
