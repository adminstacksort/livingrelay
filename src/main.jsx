import React, { useMemo, useState } from "react";
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
  Download,
  FileText,
  Home,
  LockKeyhole,
  MessageSquare,
  Phone,
  Plus,
  ReceiptText,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
  Wrench
} from "lucide-react";
import "./styles.css";

const people = [
  { id: "admin-1", name: "Jordan Lee", role: "Admin", phone: "(310) 555-0100", pin: "1111", propertyIds: ["p-1", "p-2"] },
  { id: "pm-1", name: "Sam Rivera", role: "Manager", phone: "(310) 555-0101", pin: "2222", propertyIds: ["p-1"] },
  { id: "owner-1", name: "Priya Shah", role: "Owner", phone: "(310) 555-0102", pin: "3333", propertyIds: ["p-1"] },
  { id: "tenant-1", name: "Maya Chen", role: "Tenant", phone: "(310) 555-0103", pin: "4444", propertyIds: ["p-1"], unit: "3B" },
  { id: "vendor-1", name: "Carlos Plumbing", role: "Vendor", phone: "(310) 555-0104", pin: "5555", propertyIds: ["p-1"], trade: "Plumbing" }
];

const properties = [
  {
    id: "p-1",
    name: "Mar Vista Flats",
    address: "11820 Pacific Ave, Los Angeles, CA",
    subscription: "Active",
    plan: "$149/mo base + $39/property",
    units: ["2A", "3B", "7C"],
    ownerId: "owner-1",
    adminId: "admin-1",
    rules: "Plumbing under $300 goes to Carlos first. Unit 3B needs owner approval above $150. HVAC always requires manager review. Emergencies: active water, gas smell, sparking, no lock."
  },
  {
    id: "p-2",
    name: "Hilltop Duplex",
    address: "420 Ridge Lane, Pasadena, CA",
    subscription: "Trial needs payment",
    plan: "Payment required before tenant SMS goes live",
    units: ["A", "B"],
    ownerId: "owner-1",
    adminId: "admin-1",
    rules: "All dispatches need admin review until vendors are configured."
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
    status: "Awaiting owner approval",
    taxYear: "2026",
    receivedAt: "Apr 30",
    note: "Estimate only. Payment will happen off platform."
  },
  {
    id: "inv-2",
    propertyId: "p-1",
    orderId: "WO-2409",
    vendor: "Nova HVAC",
    amount: 210,
    status: "Paid off platform",
    taxYear: "2026",
    receivedAt: "Apr 12",
    note: "Spring service call."
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

function classifyIssue(text) {
  const body = text.toLowerCase();
  const trade = body.includes("water") || body.includes("sink") || body.includes("toilet") || body.includes("leak")
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
  const [phone, setPhone] = useState("(310) 555-0100");
  const [pin, setPin] = useState("1111");
  const [activePropertyId, setActivePropertyId] = useState("p-1");
  const [orders, setOrders] = useState(seedOrders);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [activeOrderId, setActiveOrderId] = useState(seedOrders[0].id);
  const [request, setRequest] = useState(defaultRequest);
  const activeProperty = properties.find((property) => property.id === activePropertyId) || properties[0];
  const visibleOrders = orders.filter((order) => order.propertyId === activeProperty.id);
  const activeOrder = visibleOrders.find((order) => order.id === activeOrderId) || visibleOrders[0];
  const user = session ? people.find((person) => person.id === session.userId) : null;

  function login(event) {
    event.preventDefault();
    const normalized = phone.replace(/\D/g, "");
    const match = people.find((person) => person.phone.replace(/\D/g, "").endsWith(normalized.slice(-10)) && person.pin === pin);
    if (!match) return;
    setSession({ userId: match.id });
    setActivePropertyId(match.propertyIds[0]);
  }

  function createOrder(event) {
    event.preventDefault();
    const triage = classifyIssue(request.issue);
    const tenant = people.find((person) => person.id === "tenant-1");
    const vendor = vendors.find((item) => item.trade === triage.trade) || vendors[0];
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

  function addInvoice(order) {
    const id = `inv-${invoices.length + 1}`;
    setInvoices((current) => [
      {
        id,
        propertyId: order.propertyId,
        orderId: order.id,
        vendor: vendors.find((vendor) => vendor.id === order.vendorId)?.name || "Vendor",
        amount: order.estimate,
        status: "Sent to owner",
        taxYear: "2026",
        receivedAt: "Today",
        note: "Generated from approved estimate. Payment remains off platform."
      },
      ...current
    ]);
    patchOrder({ invoiceId: id }, "Invoice record created", "Owner can view this invoice and mark off-platform payment later.");
  }

  const metrics = useMemo(() => {
    const open = visibleOrders.filter((order) => order.status !== "Closed").length;
    const approvals = visibleOrders.filter((order) => order.status.includes("approval") || order.status === "Manager review").length;
    const invoiceTotal = invoices
      .filter((invoice) => invoice.propertyId === activeProperty.id)
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    return { open, approvals, invoiceTotal };
  }, [activeProperty.id, invoices, visibleOrders]);

  if (!session) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <div className="brand-lock">
            <div className="app-mark"><Wrench size={22} /></div>
            <span>LivingRelay</span>
          </div>
          <h1>One URL. Role-specific PIN access.</h1>
          <p>Property managers, owners, tenants, and vendors enter the same place. Phone + PIN decides what they can see and do.</p>
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
          </form>
          <div className="pin-grid">
            {people.map((person) => (
              <button key={person.id} onClick={() => { setPhone(person.phone); setPin(person.pin); }}>
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
    <main className="mobile-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Shared URL session</span>
          <h1>{activeProperty.name}</h1>
          <p>{user.name} · {user.role}</p>
        </div>
        <button className="icon-button" onClick={() => setSession(null)} aria-label="Sign out"><LockKeyhole size={18} /></button>
      </header>

      <section className="property-switcher">
        {properties
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
      </section>

      <section className="mobile-metrics">
        <Metric icon={<ClipboardList />} label="Open" value={metrics.open} />
        <Metric icon={<Bell />} label="Approvals" value={metrics.approvals} />
        <Metric icon={<ReceiptText />} label="2026 invoices" value={formatMoney(metrics.invoiceTotal)} />
      </section>

      {(user.role === "Admin" || user.role === "Manager") && (
        <AdminManagerView
          property={activeProperty}
          orders={visibleOrders}
          invoices={invoices}
          activeOrder={activeOrder}
          setActiveOrderId={setActiveOrderId}
          patchOrder={patchOrder}
          addInvoice={addInvoice}
        />
      )}

      {user.role === "Owner" && (
        <OwnerView
          property={activeProperty}
          orders={visibleOrders}
          invoices={invoices.filter((invoice) => invoice.propertyId === activeProperty.id)}
          patchInvoice={(invoiceId, status) => setInvoices((current) => current.map((invoice) => invoice.id === invoiceId ? { ...invoice, status } : invoice))}
        />
      )}

      {user.role === "Tenant" && (
        <TenantView request={request} setRequest={setRequest} createOrder={createOrder} orders={visibleOrders} />
      )}

      {user.role === "Vendor" && (
        <VendorView orders={visibleOrders.filter((order) => order.vendorId === "v-1")} />
      )}

      <section className="integration-strip">
        <IntegrationCard icon={<Smartphone />} title="Twilio SMS" text="Ready for inbound/outbound webhooks once credentials are added." />
        <IntegrationCard icon={<CreditCard />} title="Stripe billing" text="Subscription gate for property profiles; payments not required for repairs." />
        <IntegrationCard icon={<Banknote />} title="Off-platform repair payment" text="Owners mark invoices paid and export bundles for taxes." />
      </section>
    </main>
  );
}

function AdminManagerView({ property, orders, invoices, activeOrder, setActiveOrderId, patchOrder, addInvoice }) {
  const vendor = vendors.find((item) => item.id === activeOrder.vendorId);
  return (
    <section className="split-view">
      <div className="panel">
        <SectionTitle icon={<Settings2 />} title="Property setup" eyebrow="Admin controls" />
        <div className="subscription-card">
          <div>
            <span className="eyebrow">Subscription</span>
            <h3>{property.subscription}</h3>
            <p>{property.plan}</p>
          </div>
          <button className="secondary"><CreditCard size={16} /> Manage billing</button>
        </div>
        <div className="people-list">
          <MiniRow icon={<Users />} label="Admin" value="Jordan Lee · (310) 555-0100" />
          <MiniRow icon={<UserRound />} label="Owner" value="Priya Shah · (310) 555-0102" />
          <MiniRow icon={<Home />} label="Units" value={property.units.join(", ")} />
          <MiniRow icon={<Wrench />} label="Rules" value={property.rules} />
        </div>
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
            <button className="secondary" onClick={() => patchOrder({ status: "Vendor scheduled" }, "Vendor text sent", `${vendor?.name} received scope and access notes.`)}>
              <Send size={16} /> Text vendor
            </button>
            <button className="ghost" onClick={() => addInvoice(activeOrder)}>
              <ReceiptText size={16} /> Create invoice
            </button>
          </div>
        </article>
        <Timeline items={activeOrder.timeline} />
      </div>
    </section>
  );
}

function OwnerView({ property, orders, invoices, patchInvoice }) {
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
        <SectionTitle icon={<ReceiptText />} title="Invoices and tax bundle" eyebrow="Off-platform payments" />
        {invoices.map((invoice) => (
          <InvoiceRow key={invoice.id} invoice={invoice} onPaid={() => patchInvoice(invoice.id, "Paid off platform")} />
        ))}
        <button className="secondary wide"><Download size={16} /> Email 2026 bundle</button>
      </div>
    </section>
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
  return (
    <article className="invoice-row">
      <div>
        <span className="eyebrow">{invoice.orderId} · {invoice.receivedAt}</span>
        <h3>{invoice.vendor}</h3>
        <p>{invoice.note}</p>
      </div>
      <div className="invoice-side">
        <strong>{formatMoney(invoice.amount)}</strong>
        <span>{invoice.status}</span>
        <button className="ghost" onClick={onPaid}><Check size={15} /> Paid</button>
      </div>
    </article>
  );
}

function IntegrationCard({ icon, title, text }) {
  return (
    <div className="integration-card">
      <div>{icon}</div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
