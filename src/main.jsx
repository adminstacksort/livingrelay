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
  ClipboardList,
  CreditCard,
  Database,
  DollarSign,
  Download,
  FileText,
  Gift,
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
  Trash2,
  Upload,
  UserRound,
  Users,
  Wrench
} from "lucide-react";
import heroImage from "../assets/livingrelay-hero.png";
import "./styles.css";

const people = [
  { id: "site-admin-1", name: "Avery Stone", role: "Site Admin", phone: "(310) 555-0199", pin: "9999", propertyIds: [], accountIds: ["acct-1"] },
  { id: "admin-1", name: "Jordan Lee", role: "Manager", phone: "(310) 555-0100", pin: "1111", propertyIds: ["p-1", "p-2"], managesPropertyIds: ["p-1"] },
  { id: "owner-1", name: "Priya Shah", role: "Owner", phone: "(310) 555-0102", pin: "3333", propertyIds: ["p-1"] },
  { id: "tenant-1", name: "Maya Chen", role: "Tenant", phone: "(310) 555-0103", pin: "4444", propertyIds: ["p-1"], unit: "Garden flat" },
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
    rules: "Plumbing under $300 goes to Carlos first. Any repair above $150 needs owner approval. HVAC always requires manager review. Emergencies: active water, gas smell, sparking, no lock."
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
  photos: ""
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
  "/support": "support",
  "/marketing": "marketing",
  "/privacy": "privacy",
  "/privacy-policy": "privacy"
};

function publicSitePageFor(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return publicSitePages[normalized] || null;
}

const routeRoles = {
  admin: "Site Admin",
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
  if (role === "Site Admin") {
    return {
      dashboard: "accounts",
      accounts: "accounts",
      customers: "accounts",
      access: "accessRequests",
      referrals: "accessRequests",
      "access-requests": "accessRequests",
      people: "directory",
      directory: "directory",
      properties: "properties",
      support: "workOrders",
      "work-orders": "workOrders",
      billing: "billing",
      revenue: "billing",
      audit: "audit"
    }[page] || "accounts";
  }
  if (["Manager", "Owner"].includes(role)) {
    return page === "billing" ? "billing" : "operations";
  }
  return "dashboard";
}

function pageFromSection(role, section) {
  if (role === "Site Admin") {
    return {
      accounts: "dashboard",
      accessRequests: "access",
      directory: "people",
      properties: "properties",
      workOrders: "support",
      billing: "revenue",
      audit: "audit"
    }[section] || "dashboard";
  }
  if (["Manager", "Owner"].includes(role)) {
    return section === "billing" ? "billing" : "dashboard";
  }
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

function PublicSiteRouter() {
  const page = publicSitePageFor();
  return page ? <PublicSitePage page={page} /> : <App />;
}

function PublicSitePage({ page }) {
  const pages = {
    marketing: {
      eyebrow: "LivingRelay",
      title: "SMS-first rental repair coordination",
      summary: "LivingRelay turns tenant texts into organized repair workflows, approvals, vendor coordination, and invoice records for small property operators.",
      primary: "Open app",
      primaryHref: "/",
      secondary: "Get support",
      secondaryHref: "/support"
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
      secondary: "Support",
      secondaryHref: "/support"
    }
  };
  const content = pages[page] || pages.marketing;

  return (
    <main className="public-page">
      <nav className="public-nav" aria-label="Public navigation">
        <a className="public-brand" href="/marketing" aria-label="LivingRelay marketing page">
          <span className="app-mark"><Wrench size={22} /></span>
          <strong>LivingRelay</strong>
        </a>
        <div>
          <a href="/marketing">Marketing</a>
          <a href="/support">Support</a>
          <a href="/privacy">Privacy</a>
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
      {page === "support" && <SupportContent />}
      {page === "privacy" && <PrivacyContent />}
    </main>
  );
}

function MarketingContent() {
  return (
    <>
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

function PrivacyContent() {
  return (
    <section className="privacy-document" aria-label="Privacy Policy">
      <p className="privacy-date">Effective May 3, 2026</p>
      <h2>Privacy Policy</h2>
      <p>LivingRelay provides rental repair coordination software for property managers, owners, tenants, and vendors. This policy explains the information we collect, how we use it, and the choices available to users.</p>

      <h3>Information We Collect</h3>
      <p>We collect account and contact information such as names, phone numbers, roles, property assignments, and authentication details. We collect property and repair workflow information such as property names, addresses, unit labels, repair requests, access notes, work order status, vendor details, approval history, invoice records, and support requests.</p>

      <h3>Messages And Repair Content</h3>
      <p>LivingRelay may process tenant, manager, owner, and vendor messages, photos, call metadata, and repair notes so the service can classify issues, route approvals, coordinate vendors, keep audit history, and provide support.</p>

      <h3>How We Use Information</h3>
      <p>We use information to operate the product, authenticate users, provide role-scoped access, coordinate repair workflows, maintain invoice and tax records, troubleshoot issues, improve reliability, prevent abuse, and meet legal or compliance obligations.</p>

      <h3>Service Providers</h3>
      <p>We may use trusted service providers for hosting, messaging, phone verification, payment infrastructure, email, analytics, logging, and support operations. These providers process information only as needed to provide their services to LivingRelay.</p>

      <h3>Payments</h3>
      <p>Repair payments are handled off platform. LivingRelay may track invoice status and billing events, and may use payment infrastructure for subscription or coordination fees where applicable. We do not intentionally store full payment card numbers on LivingRelay servers.</p>

      <h3>Sharing</h3>
      <p>We share repair workflow information with users who need it for the property workflow, such as managers, owners, tenants, and vendors. We do not sell personal information.</p>

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

function PublicCard({ icon, title, text }) {
  return (
    <article className="public-card">
      <span className="section-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
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

const rememberedPhoneStorageKey = "livingrelay.rememberedPhone";
const authTokenStorageKey = "livingrelay.authToken";
const sessionUserStorageKey = "livingrelay.sessionUserId";

function App() {
  const [session, setSession] = useState(() => {
    const userId = window.localStorage.getItem(sessionUserStorageKey);
    return userId ? { userId } : null;
  });
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [rememberedPhone, setRememberedPhone] = useState("");
  const [editingRememberedPhone, setEditingRememberedPhone] = useState(false);
  const [sitePassword, setSitePassword] = useState("");
  const [siteAdminToken, setSiteAdminToken] = useState("");
  const [authToken, setAuthToken] = useState(() => window.localStorage.getItem(authTokenStorageKey) || "");
  const [loginError, setLoginError] = useState("");
  const [loginVerification, setLoginVerification] = useState({ challengeId: "", code: "", state: "idle", message: "" });
  const [activePropertyId, setActivePropertyId] = useState("p-1");
  const [orders, setOrders] = useState(seedOrders);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [activeOrderId, setActiveOrderId] = useState(seedOrders[0].id);
  const [request, setRequest] = useState(defaultRequest);
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
    window.localStorage.removeItem(authTokenStorageKey);
    window.localStorage.removeItem(sessionUserStorageKey);
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
  }, [user?.id, user?.role, adminSection, activeProperty?.id, activeOrder?.id]);

  async function loadState() {
    const response = await fetch("/api/state");
    const data = await response.json();
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
      setAdminSection(match?.role === "Site Admin" ? "accounts" : "operations");
      setLoginVerification({ challengeId: "", code: "", state: "idle", message: "" });
    };
    if (loginCandidate?.role === "Site Admin") {
      if (!siteAdminConsoleAvailable) {
        setLoginError("Admin console is only available at admin.livingrelay.com");
        return;
      }
      const response = await fetch("/api/site-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: sitePassword })
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginError(data.error || "Invalid admin console credentials");
        return;
      }
      setSession({ userId: data.userId });
      setSiteAdminToken(data.token || "");
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
      setLoginVerification({ challengeId: "", code: "", state: "sending", message: "Sending verification code..." });
      const response = await fetch("/api/auth/login/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin })
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
        message: data.devCode ? `Verification code: ${data.devCode}` : "We sent a verification code to that phone."
      });
      return;
    }
    setLoginVerification((current) => ({ ...current, state: "checking", message: "Checking verification code..." }));
    const response = await fetch("/api/auth/login/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, pin, challengeId: loginVerification.challengeId, code: loginVerification.code })
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
    setSignupStatus({ state: "saving", message: signupVerification.token ? "Creating your property..." : "Sending phone verification code..." });
    try {
      let phoneVerificationToken = signupVerification.token;
      if (!phoneVerificationToken && !signupVerification.challengeId) {
        const response = await fetch("/api/phone-verifications/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: signupForm.managerPhone, purpose: "onboarding" })
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
          message: data.devCode ? `Verification code: ${data.devCode}` : "We sent a verification code to your phone."
        });
        setSignupStatus({ state: "idle", message: "Enter the verification code to finish creating the property." });
        return;
      }
      if (!phoneVerificationToken) {
        const response = await fetch("/api/phone-verifications/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeId: signupVerification.challengeId, code: signupVerification.code, purpose: "onboarding" })
        });
        const data = await response.json();
        if (!response.ok) {
          setSignupVerification((current) => ({ ...current, state: "sent", message: data.error || "Could not verify that code." }));
          setSignupStatus({ state: "error", message: data.error || "Could not verify that code." });
          return;
        }
        phoneVerificationToken = data.token;
        setSignupVerification((current) => ({ ...current, token: data.token, state: "ok", message: "Phone verified." }));
      }
      const response = await fetch("/api/onboarding/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...signupForm, phoneVerificationToken })
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
      setSignupStatus({ state: "ok", message: `${data.property.name} is ready${data.reconciled ? " on your existing account" : ""}. Your PIN is ${data.person.pin}.` });
    } catch (error) {
      setSignupStatus({ state: "error", message: error.message });
    }
  }

  async function createOrder(submitEvent) {
    submitEvent.preventDefault();
    const triage = classifyIssue(request.issue);
    const unit = propertyLocationLabel(activeProperty);
    const tenant = user?.role === "Tenant"
      ? user
      : peopleData.find((person) => person.role === "Tenant" && person.propertyIds?.includes(activeProperty.id) && person.unit === unit)
        || peopleData.find((person) => person.role === "Tenant" && person.propertyIds?.includes(activeProperty.id));
    const vendor = vendorsData.find((item) => item.trade === triage.trade) || vendorsData[0];
    const needsOwner = triage.estimate > 150;
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
          access: request.access,
          actorName: user?.name || "Logged-in user",
          actorRole: user?.role || "User"
        })
      });
      if (data.order?.id) setActiveOrderId(data.order.id);
      setRequest({ ...defaultRequest, unit: propertyLocationLabel(activeProperty) });
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
      status: "Manager review",
      estimate: triage.estimate,
      vendorId: vendor.id,
      issue: request.issue,
      access: request.access,
      managerApproved: false,
      ownerApproved: !needsOwner,
      invoiceId: null,
      timeline: [
        event(`${user?.role || "User"} request created`, `${unit} request submitted from logged-in dashboard.`),
        event("AI triaged request", `${triage.severity} ${triage.trade}; suggested ${vendor.name}.`)
      ],
      messages: [
        sms(user?.role === "Tenant" ? "tenant" : "relay", request.issue),
        sms("relay", `Thanks. LivingRelay classified this as ${triage.trade}. Manager review is next.`)
      ]
    };
    setOrders((current) => [order, ...current]);
    setActiveOrderId(id);
    setRequest({ ...defaultRequest, unit: propertyLocationLabel(activeProperty) });
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
          ? `Connected at ${checkedAt}. Sending from ${data.twilio.from}.`
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
        body: JSON.stringify({ to, body })
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
      body: JSON.stringify({ actor: user?.name || "manager", mode, demoFallback: true, testVendorPhone: mode === "test" ? user?.phone : "" })
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

  if (!session) {
    return (
      <LandingPage
        phone={phone}
        setPhone={setPhone}
        pin={pin}
        setPin={setPin}
        sitePassword={sitePassword}
        setSitePassword={setSitePassword}
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
          .filter((property) => user.propertyIds.includes(property.id))
          .map((property) => (
            <button
              key={property.id}
              className={property.id === activeProperty.id ? "active" : ""}
              onClick={() => setActivePropertyId(property.id)}
            >
              {property.name}
            </button>
          ))}
      </section>}

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

      {user.role === "Site Admin" && (
        <SiteOwnerHero
          accounts={accountsData}
          people={peopleData}
          properties={propertiesData}
          orders={orders}
          billingEvents={billingEventsData}
          accessRequests={accessRequestsData}
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
          accessRequests={accessRequestsData}
          auditLog={auditData}
          platformSettings={platformSettings}
          reloadState={loadState}
          siteAdminToken={siteAdminToken}
          setActivePropertyId={setActivePropertyId}
          setActiveOrderId={setActiveOrderId}
          setAdminSection={setAdminSection}
        />
      )}

      {["Manager", "Owner"].includes(user.role) && adminSection !== "billing" && (
        <IssueCreatePanel
          request={request}
          setRequest={setRequest}
          createOrder={createOrder}
          property={activeProperty}
          user={user}
        />
      )}

      {["Manager", "Owner"].includes(user.role) && adminSection !== "billing" && (
        <ReferralServicePanel
          user={user}
          property={activeProperty}
          account={accountsData.find((account) => account.id === activeProperty.accountId)}
          referrals={referralsData}
          reloadState={loadState}
        />
      )}

      {user.role === "Manager" && adminSection !== "billing" && (
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

      {user.role === "Owner" && adminSection !== "billing" && (
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

      {user.role === "Tenant" && (
        <TenantView request={request} setRequest={setRequest} createOrder={createOrder} orders={tenantOrders} property={activeProperty} user={user} />
      )}

      {user.role === "Vendor" && (
        <VendorView orders={vendorOrders} />
      )}

      {user.role === "Site Admin" && (
        <section className="integration-strip">
          <IntegrationCard
            icon={<Smartphone />}
            title="Messaging infrastructure"
            text={twilioStatus?.configured ? `Twilio is live from ${twilioStatus.from}` : "Twilio needs production credentials."}
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

function LandingPageUnused({ phone, setPhone, pin, setPin, sitePassword, setSitePassword, siteAdminConsoleAvailable, login, loginCandidate, loginError, loginVerification, setLoginVerification, loginPeople, setLoginError, landingMode, setLandingMode, signupForm, setSignupForm, signupStatus, signupVerification, setSignupVerification, createOnboardingProperty, rememberedPhone, editingRememberedPhone, setEditingRememberedPhone }) {
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
        body: JSON.stringify(renterRequest)
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
            <label>
              Password
              <input type="password" value={sitePassword} onChange={(event) => setSitePassword(event.target.value)} autoComplete="current-password" autoFocus />
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
            <button className="ghost light" onClick={() => setLandingMode("renter")}>Request access</button>
            <button className="ghost light" onClick={() => setLandingMode("login")}>Log in</button>
          </div>
        </nav>
        <div className="landing-hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker">City home maintenance over SMS</span>
            <p>Start here: set up a rental property, request access for your home, or log in to manage repairs.</p>
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
                  <label>Your name<input required value={signupForm.managerName} onChange={(event) => updateSignup("managerName", event.target.value)} placeholder="Jordan Lee" /></label>
                  <label>Your role<select value={signupForm.role} onChange={(event) => updateSignup("role", event.target.value)}><option>Property manager</option><option>Owner</option><option>Owner and property manager</option></select></label>
                  <label>Phone<input required value={signupForm.managerPhone} onChange={(event) => updateSignup("managerPhone", formatPhoneInput(event.target.value))} inputMode="tel" autoComplete="tel" placeholder="(310) 555-0100" /></label>
                  <label>PIN<PinCodeInput value={signupForm.pin} onChange={(value) => updateSignup("pin", value)} /></label>
                  {showReferralCode || signupForm.referralToken ? (
                    <label className="span-2 optional-referral-field">
                      <span>{signupForm.referralToken ? "Referral applied" : "Referral code"} <small>optional</small></span>
                      <input value={signupForm.referralToken} onChange={(event) => updateSignup("referralToken", event.target.value.toUpperCase())} placeholder="LR-ABC12345" />
                    </label>
                  ) : (
                    <button className="link-button subtle-referral-toggle" type="button" onClick={() => setShowReferralCode(true)}>
                      <Gift size={14} /> I have a referral code
                    </button>
                  )}
                  {signupVerification.challengeId && (
                    <label className="span-2">Verification code<input required value={signupVerification.code} onChange={(event) => setSignupVerification((current) => ({ ...current, code: event.target.value }))} inputMode="numeric" placeholder="6-digit code" /></label>
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

      <section className="value-band" id="how-it-works">
        <article><MessageSquare size={22} /><strong>Residents text once</strong><p>LivingRelay asks follow-ups, captures access notes, and creates a work order for the property address.</p></article>
        <article><ShieldCheck size={22} /><strong>Approvals stay clear</strong><p>Managers and owners see estimates, thresholds, invoices, and the full timeline.</p></article>
        <article><Wrench size={22} /><strong>Vendors stay coordinated</strong><p>Send vendor messages, book dispatches, and keep every repair update attached.</p></article>
        <article><FileText size={22} /><strong>Records are tax-ready</strong><p>Invoices and CSV exports stay organized by property and year.</p></article>
      </section>

      <section className="pricing-band" id="pricing">
        <div>
          <span className="eyebrow">Simple pricing</span>
          <h2>No monthly property fee.</h2>
          <p>Start with a city rental home, duplex, townhome, or small multifamily property, then add residents, owner approvals, and vendor coordination. LivingRelay charges when coordination turns into a booked vendor dispatch.</p>
        </div>
        <article className="price-card">
          <span>Launch price</span>
          <strong>$0/property</strong>
          <p>plus $25 only when a vendor is booked</p>
          <button className="primary wide" onClick={() => setLandingMode("create")}><Building2 size={16} /> Setup property</button>
        </article>
      </section>
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
          <input type="password" value={sitePassword} onChange={(event) => setSitePassword(event.target.value)} autoComplete="current-password" />
        </label>
      )}
      {loginVerification?.challengeId && (
        <label>
          Verification code
          <input value={loginVerification.code} onChange={(event) => setLoginVerification((current) => ({ ...current, code: event.target.value }))} inputMode="numeric" />
        </label>
      )}
      <button className="primary wide" type="submit"><LockKeyhole size={16} /> {loginVerification?.challengeId ? "Verify and enter" : "Send code"}</button>
      {loginVerification?.message && <p className={`form-status ${loginVerification.state}`}>{loginVerification.message}</p>}
      {loginError && <p className="login-error">{loginError}</p>}
    </form>
  );
}

function PinCodeInput({ value, onChange }) {
  const digits = formatPinInput(value);
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
        {[0, 1, 2, 3].map((index) => <span key={index}>{digits[index] || ""}</span>)}
      </span>
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
                <input type="password" value={sitePassword} onChange={(event) => setSitePassword(event.target.value)} autoComplete="current-password" />
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
            <label>Manager name<input required value={signupForm.managerName} onChange={(event) => setSignupForm({ ...signupForm, managerName: event.target.value })} /></label>
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
    ["accessRequests", Send, "Access"],
    ["directory", Users, "People"],
    ["properties", Building2, "Properties"],
    ["workOrders", ClipboardList, "Support"],
    ["billing", DollarSign, "Revenue"],
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

function SiteOwnerHero({ accounts, people, properties, orders, billingEvents, accessRequests = [], stripe, twilioStatus, platformSettings }) {
  const openOrders = orders.filter((order) => order.status !== "Closed").length;
  const activeAccounts = accounts.filter((account) => account.status === "Active").length;
  const dispatchRevenue = billingEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
  const ownerUsers = people.filter((person) => person.role === "Owner").length;
  const recentAccessRequests = accessRequests.filter((request) => {
    const createdAt = new Date(request.createdAt || 0).getTime();
    return createdAt && Date.now() - createdAt < 1000 * 60 * 60 * 24 * 30;
  }).length;
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
        <MiniRow icon={<Users />} label="Owner users" value={ownerUsers} />
        <MiniRow icon={<CreditCard />} label="Stripe" value={stripe.configured ? "Ready" : "Needs keys"} />
        <MiniRow icon={<Smartphone />} label="Twilio" value={twilioStatus?.configured ? "Ready" : "Needs config"} />
        <MiniRow icon={<Phone />} label="Vendor calls" value={platformSettings?.vendorCallTestMode ? "Test mode" : platformSettings?.productionVendorCallsEnabled ? "Production enabled" : "Production disabled"} />
      </div>
    </section>
  );
}

function RoleSectionAction({ active, setActive, role }) {
  const billingActive = active === "billing";
  const operationsLabel = role === "Owner" ? "Approvals" : "Operations";
  return (
    <div className={`role-section-action ${billingActive ? "billing-active" : ""}`}>
      <span>{billingActive ? "Billing settings" : operationsLabel}</span>
      <button className={billingActive ? "ghost" : "link-button"} onClick={() => setActive(billingActive ? "operations" : "billing")}>
        {billingActive ? <><ClipboardList size={16} /> Back to {operationsLabel.toLowerCase()}</> : <><CreditCard size={15} /> Billing settings</>}
      </button>
    </div>
  );
}

function AdminConsole({ active, accounts, people, properties, vendors, orders, invoices, billingEvents, referrals = [], accessRequests = [], auditLog, platformSettings, reloadState, siteAdminToken, setActivePropertyId, setActiveOrderId, setAdminSection }) {
  const activeProperties = properties.length;
  const pendingInvoices = invoices.filter((invoice) => !String(invoice.status).toLowerCase().includes("paid")).length;
  const openOrders = orders.filter((order) => order.status !== "Closed").length;
  const dispatchRevenue = billingEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
  return (
    <section className="admin-console">
      <div className="admin-overview">
        <Metric icon={<LayoutDashboard />} label="Customer accounts" value={accounts.length} />
        <Metric icon={<Send />} label="Access requests" value={accessRequests.length} />
        <Metric icon={<DollarSign />} label="Dispatch fees" value={formatMoney(dispatchRevenue)} />
        <Metric icon={<ClipboardList />} label="Open support load" value={openOrders} />
      </div>
      {active === "accounts" && <>
        <PlatformVendorCallSettings platformSettings={platformSettings} reloadState={reloadState} siteAdminToken={siteAdminToken} />
        <SiteAccounts accounts={accounts} properties={properties} people={people} orders={orders} invoices={invoices} reloadState={reloadState} siteAdminToken={siteAdminToken} />
      </>}
      {active === "accessRequests" && <AdminAccessRequests accessRequests={accessRequests} referrals={referrals} reloadState={reloadState} siteAdminToken={siteAdminToken} />}
      {active === "directory" && <AdminDirectory people={people} properties={properties} accounts={accounts} reloadState={reloadState} />}
      {active === "properties" && <AdminProperties properties={properties} people={people} accounts={accounts} reloadState={reloadState} setActivePropertyId={setActivePropertyId} setAdminSection={setAdminSection} />}
      {active === "workOrders" && <AdminWorkOrders orders={orders} properties={properties} people={people} vendors={vendors} accounts={accounts} reloadState={reloadState} setActivePropertyId={setActivePropertyId} setActiveOrderId={setActiveOrderId} setAdminSection={setAdminSection} />}
      {active === "billing" && <AdminBilling accounts={accounts} properties={properties} invoices={invoices} billingEvents={billingEvents} activeProperties={activeProperties} pendingInvoices={pendingInvoices} reloadState={reloadState} />}
      {active === "diagnostics" && <AdminDiagnostics siteAdminToken={siteAdminToken} platformSettings={platformSettings} />}
      {active === "audit" && <AdminAudit auditLog={auditLog} />}
    </section>
  );
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
      body: JSON.stringify(form)
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
      body: JSON.stringify(form)
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
            <MiniRow icon={<Phone />} label="Tenant access" value={activeOrder.access} />
            <MiniRow icon={<AlertTriangle />} label="Service timing" value={`${activeOrder.tenantAvailability?.serviceWindow || activeOrder.serviceWindow || activeOrder.severity} · ${(activeOrder.tenantAvailability?.preferredWindows || []).join(", ") || "Needs tenant confirmation"}`} />
            <MiniRow icon={<Wrench />} label="Vendor SMS" value={`Send scope to ${vendor?.phone}: ${activeOrder.issue}`} />
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
      body: JSON.stringify({ ...personForm, propertyId: property.id })
    });
    setPersonForm({ name: "", role: "Tenant", phone: "", email: "", unit: propertyLocationLabel(property), trade: "Plumbing" });
    await reloadState();
  }

  async function addVendor(event) {
    event.preventDefault();
    await fetch("/api/admin/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendorForm)
    });
    setVendorForm({ name: "", trade: "Plumbing", phone: "" });
    await reloadState();
  }

  async function updateNotify(person, patch) {
    await fetch(`/api/people/${person.id}/notify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
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
        <input placeholder="Vendor" value={vendorForm.name} onChange={(event) => setVendorForm({ ...vendorForm, name: event.target.value })} />
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
              ["email", "Email"],
              ["push", "iOS push"]
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
  const [form, setForm] = useState({
    vendorOutreachMode: settings.vendorOutreachMode || "manager_approval",
    emergencyOutreachMode: settings.emergencyOutreachMode || "manager_approval",
    productionVendorCallsEnabled: settings.productionVendorCallsEnabled !== false,
    maxVendorsToCall: settings.maxVendorsToCall || 5,
    inboundInvoiceEmail: settings.inboundInvoiceEmail || "invoices@livingrelay.com",
    Plumbing: (settings.vendorPreferences?.Plumbing || []).join(", "),
    HVAC: (settings.vendorPreferences?.HVAC || []).join(", "),
    Electrical: (settings.vendorPreferences?.Electrical || []).join(", "),
    Painting: (settings.vendorPreferences?.Painting || []).join(", "),
    General: (settings.vendorPreferences?.General || []).join(", ")
  });

  useEffect(() => {
    setForm({
      vendorOutreachMode: settings.vendorOutreachMode || "manager_approval",
      emergencyOutreachMode: settings.emergencyOutreachMode || "manager_approval",
      productionVendorCallsEnabled: settings.productionVendorCallsEnabled !== false,
      maxVendorsToCall: settings.maxVendorsToCall || 5,
      inboundInvoiceEmail: settings.inboundInvoiceEmail || "invoices@livingrelay.com",
      Plumbing: (settings.vendorPreferences?.Plumbing || []).join(", "),
      HVAC: (settings.vendorPreferences?.HVAC || []).join(", "),
      Electrical: (settings.vendorPreferences?.Electrical || []).join(", "),
      Painting: (settings.vendorPreferences?.Painting || []).join(", "),
      General: (settings.vendorPreferences?.General || []).join(", ")
    });
  }, [property.id]);

  async function saveSettings(event) {
    event.preventDefault();
    const vendorPreferences = {};
    ["Plumbing", "HVAC", "Electrical", "Painting", "General"].forEach((trade) => {
      vendorPreferences[trade] = String(form[trade] || "").split(",").map((item) => item.trim()).filter(Boolean);
    });
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
          vendorPreferences
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
        <label className="span-2" key={trade}>{trade} priority<input list={`vendors-${trade}`} value={form[trade]} onChange={(event) => setForm({ ...form, [trade]: event.target.value })} placeholder="Vendor names or phone numbers, in priority order" /><datalist id={`vendors-${trade}`}>{vendors.filter((vendor) => vendor.trade === trade || trade === "General").map((vendor) => <option value={vendor.name} key={vendor.id} />)}</datalist></label>
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
  if (!order.troubleshooting && !mediaItems.length && !tenantMessages.length) return null;

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
      {!!mediaItems.length && (
        <div className="media-list">
          {mediaItems.map((item, index) => (
            <a href={item.url} target="_blank" rel="noreferrer" key={`${item.url}-${index}`}>
              <FileText size={15} /> {item.contentType || "Media"} · {index + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveCallPanel({ order, updateLiveCall }) {
  const calls = order.vendorCalls || [];
  const [audioState, setAudioState] = useState({});
  if (!calls.length) {
    return (
      <div className="live-call-panel empty">
        <strong>Live vendor calls</strong>
        <span>Started vendor calls will appear here so you can listen in or join when needed.</span>
      </div>
    );
  }

  return (
    <div className="live-call-panel">
      <div className="live-call-head">
        <div>
          <span className="eyebrow">Live vendor calls</span>
          <h3>Listen or take over</h3>
        </div>
        <span className="pill">{calls.filter((call) => call.status === "Live").length} live</span>
      </div>
      <div className="call-grid">
        {calls.map((call) => (
          <article className="call-card" key={call.id}>
            <div className="call-card-top">
              <div>
                <span>{call.status} · {call.mode}</span>
                <strong>{call.vendorName}</strong>
              </div>
              <Radio size={18} />
            </div>
            <p>{call.summary}</p>
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
            {call.monitorUrl && <span className="monitor-url">Call monitor ready</span>}
            {call.listenInAvailable && <span className="monitor-url">Listen-in ready</span>}
            {audioState[call.id] && <span className="monitor-url">{audioState[call.id]}</span>}
            {call.listener && <span className="monitor-url">{call.listener.name} listening</span>}
            {call.takeover && <span className="monitor-url">Takeover: {call.takeover.name}</span>}
            <div className="call-transcript">
              {(call.transcript || []).slice(-4).map((line, index) => (
                <div key={`${call.id}-line-${index}`}>
                  <strong>{line.speaker}</strong>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
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
        body: JSON.stringify({ ...form, propertyId: property.id, accountId: account?.id })
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
        <OwnerExpenseUpload form={expenseForm} setForm={setExpenseForm} onSubmit={uploadOwnerExpense} />
        {invoices.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} onPaid={() => patchInvoice(invoice.id, "Paid")} />
        ))}
      </div>
    </section>
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

function OwnerExpenseUpload({ form, setForm, onSubmit }) {
  return (
    <form className="tax-panel stack" onSubmit={onSubmit}>
      <SectionTitle icon={<Upload size={18} />} title="Upload bill" eyebrow="Free owner records" />
      <div className="form-grid">
        <label>Vendor or biller<input value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} placeholder="Example: Carlos Plumbing" required /></label>
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

function IssueCreatePanel({ request, setRequest, createOrder, property, user }) {
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
        <button className="primary" type="submit"><Send size={16} /> Create issue</button>
      </form>
    </section>
  );
}

function TenantView({ request, setRequest, createOrder, orders, property, user }) {
  const hasOrders = orders.length > 0;
  const hasOpenIssues = orders.some(isActiveWorkOrder);
  const maintenanceNotes = maintenanceNotesForProperty(property);
  const sortedOrders = [...orders].sort((a, b) => (a.status === "Closed") - (b.status === "Closed"));

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
              <p>Pick a common starter or write it in your own words. Photos can come later by SMS.</p>
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
          <label>
            Access notes
            <textarea rows="3" value={request.access} onChange={(event) => setRequest({ ...request, access: event.target.value })} placeholder="When can a vendor enter?" />
          </label>
          <label>
            Photos/videos
            <input value={request.photos} onChange={(event) => setRequest({ ...request, photos: event.target.value })} placeholder="Attach later by SMS in v1" />
          </label>
          <button className="primary wide" type="submit"><Send size={16} /> Send to manager</button>
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
