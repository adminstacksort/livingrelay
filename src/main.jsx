import React, { useEffect, useMemo, useState } from "react";
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
  Smartphone,
  Radio,
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
  { id: "tenant-1", name: "Maya Chen", role: "Tenant", phone: "(310) 555-0103", pin: "4444", propertyIds: ["p-1"], unit: "3B" },
  { id: "vendor-1", name: "Carlos Plumbing", role: "Vendor", phone: "(310) 555-0104", pin: "5555", propertyIds: ["p-1"], trade: "Plumbing" }
];

const accounts = [
  { id: "acct-1", name: "Shah Property Group", status: "Active", plan: "$0/property + $25 vendor dispatch", stripeCustomerId: "cus_demo_shah", billingPayerRole: "Owner", billingPayerPersonId: "owner-1", billingSetupStatus: "Card on file" }
];

const properties = [
  {
    id: "p-1",
    accountId: "acct-1",
    name: "Mar Vista Flats",
    address: "11820 Pacific Ave, Los Angeles, CA",
    subscription: "Active",
    plan: "$0/property + $25 only when a vendor is booked",
    units: ["2A", "3B", "7C"],
    ownerId: "owner-1",
    managerId: "admin-1",
    adminId: "admin-1",
    billingPayerRole: "Owner",
    billingPayerPersonId: "owner-1",
    billingSetupStatus: "Card on file",
    rules: "Plumbing under $300 goes to Carlos first. Unit 3B needs owner approval above $150. HVAC always requires manager review. Emergencies: active water, gas smell, sparking, no lock."
  },
  {
    id: "p-2",
    accountId: "acct-1",
    name: "Hilltop Duplex",
    address: "420 Ridge Lane, Pasadena, CA",
    subscription: "Ready, no monthly charge",
    plan: "$0/property + $25 only when a vendor is booked",
    units: ["A", "B"],
    ownerId: "owner-1",
    managerId: "admin-1",
    adminId: "admin-1",
    billingPayerRole: "Owner",
    billingPayerPersonId: "owner-1",
    billingSetupStatus: "Card on file",
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
    unit: "3B",
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
      event("Manager approved", "Owner approval needed because Unit 3B estimate is above $150.")
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
    unit: "2A",
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
  unit: "3B",
  issue: "",
  access: "",
  photos: ""
};

function event(label, detail) {
  return { label, detail, stamp: "Today" };
}

function sms(from, text) {
  return { from, text, stamp: "Now" };
}

function formatMoney(value) {
  return `$${value.toLocaleString()}`;
}

function isSiteAdminConsoleHost() {
  const host = window.location.hostname.toLowerCase();
  const localAdminPreview = new URLSearchParams(window.location.search).get("console") === "site-admin";
  return host === "admin.livingrelay.com" || (localAdminPreview && ["localhost", "127.0.0.1", "::1"].includes(host));
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

function App() {
  const [session, setSession] = useState(null);
  const [phone, setPhone] = useState(() => isSiteAdminConsoleHost() ? "(310) 555-0199" : "(310) 555-0100");
  const [pin, setPin] = useState(() => isSiteAdminConsoleHost() ? "9999" : "1111");
  const [sitePassword, setSitePassword] = useState("");
  const [siteAdminToken, setSiteAdminToken] = useState("");
  const [loginError, setLoginError] = useState("");
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
  const [landingMode, setLandingMode] = useState("login");
  const [signupForm, setSignupForm] = useState({
    accountName: "",
    propertyName: "",
    address: "",
    units: "",
    managerName: "",
    managerPhone: "",
    role: "Property manager",
    pin: ""
  });
  const [signupStatus, setSignupStatus] = useState({ state: "idle", message: "" });
  const siteAdminConsoleAvailable = isSiteAdminConsoleHost();
  const accountsData = appData?.accounts || accounts;
  const peopleData = appData?.people || (siteAdminConsoleAvailable ? people : people.filter((person) => person.role !== "Site Admin"));
  const loginPeople = siteAdminConsoleAvailable
    ? peopleData.filter((person) => person.role === "Site Admin")
    : peopleData.filter((person) => ["Manager", "Owner", "Tenant"].includes(person.role));
  const propertiesData = appData?.properties || properties;
  const vendorsData = appData?.vendors || vendors;
  const billingEventsData = appData?.billingEvents || seedBillingEvents;
  const stripeData = appData?.stripe || { configured: false, missing: ["STRIPE_SECRET_KEY", "APP_BASE_URL"], dispatchFeeCents: 2500 };
  const auditData = appData?.auditLog || [];
  const staleWorkOrders = appData?.staleWorkOrders || [];
  const activeProperty = propertiesData.find((property) => property.id === activePropertyId) || propertiesData[0];
  const visibleOrders = orders.filter((order) => order.propertyId === activeProperty.id);
  const activeOrder = visibleOrders.find((order) => order.id === activeOrderId) || visibleOrders[0];
  const visibleStaleOrders = staleWorkOrders.filter((order) => order.propertyId === activeProperty.id);
  const user = session ? peopleData.find((person) => person.id === session.userId) : null;
  const normalizedLoginPhone = phone.replace(/\D/g, "");
  const loginCandidate = loginPeople.find((person) => person.phone.replace(/\D/g, "").endsWith(normalizedLoginPhone.slice(-10)) && person.pin === pin);

  useEffect(() => {
    loadState();
  }, []);

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
    const section = params.get("section");
    if (propertyId) setActivePropertyId(propertyId);
    if (section) setAdminSection(section);
  }

  async function login(event) {
    event.preventDefault();
    setLoginError("");
    if (loginCandidate?.role === "Site Admin") {
      if (!siteAdminConsoleAvailable) {
        setLoginError("Site admin console is only available at admin.livingrelay.com");
        return;
      }
      const response = await fetch("/api/site-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin, password: sitePassword })
      });
      const data = await response.json();
      if (!response.ok) {
        setLoginError(data.error || "Invalid site admin credentials");
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
    const match = loginCandidate;
    if (!match) return;
    setSession({ userId: match.id });
    setActivePropertyId(match.role === "Site Admin" ? propertiesData[0]?.id : match.propertyIds[0]);
    setAdminSection(match.role === "Site Admin" ? "accounts" : "operations");
  }

  async function createOnboardingProperty(event) {
    event.preventDefault();
    setSignupStatus({ state: "saving", message: "Creating your property..." });
    try {
      const response = await fetch("/api/onboarding/property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm)
      });
      const data = await response.json();
      if (!response.ok) {
        setSignupStatus({ state: "error", message: data.error || "Could not create property." });
        return;
      }
      await loadState();
      setPhone(data.person.phone);
      setPin(data.person.pin);
      setSession({ userId: data.person.id });
      setActivePropertyId(data.property.id);
      setAdminSection("operations");
      setSignupStatus({ state: "ok", message: `${data.property.name} is ready. Your PIN is ${data.person.pin}.` });
    } catch (error) {
      setSignupStatus({ state: "error", message: error.message });
    }
  }

  function createOrder(event) {
    event.preventDefault();
    const triage = classifyIssue(request.issue);
    const tenant = peopleData.find((person) => person.id === "tenant-1");
    const vendor = vendorsData.find((item) => item.trade === triage.trade) || vendorsData[0];
    const needsOwner = request.unit === "3B" && triage.estimate > 150;
    const id = `WO-${Math.floor(3000 + Math.random() * 6000)}`;
    const order = {
      id,
      propertyId: activeProperty.id,
      unit: request.unit,
      tenantId: tenant.id,
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
        event("Tenant request created", `Unit ${request.unit} submitted from mobile web.`),
        event("AI triaged request", `${triage.severity} ${triage.trade}; suggested ${vendor.name}.`)
      ],
      messages: [
        sms("tenant", request.issue),
        sms("relay", `Thanks. LivingRelay classified this as ${triage.trade}. Manager review is next.`)
      ]
    };
    setOrders((current) => [order, ...current]);
    setActiveOrderId(id);
    setRequest(defaultRequest);
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
    await fetch(`/api/work-orders/${orderId}/demo-outreach`, { method: "POST" });
    await loadState();
  }

  async function selectDemoQuote(orderId, quoteId) {
    await fetch(`/api/work-orders/${orderId}/select-quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId })
    });
    await loadState();
  }

  async function runFullFlowDemo(orderId) {
    await fetch(`/api/work-orders/${orderId}/full-flow-demo`, { method: "POST" });
    await loadState();
  }

  async function createDemoScenario(scenario) {
    setDemoStatus("Building demo scenario...");
    const response = await fetch("/api/demo/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    await fetch(`/api/work-orders/${orderId}/nudge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send, actor: user?.name || "manager" })
    });
    await loadState();
  }

  async function nudgeStaleOrders(send = false) {
    await fetch(`/api/properties/${activeProperty.id}/stale-nudges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thresholdHours: 12, send, actor: user?.name || "manager" })
    });
    await loadState();
  }

  async function updateLiveCall(orderId, callId, action) {
    await fetch(`/api/work-orders/${orderId}/live-calls/${callId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: user?.id })
    });
    await loadState();
  }

  async function bookVendor(order) {
    if (appData) {
      await fetch(`/api/work-orders/${order.id}/book-vendor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: user?.name || "manager" })
      });
      await loadState();
      return;
    }
    patchOrder(
      { status: "Vendor scheduled", dispatchFee: { status: "Needs billing setup", amount: 25, reason: "Connect Stripe to charge automatically." } },
      "Vendor booked",
      "LivingRelay coordination fee applies now."
    );
  }

  async function addInvoice(order) {
    if (appData) {
      await fetch(`/api/work-orders/${order.id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: order.estimate, note: "Vendor invoice is paid directly to the vendor. LivingRelay tracks whether it has been paid." })
      });
      await loadState();
      return;
    }
    const id = `inv-${invoices.length + 1}`;
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
        taxYear: "2026",
        receivedAt: "Today",
        note: "Vendor invoice is paid directly to the vendor. LivingRelay tracks whether it has been paid."
      },
      ...current
    ]);
    patchOrder({ invoiceId: id }, "Vendor invoice logged", "Invoice was routed to the property manager for direct vendor payment tracking.");
  }

  const metrics = useMemo(() => {
    const open = visibleOrders.filter((order) => order.status !== "Closed").length;
    const approvals = visibleOrders.filter((order) => order.status.includes("approval") || order.status === "Manager review").length;
    const invoiceTotal = invoices
      .filter((invoice) => invoice.propertyId === activeProperty.id)
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    return { open, approvals, invoiceTotal, stale: visibleStaleOrders.length };
  }, [activeProperty.id, invoices, visibleOrders, visibleStaleOrders.length]);

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
        loginPeople={loginPeople}
        setLoginError={setLoginError}
        landingMode={landingMode}
        setLandingMode={setLandingMode}
        signupForm={signupForm}
        setSignupForm={setSignupForm}
        signupStatus={signupStatus}
        createOnboardingProperty={createOnboardingProperty}
      />
    );
  }

  return (
    <main className="mobile-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">{user.role === "Site Admin" ? "LivingRelay platform" : "Shared URL session"}</span>
          <h1>{user.role === "Site Admin" ? "Site Admin" : activeProperty.name}</h1>
          <p>{user.role === "Site Admin" ? `${user.name} · Internal tool` : `${user.name} · ${user.role}`}</p>
        </div>
        <button className="icon-button" onClick={() => { setSession(null); setSiteAdminToken(""); }} aria-label="Sign out"><LockKeyhole size={18} /></button>
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
        <Metric icon={<ClipboardList />} label="Open" value={metrics.open} />
        <Metric icon={<Bell />} label="Approvals" value={metrics.approvals} />
        <Metric icon={<AlertTriangle />} label="Stale" value={metrics.stale} />
        <Metric icon={<ReceiptText />} label="2026 invoices" value={formatMoney(metrics.invoiceTotal)} />
      </section>}

      {user.role !== "Site Admin" && <DemoModeBanner activeOrder={activeOrder} runFullFlowDemo={runFullFlowDemo} />}

      {user.role === "Site Admin" && (
        <SiteOwnerHero
          accounts={accountsData}
          people={peopleData}
          properties={propertiesData}
          orders={orders}
          billingEvents={billingEventsData}
          stripe={stripeData}
          twilioStatus={twilioStatus}
        />
      )}

      {["Manager", "Owner"].includes(user.role) && (
        <RoleTabs active={adminSection} setActive={setAdminSection} role={user.role} />
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
          auditLog={auditData}
          reloadState={loadState}
          siteAdminToken={siteAdminToken}
          setActivePropertyId={setActivePropertyId}
          setActiveOrderId={setActiveOrderId}
          setAdminSection={setAdminSection}
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
          reloadState={loadState}
          runDemoOutreach={runDemoOutreach}
          selectDemoQuote={selectDemoQuote}
          runFullFlowDemo={runFullFlowDemo}
          createDemoScenario={createDemoScenario}
          nudgeOrder={nudgeOrder}
          nudgeStaleOrders={nudgeStaleOrders}
          updateLiveCall={updateLiveCall}
          bookVendor={bookVendor}
          setAdminSection={setAdminSection}
        />
      )}

      {user.role === "Manager" && adminSection === "billing" && (
        <BillingTab
          property={activeProperty}
          account={accountsData.find((account) => account.id === activeProperty.accountId)}
          people={peopleData}
          invoices={invoices.filter((invoice) => invoice.propertyId === activeProperty.id)}
          orders={visibleOrders}
          billingEvents={billingEventsData.filter((event) => event.propertyId === activeProperty.id)}
          stripe={stripeData}
          reloadState={loadState}
        />
      )}

      {user.role === "Owner" && adminSection !== "billing" && (
        <OwnerView
          property={activeProperty}
          orders={visibleOrders}
          invoices={invoices.filter((invoice) => invoice.propertyId === activeProperty.id)}
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
          invoices={invoices.filter((invoice) => invoice.propertyId === activeProperty.id)}
          orders={visibleOrders}
          billingEvents={billingEventsData.filter((event) => event.propertyId === activeProperty.id)}
          stripe={stripeData}
          reloadState={loadState}
        />
      )}

      {user.role === "Tenant" && (
        <TenantView request={request} setRequest={setRequest} createOrder={createOrder} orders={visibleOrders} />
      )}

      {user.role === "Vendor" && (
        <VendorView orders={visibleOrders.filter((order) => order.vendorId === "v-1")} />
      )}

      {user.role === "Site Admin" ? (
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
          <IntegrationCard icon={<Database />} title="Internal admin isolation" text="Site admin is host-gated to admin.livingrelay.com and protected by password login." />
        </section>
      ) : (
        <section className="integration-strip">
          <IntegrationCard
            icon={<Smartphone />}
            title="Twilio SMS"
            text={twilioStatus?.configured ? `Configured from ${twilioStatus.from}` : "Check local API configuration."}
            status={twilioCheck.message}
            statusTone={twilioCheck.state}
            action={<button className="ghost" onClick={checkTwilio} disabled={twilioCheck.state === "checking"}>{twilioCheck.state === "checking" ? "Checking" : "Check"}</button>}
          />
          <IntegrationCard icon={<CreditCard />} title="Stripe billing" text={stripeData.configured ? "$25 dispatch billing is configured." : `Needed for dispatch fees: ${stripeData.missing?.join(", ") || "Stripe keys"}.`} />
        <IntegrationCard icon={<Banknote />} title="Vendor invoices" text="Vendors are paid directly outside LivingRelay; we track delivery and paid status." />
        </section>
      )}
    </main>
  );
}

function LandingPageUnused({ phone, setPhone, pin, setPin, sitePassword, setSitePassword, siteAdminConsoleAvailable, login, loginCandidate, loginError, loginPeople, setLoginError, landingMode, setLandingMode, signupForm, setSignupForm, signupStatus, createOnboardingProperty }) {
  const updateSignup = (key, value) => setSignupForm((current) => ({ ...current, [key]: value }));

  if (siteAdminConsoleAvailable) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <div className="brand-lock">
            <div className="app-mark"><Wrench size={22} /></div>
            <span>LivingRelay</span>
          </div>
          <h1>Site admin for the LivingRelay platform.</h1>
          <p>This private console is for customer accounts, revenue, support load, usage, logins, and production operations.</p>
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
          />
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
            <span className="hero-kicker">Property maintenance over SMS</span>
            <h1>LivingRelay</h1>
            <p>One shared workspace for managers, owners, and tenants. Tenant texts become triaged work orders, approvals, vendor coordination, and tax-ready records.</p>
            <div className="hero-actions">
              <button className="primary" onClick={() => setLandingMode("create")}><Building2 size={17} /> Create a property</button>
              <button className="secondary" onClick={() => setLandingMode("login")}><LockKeyhole size={17} /> Log into your property</button>
            </div>
          </div>

          <section className="access-panel" aria-label={landingMode === "create" ? "Create a property" : "Log into property"}>
            <div className="mode-switch">
              <button className={landingMode === "login" ? "active" : ""} onClick={() => setLandingMode("login")}>Log in</button>
              <button className={landingMode === "create" ? "active" : ""} onClick={() => setLandingMode("create")}>Create property</button>
            </div>
            {landingMode === "login" ? (
              <>
                <SectionTitle icon={<LockKeyhole />} title="Enter your property" eyebrow="Phone + PIN" />
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
                />
                <div className="pin-grid compact">
                  {loginPeople.slice(0, 4).map((person) => (
                    <button key={person.id} onClick={() => { setPhone(person.phone); setPin(person.pin); setSitePassword(""); setLoginError(""); }}>
                      <strong>{person.role}</strong>
                      <span>{person.pin}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <SectionTitle icon={<Building2 />} title="Create your first property" eyebrow="Self-serve setup" />
                <form className="signup-form" onSubmit={createOnboardingProperty}>
                  <label>Property name<input required value={signupForm.propertyName} onChange={(event) => updateSignup("propertyName", event.target.value)} placeholder="Mar Vista Flats" /></label>
                  <label>Your name<input required value={signupForm.managerName} onChange={(event) => updateSignup("managerName", event.target.value)} placeholder="Jordan Lee" /></label>
                  <label>Phone<input required value={signupForm.managerPhone} onChange={(event) => updateSignup("managerPhone", event.target.value)} placeholder="(310) 555-0100" /></label>
                  <label>PIN<input value={signupForm.pin} onChange={(event) => updateSignup("pin", event.target.value)} inputMode="numeric" placeholder="Auto-generate" /></label>
                  <label>Address<input value={signupForm.address} onChange={(event) => updateSignup("address", event.target.value)} placeholder="11820 Pacific Ave" /></label>
                  <label>Units<input value={signupForm.units} onChange={(event) => updateSignup("units", event.target.value)} placeholder="1, 2A, 3B" /></label>
                  <label className="span-2">Account name<input value={signupForm.accountName} onChange={(event) => updateSignup("accountName", event.target.value)} placeholder="Optional" /></label>
                  <label className="span-2">Your role<select value={signupForm.role} onChange={(event) => updateSignup("role", event.target.value)}><option>Property manager</option><option>Owner</option><option>Owner and property manager</option></select></label>
                  <button className="primary wide" type="submit" disabled={signupStatus.state === "saving"}><ArrowRight size={16} /> {signupStatus.state === "saving" ? "Creating" : "Create property"}</button>
                  {signupStatus.message && <p className={`form-status ${signupStatus.state}`}>{signupStatus.message}</p>}
                </form>
              </>
            )}
          </section>
        </div>
      </section>

      <section className="value-band" id="how-it-works">
        <article><MessageSquare size={22} /><strong>Tenants text once</strong><p>LivingRelay asks follow-ups, captures access notes, and creates a work order.</p></article>
        <article><ShieldCheck size={22} /><strong>Approvals stay clear</strong><p>Managers and owners see estimates, thresholds, invoices, and the full timeline.</p></article>
        <article><Wrench size={22} /><strong>Vendors stay coordinated</strong><p>Send vendor messages, book dispatches, and keep every repair update attached.</p></article>
        <article><FileText size={22} /><strong>Records are tax-ready</strong><p>Invoices and CSV exports stay organized by property and year.</p></article>
      </section>

      <section className="pricing-band" id="pricing">
        <div>
          <span className="eyebrow">Simple pricing</span>
          <h2>No monthly property fee.</h2>
          <p>Start with your property, tenants, owner approvals, and vendor coordination. LivingRelay charges when coordination turns into a booked vendor dispatch.</p>
        </div>
        <article className="price-card">
          <span>Launch price</span>
          <strong>$0/property</strong>
          <p>plus $25 only when a vendor is booked</p>
          <button className="primary wide" onClick={() => setLandingMode("create")}><Building2 size={16} /> Create property</button>
        </article>
      </section>
    </main>
  );
}

function LoginForm({ phone, setPhone, pin, setPin, sitePassword, setSitePassword, login, loginCandidate, loginError }) {
  return (
    <form className="stack" onSubmit={login}>
      <label>
        Phone
        <input value={phone} onChange={(event) => setPhone(event.target.value)} />
      </label>
      <label>
        PIN
        <input value={pin} onChange={(event) => setPin(event.target.value)} inputMode="numeric" />
      </label>
      {loginCandidate?.role === "Site Admin" && (
        <label>
          Site admin password
          <input type="password" value={sitePassword} onChange={(event) => setSitePassword(event.target.value)} autoComplete="current-password" />
        </label>
      )}
      <button className="primary wide" type="submit"><LockKeyhole size={16} /> Enter</button>
      {loginError && <p className="login-error">{loginError}</p>}
    </form>
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
          <h1>Site admin for the LivingRelay platform.</h1>
          <p>This private console is for customer accounts, revenue, support load, usage, logins, and production operations.</p>
          <form className="stack" onSubmit={login}>
            <label>
              Phone
              <input value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            <label>
              PIN
              <input value={pin} onChange={(event) => setPin(event.target.value)} inputMode="numeric" />
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
        <p>{landingMode === "signup" ? "Create a customer account, property, and first manager login." : "Managers, owners, and tenants enter the same place. Phone + PIN decides what they can see and do."}</p>
        <div className="landing-toggle">
          <button className={landingMode === "login" ? "active" : ""} onClick={() => setLandingMode("login")}>Login</button>
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
                <input value={pin} onChange={(event) => setPin(event.target.value)} inputMode="numeric" />
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
            <label>Account name<input required value={signupForm.accountName} onChange={(event) => setSignupForm({ ...signupForm, accountName: event.target.value })} /></label>
            <label>Property name<input required value={signupForm.propertyName} onChange={(event) => setSignupForm({ ...signupForm, propertyName: event.target.value })} /></label>
            <label>Address<input value={signupForm.address} onChange={(event) => setSignupForm({ ...signupForm, address: event.target.value })} /></label>
            <label>Units<input placeholder="2A, 3B, 7C" value={signupForm.units} onChange={(event) => setSignupForm({ ...signupForm, units: event.target.value })} /></label>
            <label>Manager name<input required value={signupForm.managerName} onChange={(event) => setSignupForm({ ...signupForm, managerName: event.target.value })} /></label>
            <label>Manager phone<input required value={signupForm.managerPhone} onChange={(event) => setSignupForm({ ...signupForm, managerPhone: event.target.value })} /></label>
            <button className="primary wide" type="submit" disabled={signupStatus.state === "saving"}><Plus size={16} /> Create property</button>
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
    ["directory", Users, "People"],
    ["properties", Building2, "Properties"],
    ["workOrders", ClipboardList, "Support"],
    ["billing", DollarSign, "Revenue"],
    ["audit", Database, "Audit"]
  ];
  return (
    <nav className="admin-nav" aria-label="Site admin console">
      {items.map(([id, Icon, label]) => (
        <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}>
          <Icon size={16} /> {label}
        </button>
      ))}
    </nav>
  );
}

function SiteOwnerHero({ accounts, people, properties, orders, billingEvents, stripe, twilioStatus }) {
  const openOrders = orders.filter((order) => order.status !== "Closed").length;
  const activeAccounts = accounts.filter((account) => account.status === "Active").length;
  const dispatchRevenue = billingEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
  const ownerUsers = people.filter((person) => person.role === "Owner").length;
  return (
    <section className="owner-console-hero">
      <div>
        <span className="eyebrow">Internal admin</span>
        <h2>Platform command center</h2>
        <p>Track customers, revenue, usage, support load, and production readiness across the whole LivingRelay business.</p>
      </div>
      <div className="owner-signal-grid">
        <MiniRow icon={<LayoutDashboard />} label="Active customers" value={`${activeAccounts}/${accounts.length}`} />
        <MiniRow icon={<DollarSign />} label="Dispatch revenue" value={formatMoney(dispatchRevenue)} />
        <MiniRow icon={<ClipboardList />} label="Open support load" value={openOrders} />
        <MiniRow icon={<Users />} label="Owner users" value={ownerUsers} />
        <MiniRow icon={<CreditCard />} label="Stripe" value={stripe.configured ? "Ready" : "Needs keys"} />
        <MiniRow icon={<Smartphone />} label="Twilio" value={twilioStatus?.configured ? "Ready" : "Needs config"} />
      </div>
    </section>
  );
}

function RoleTabs({ active, setActive, role }) {
  const items = role === "Owner"
    ? [["operations", ShieldCheck, "Approvals"], ["billing", CreditCard, "Billing"]]
    : [["operations", ClipboardList, "Operations"], ["billing", CreditCard, "Billing"]];
  return (
    <nav className="admin-nav" aria-label={`${role} sections`}>
      {items.map(([id, Icon, label]) => (
        <button key={id} className={active === id ? "active" : ""} onClick={() => setActive(id)}>
          <Icon size={16} /> {label}
        </button>
      ))}
    </nav>
  );
}

function AdminConsole({ active, accounts, people, properties, vendors, orders, invoices, billingEvents, auditLog, reloadState, siteAdminToken, setActivePropertyId, setActiveOrderId, setAdminSection }) {
  const billingTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const activeProperties = properties.length;
  const pendingInvoices = invoices.filter((invoice) => !String(invoice.status).toLowerCase().includes("paid")).length;
  const openOrders = orders.filter((order) => order.status !== "Closed").length;
  const dispatchRevenue = billingEvents.reduce((sum, event) => sum + Number(event.amount || 0), 0);
  return (
    <section className="admin-console">
      <div className="admin-overview">
        <Metric icon={<LayoutDashboard />} label="Customer accounts" value={accounts.length} />
        <Metric icon={<DollarSign />} label="Dispatch fees" value={formatMoney(dispatchRevenue)} />
        <Metric icon={<ClipboardList />} label="Open support load" value={openOrders} />
        <Metric icon={<ReceiptText />} label="Repair volume" value={formatMoney(billingTotal)} />
      </div>
      {active === "accounts" && <SiteAccounts accounts={accounts} properties={properties} people={people} orders={orders} invoices={invoices} reloadState={reloadState} siteAdminToken={siteAdminToken} />}
      {active === "directory" && <AdminDirectory people={people} properties={properties} accounts={accounts} reloadState={reloadState} />}
      {active === "properties" && <AdminProperties properties={properties} people={people} accounts={accounts} reloadState={reloadState} setActivePropertyId={setActivePropertyId} setAdminSection={setAdminSection} />}
      {active === "workOrders" && <AdminWorkOrders orders={orders} properties={properties} people={people} vendors={vendors} accounts={accounts} reloadState={reloadState} setActivePropertyId={setActivePropertyId} setActiveOrderId={setActiveOrderId} setAdminSection={setAdminSection} />}
      {active === "billing" && <AdminBilling accounts={accounts} properties={properties} invoices={invoices} billingEvents={billingEvents} activeProperties={activeProperties} pendingInvoices={pendingInvoices} reloadState={reloadState} />}
      {active === "audit" && <AdminAudit auditLog={auditLog} />}
    </section>
  );
}

function SiteAccounts({ accounts, properties, people, orders, invoices, reloadState, siteAdminToken }) {
  const [form, setForm] = useState({ name: "", status: "Trial", plan: "$0/property + $25 vendor dispatch", stripeCustomerId: "", billingPayerRole: "Owner" });

  async function createAccount(event) {
    event.preventDefault();
    await fetch("/api/site-admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${siteAdminToken}` },
      body: JSON.stringify(form)
    });
    setForm({ name: "", status: "Trial", plan: "$0/property + $25 vendor dispatch", stripeCustomerId: "", billingPayerRole: "Owner" });
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
                  <p>{account.plan} · Default payer: {account.billingPayerRole || "Owner"} · {account.billingSetupStatus || (account.stripeCustomerId ? "Card on file" : "Needs card")}</p>
                  <p>{accountProperties.length} properties · {accountPeople.length} users · {accountOrders.length} work orders · {formatMoney(invoiceTotal)} vendor invoices</p>
                </div>
                <div className="record-actions">
                  <button className="ghost" onClick={() => updateAccount(account, { status: "Active" })}><Check size={15} /> Active</button>
                  <button className="ghost" onClick={() => updateAccount(account, { status: "Suspended" })}><AlertTriangle size={15} /> Suspend</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<Plus />} title="Create customer account" eyebrow="Owner action" />
        <form className="admin-form" onSubmit={createAccount}>
          <label>Account name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Trial</option><option>Active</option><option>Past due</option><option>Suspended</option></select></label>
          <label>Default payer<select value={form.billingPayerRole} onChange={(event) => setForm({ ...form, billingPayerRole: event.target.value })}><option>Owner</option><option>Property manager</option></select></label>
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
        <SectionTitle icon={<Plus />} title="Invite or create user" eyebrow="Owner action" />
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
          <label>{form.role === "Vendor" ? "Trade" : "Unit"}<input value={form.role === "Vendor" ? form.trade : form.unit} onChange={(event) => form.role === "Vendor" ? setForm({ ...form, trade: event.target.value }) : setForm({ ...form, unit: event.target.value })} /></label>
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
    units: "",
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
    setForm({ ...form, name: "", address: "", units: "" });
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
                <p>{property.units?.length || 0} units · {property.plan} · Payer: {property.billingPayerRole || "Owner"}</p>
              </div>
              <div className="record-actions">
                <button className="ghost" onClick={() => { setActivePropertyId(property.id); setAdminSection("operations"); }}><ChevronRight size={15} /> Open</button>
                <button className="ghost" onClick={() => { setActivePropertyId(property.id); setAdminSection("billing"); }}><CreditCard size={15} /> Billing</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<Plus />} title="Register customer property" eyebrow="Owner action" />
        <p className="form-note">Adding tenants, owners, or managers here saves their role and phone number. LivingRelay does not text them immediately; after setup is launched, they receive a role-specific message explaining that they were added and what to do next.</p>
        {setupNotice && <p className="billing-alert">{setupNotice}</p>}
        <form className="admin-form" onSubmit={createProperty}>
          <label>Name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Account<select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</select></label>
          <label>Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <label>Units<input placeholder="A, B, 101" value={form.units} onChange={(event) => setForm({ ...form, units: event.target.value })} /></label>
          <label>Manager<select value={form.adminId} onChange={(event) => setForm({ ...form, adminId: event.target.value })}>{people.filter((person) => person.role === "Manager").map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
          <label>Owner<select value={form.ownerId} onChange={(event) => setForm({ ...form, ownerId: event.target.value })}>{people.filter((person) => person.role === "Owner").map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
          <label>Your role<select value={form.creatorRole} onChange={(event) => setForm({ ...form, creatorRole: event.target.value })}><option>Property manager</option><option>Owner</option><option>Owner and property manager</option></select></label>
          <label>Who pays dispatch fees?<select value={form.billingPayerRole} onChange={(event) => setForm({ ...form, billingPayerRole: event.target.value })}><option>Owner</option><option>Property manager</option></select></label>
          <button className="primary wide" type="submit"><Building2 size={16} /> Create property</button>
        </form>
      </section>
    </div>
  );
}

function AdminWorkOrders({ orders, properties, people, vendors, accounts, reloadState, setActivePropertyId, setActiveOrderId, setAdminSection }) {
  const [form, setForm] = useState({ propertyId: properties[0]?.id || "", unit: properties[0]?.units?.[0] || "", tenantId: "", trade: "General", severity: "Normal", status: "Manager review", estimate: "", vendorId: "", issue: "", access: "" });
  const selectedProperty = properties.find((property) => property.id === form.propertyId) || properties[0];

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
          columns={["ID", "Account", "Property", "Unit", "Trade", "Status", "Estimate"]}
          rows={orders.map((order) => [
            <button className="link-button" onClick={() => { setActivePropertyId(order.propertyId); setActiveOrderId(order.id); setAdminSection("operations"); }}>{order.id}</button>,
            accounts.find((account) => account.id === properties.find((property) => property.id === order.propertyId)?.accountId)?.name || "Unassigned",
            properties.find((property) => property.id === order.propertyId)?.name || order.propertyId,
            order.unit,
            order.trade,
            order.status,
            formatMoney(Number(order.estimate || 0))
          ])}
        />
      </section>
      <section className="panel">
        <SectionTitle icon={<Plus />} title="Create customer issue" eyebrow="Support action" />
        <form className="admin-form" onSubmit={createWorkOrder}>
          <label>Property<select value={form.propertyId} onChange={(event) => setForm({ ...form, propertyId: event.target.value, unit: properties.find((property) => property.id === event.target.value)?.units?.[0] || "" })}>{properties.map((property) => <option value={property.id} key={property.id}>{accounts.find((account) => account.id === property.accountId)?.name || "Account"} · {property.name}</option>)}</select></label>
          <label>Unit<input value={form.unit} list="admin-unit-options" onChange={(event) => setForm({ ...form, unit: event.target.value })} /><datalist id="admin-unit-options">{selectedProperty?.units?.map((unit) => <option value={unit} key={unit} />)}</datalist></label>
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

function AdminManagerView({ property, orders, invoices, activeOrder, setActiveOrderId, patchOrder, addInvoice, sendSms, sendStatus, people, vendors, auditLog, staleOrders, demoScenarios, demoStatus, reloadState, runDemoOutreach, selectDemoQuote, runFullFlowDemo, createDemoScenario, nudgeOrder, nudgeStaleOrders, updateLiveCall, bookVendor, setAdminSection }) {
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
          <MiniRow icon={<Home />} label="Units" value={property.units.join(", ")} />
          <MiniRow icon={<Wrench />} label="Rules" value={property.rules} />
        </div>
        <AdminTools property={property} people={people} vendors={vendors} auditLog={auditLog} reloadState={reloadState} />
        <StaleNudgePanel
          staleOrders={staleOrders}
          setActiveOrderId={setActiveOrderId}
          nudgeOrder={nudgeOrder}
          nudgeStaleOrders={nudgeStaleOrders}
        />
        <DemoControlCenter
          people={people}
          scenarios={demoScenarios}
          demoStatus={demoStatus}
          createDemoScenario={createDemoScenario}
        />
      </div>

      <div className="panel">
        <SectionTitle icon={<MessageSquare />} title="SMS work orders" eyebrow="Manager desk" />
        <div className="order-tabs">
          {orders.map((order) => (
            <button key={order.id} className={order.id === activeOrder.id ? "active" : ""} onClick={() => setActiveOrderId(order.id)}>
              <strong>{order.unit}</strong>
              <span>{order.status}</span>
            </button>
          ))}
        </div>
        <article className="work-card">
          <div className="work-head">
            <div>
              <span className="eyebrow">{activeOrder.id}</span>
              <h2>{activeOrder.trade} · Unit {activeOrder.unit}</h2>
            </div>
            <span className={`pill ${activeOrder.severity === "Urgent" ? "urgent" : ""}`}>{activeOrder.severity}</span>
          </div>
          <p>{activeOrder.issue}</p>
          <div className="decision-grid">
            <MiniRow icon={<Bot />} label="AI summary" value={`${activeOrder.trade}, ${formatMoney(activeOrder.estimate)}, suggested ${vendor?.name}`} />
            <MiniRow icon={<Phone />} label="Tenant access" value={activeOrder.access} />
            <MiniRow icon={<Wrench />} label="Vendor SMS" value={`Send scope to ${vendor?.phone}: ${activeOrder.issue}`} />
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
              sendSms?.(vendor?.phone, `${activeOrder.id}: ${activeOrder.trade} job at ${property.name}, Unit ${activeOrder.unit}. Issue: ${activeOrder.issue}. Reply ACCEPT or DECLINE.`);
            }}>
              <Send size={16} /> Book vendor
            </button>
            <button className="ghost" onClick={() => addInvoice(activeOrder)}>
              <ReceiptText size={16} /> Create invoice
            </button>
            <button className="ghost" onClick={() => runDemoOutreach(activeOrder.id)}>
              <Bot size={16} /> Demo outreach
            </button>
            <button className="ghost" onClick={() => runFullFlowDemo(activeOrder.id)}>
              <SparkleIcon /> Full demo
            </button>
            <button className="ghost" onClick={() => nudgeOrder(activeOrder.id)}>
              <AlertTriangle size={16} /> Nudge
            </button>
          </div>
          {sendStatus && <p className="send-status">{sendStatus}</p>}
        </article>
        <TroubleshootingPanel order={activeOrder} />
        <LiveCallPanel order={activeOrder} updateLiveCall={updateLiveCall} />
        <DemoOutreachPanel order={activeOrder} selectDemoQuote={selectDemoQuote} />
        <FullFlowPanel order={activeOrder} />
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

function AdminTools({ property, people, vendors, auditLog, reloadState }) {
  const [personForm, setPersonForm] = useState({ name: "", role: "Tenant", phone: "", unit: property.units[0] || "", trade: "Plumbing" });
  const [vendorForm, setVendorForm] = useState({ name: "", trade: "Plumbing", phone: "" });
  const notifyPeople = people.filter((person) => ["Manager", "Owner"].includes(person.role));

  async function addPerson(event) {
    event.preventDefault();
    await fetch("/api/admin/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...personForm, propertyId: property.id })
    });
    setPersonForm({ name: "", role: "Tenant", phone: "", unit: property.units[0] || "", trade: "Plumbing" });
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

  async function updateNotify(person, key, value) {
    await fetch(`/api/people/${person.id}/notify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value })
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
        <select value={personForm.role} onChange={(event) => setPersonForm({ ...personForm, role: event.target.value })}>
          <option>Tenant</option>
          <option>Owner</option>
          <option>Vendor</option>
        </select>
        <input placeholder="Unit or trade" value={personForm.role === "Vendor" ? personForm.trade : personForm.unit} onChange={(event) => personForm.role === "Vendor" ? setPersonForm({ ...personForm, trade: event.target.value }) : setPersonForm({ ...personForm, unit: event.target.value })} />
        <button className="secondary" type="submit"><Plus size={15} /> Add person</button>
      </form>

      <form className="compact-form" onSubmit={addVendor}>
        <input placeholder="Vendor" value={vendorForm.name} onChange={(event) => setVendorForm({ ...vendorForm, name: event.target.value })} />
        <input placeholder="Trade" value={vendorForm.trade} onChange={(event) => setVendorForm({ ...vendorForm, trade: event.target.value })} />
        <input placeholder="Phone" value={vendorForm.phone} onChange={(event) => setVendorForm({ ...vendorForm, phone: event.target.value })} />
        <button className="secondary" type="submit"><Wrench size={15} /> Add vendor</button>
      </form>

      <h3>Notifications</h3>
      {notifyPeople.map((person) => (
        <div className="notify-row" key={person.id}>
          <strong>{person.name}</strong>
          {[
            ["tenantReports", "Tenant reports"],
            ["everyUpdate", "Every update"],
            ["keyUpdates", "Key updates"]
          ].map(([key, label]) => (
            <label className="check-row" key={key}>
              <input type="checkbox" checked={person.notify?.[key] !== false && (key !== "everyUpdate" || person.notify?.everyUpdate === true)} onChange={(event) => updateNotify(person, key, event.target.checked)} />
              {label}
            </label>
          ))}
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
              <span>{order.id} · Unit {order.unit} · {order.hoursIdle ?? "?"}h idle</span>
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
  if (!calls.length) {
    return (
      <div className="live-call-panel empty">
        <strong>Live vendor calls</strong>
        <span>Run demo outreach or ElevenLabs vendor calls to monitor conversations here.</span>
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
              <button className="ghost" onClick={() => updateLiveCall(order.id, call.id, "takeover")}>
                <UserRound size={15} /> Take over
              </button>
            </div>
            {call.monitorUrl && <span className="monitor-url">ElevenLabs monitor ready</span>}
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
    setStatus(kind === "portal" ? "Opening Stripe billing portal..." : "Preparing Stripe setup...");
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
    setStatus(data.error || "Stripe is not configured yet.");
  }

  return (
    <section className="split-view">
      <div className="panel">
        <SectionTitle icon={<CreditCard />} title="Billing" eyebrow={property.name} />
        {!billingReady && (
          <div className="billing-required">
            <span className="eyebrow">Card required</span>
            <h3>Save billing before tenant SMS goes live</h3>
            <p>Properties are free to add, but LivingRelay needs a card on file now so the $25 coordination fee can be collected if vendor dispatch is booked later.</p>
            <div className="button-grid">
              <button className="primary" onClick={() => startBillingSession("setup")}><CreditCard size={16} /> Add card</button>
              <button className="ghost" onClick={() => setStatus("Skipped for now. If a tenant reports an issue before billing is complete, we will text the account manager to finish setup before vendor dispatch.")}>Skip for now</button>
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
          <span className="eyebrow">Default payer</span>
          <h3>{payerRole}</h3>
          <p>{payer?.name || "No payer selected"} pays only the LivingRelay coordination fee. Vendor repair invoices are sent to the property manager and paid directly to the vendor outside the app.</p>
          <div className="button-grid">
            <button className={payerRole === "Owner" ? "primary" : "ghost"} onClick={() => updatePayer("Owner")}><UserRound size={16} /> Owner pays</button>
            <button className={payerRole === "Property manager" ? "primary" : "ghost"} onClick={() => updatePayer("Property manager")}><Users size={16} /> Manager pays</button>
          </div>
        </div>
        <div className="payer-card">
          <span className="eyebrow">Stripe</span>
          <h3>{billingReady ? "Card on file" : billingSetupStatus}</h3>
          <p>{stripe.configured ? `Customer ${account?.stripeCustomerId || "will be created automatically"}` : `Needed: ${stripe.missing?.join(", ") || "Stripe keys and app URL"}`}</p>
          <div className="button-grid">
            <button className="secondary" onClick={() => startBillingSession("setup")}><CreditCard size={16} /> Save payment method</button>
            <button className="ghost" onClick={() => startBillingSession("portal")}><ArrowRight size={16} /> Billing portal</button>
          </div>
          {status && <p className="send-status">{status}</p>}
        </div>
      </div>
      <div className="panel">
        <SectionTitle icon={<ReceiptText />} title="Dispatch ledger" eyebrow="$25 coordination fee" />
        {billingEvents.map((event) => <BillingEventRow key={event.id} event={event} />)}
        {!billingEvents.length && <p className="empty-copy">No dispatch fees yet. LLM advice, tenant intake, and property setup do not create a charge.</p>}
        <SectionTitle icon={<Banknote />} title="Vendor invoices" eyebrow="Direct vendor payment" />
        {invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} onPaid={() => {}} />)}
      </div>
    </section>
  );
}

function OwnerView({ property, orders, invoices, patchInvoice }) {
  const [taxSummary, setTaxSummary] = useState(null);
  const [taxYear, setTaxYear] = useState("2026");

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

  return (
    <section className="split-view">
      <div className="panel">
        <SectionTitle icon={<ShieldCheck />} title="Owner approvals" eyebrow={property.name} />
        {orders.filter((order) => order.status === "Owner approval").map((order) => (
          <article className="approval-card" key={order.id}>
            <span className="eyebrow">{order.id} · Unit {order.unit}</span>
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
          year={taxYear}
          setYear={setTaxYear}
          summary={taxSummary}
          emailBundle={emailBundle}
        />
        {invoices.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} onPaid={() => patchInvoice(invoice.id, "Paid")} />
        ))}
      </div>
    </section>
  );
}

function TaxPacketPanel({ property, year, setYear, summary, emailBundle }) {
  const spreadsheetUrl = `/api/properties/${property.id}/tax-spreadsheet.csv?year=${year}`;
  return (
    <div className="tax-panel">
      <div className="tax-head">
        <div>
          <span className="eyebrow">Owner tax packet</span>
          <h3>{formatMoney(summary?.totalExpenses || 0)} deductible expenses</h3>
        </div>
        <select value={year} onChange={(event) => setYear(event.target.value)}>
          <option>2026</option>
          <option>2025</option>
          <option>2024</option>
        </select>
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
      <div className="button-grid">
        <a className="secondary" href={spreadsheetUrl}>
          <Download size={16} /> Spreadsheet
        </a>
        <button className="ghost" onClick={emailBundle}>
          <FileText size={16} /> Build packet
        </button>
      </div>
    </div>
  );
}

function TenantView({ request, setRequest, createOrder, orders }) {
  return (
    <section className="split-view">
      <div className="panel">
        <SectionTitle icon={<Home />} title="Report an issue" eyebrow="Tenant mobile web" />
        <form className="stack" onSubmit={createOrder}>
          <label>
            Unit
            <input value={request.unit} onChange={(event) => setRequest({ ...request, unit: event.target.value })} />
          </label>
          <label>
            What is happening?
            <textarea rows="5" value={request.issue} onChange={(event) => setRequest({ ...request, issue: event.target.value })} placeholder="Example: water is leaking under the kitchen sink" />
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
        {orders.map((order) => (
          <article className="update-card" key={order.id}>
            <span className="eyebrow">{order.id} · {order.status}</span>
            <p>{order.issue}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function VendorView({ orders }) {
  return (
    <section className="panel">
      <SectionTitle icon={<Wrench />} title="Vendor jobs" eyebrow="SMS accepting flow" />
      {orders.map((order) => (
        <article className="approval-card" key={order.id}>
          <span className="eyebrow">{order.id} · Unit {order.unit}</span>
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
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionTitle({ icon, eyebrow, title }) {
  return (
    <div className="section-title">
      <div className="section-icon">{icon}</div>
      <div>
        <span className="eyebrow">{eyebrow}</span>
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
  return (
    <article className="invoice-row">
      <div>
        <span className="eyebrow">{invoice.orderId} · {invoice.receivedAt} · {invoice.paymentRail || "Vendor direct"}</span>
        <h3>{invoice.vendor}</h3>
        <p>{invoice.note}</p>
        <p className="invoice-recipient">Invoice to {invoice.recipientName || "property manager"}{invoice.recipientEmail ? ` · ${invoice.recipientEmail}` : ""}{invoice.recipientPhone ? ` · ${invoice.recipientPhone}` : ""}</p>
      </div>
      <div className="invoice-side">
        <strong>{formatMoney(invoice.amount)}</strong>
        <span>{invoice.paymentStatus || invoice.status}</span>
        <button className="ghost" onClick={onPaid} disabled={paid}><Check size={15} /> Paid</button>
      </div>
    </article>
  );
}

function BillingEventRow({ event }) {
  return (
    <article className="invoice-row">
      <div>
        <span className="eyebrow">{event.orderId || "Setup"} · {event.payerRole || "Owner"}</span>
        <h3>Vendor dispatch coordination</h3>
        <p>{event.note || "Charged only when LivingRelay books vendor coordination."}</p>
      </div>
      <div className="invoice-side">
        <strong>{formatMoney(Number(event.amount || 0))}</strong>
        <span>{event.status}</span>
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

const rootElement = document.getElementById("root");
const root = globalThis.__livingRelayRoot || createRoot(rootElement);
globalThis.__livingRelayRoot = root;
root.render(<App />);
