import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Home,
  MessageSquare,
  Mic,
  PhoneCall,
  Plus,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  X
} from "lucide-react";
import "./styles.css";

const vendors = [
  { id: "carlos", name: "Carlos Plumbing", trade: "Plumbing", phone: "(323) 555-0142", eta: "Today, 2-5 PM", rate: "$145 callout" },
  { id: "westside", name: "Westside Plumbing", trade: "Plumbing", phone: "(323) 555-0188", eta: "Tomorrow AM", rate: "$120 callout" },
  { id: "nova", name: "Nova HVAC", trade: "HVAC", phone: "(424) 555-0195", eta: "Today, 4-6 PM", rate: "$165 callout" },
  { id: "spark", name: "Spark Right Electric", trade: "Electrical", phone: "(310) 555-0119", eta: "Tomorrow, 10-1 PM", rate: "$155 callout" },
  { id: "keyline", name: "Keyline Lock & Door", trade: "Locks", phone: "(213) 555-0171", eta: "Within 2 hours", rate: "$95 callout" },
  { id: "apex", name: "Apex Appliance", trade: "Appliance", phone: "(626) 555-0148", eta: "Thursday", rate: "$110 callout" },
  { id: "handy", name: "Handy General Repairs", trade: "General", phone: "(818) 555-0164", eta: "Tomorrow PM", rate: "$85 callout" }
];

const defaultRules = `For plumbing under $300, use Carlos Plumbing first, then Westside Plumbing.
For HVAC, ask me before dispatch.
For Unit 3B, owner approval is needed above $150.
If there is active water, gas smell, sparking, no heat, no AC in heat wave, or no lock, treat as urgent.
For locks, use Keyline Lock & Door.
For electrical, use Spark Right Electric.
For appliance issues, use Apex Appliance.`;

const samples = [
  {
    tenant: "Maya Chen",
    unit: "3B",
    issue: "Water is dripping from under the kitchen sink and the cabinet floor is wet. I put a bowl under it but it is still leaking.",
    access: "Anytime after 1 PM. Please text before entering.",
    photos: "sink-leak.jpg"
  },
  {
    tenant: "Andre Miles",
    unit: "2A",
    issue: "The bedroom outlet sparked when I plugged in my lamp and now the lights in that room are out.",
    access: "I am home today until 6 PM.",
    photos: ""
  },
  {
    tenant: "Lina Patel",
    unit: "7C",
    issue: "The dishwasher runs but water stays pooled at the bottom after the cycle.",
    access: "Tuesday or Thursday morning works best.",
    photos: "dishwasher.jpg"
  }
];

function nowStamp() {
  return new Date().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function classifyIssue(text) {
  const body = text.toLowerCase();
  const matches = [
    { trade: "Plumbing", words: ["leak", "sink", "toilet", "pipe", "water", "drain", "faucet"] },
    { trade: "HVAC", words: ["heat", "ac", "air conditioning", "furnace", "thermostat"] },
    { trade: "Electrical", words: ["outlet", "spark", "breaker", "light", "electrical", "power"] },
    { trade: "Locks", words: ["lock", "key", "door", "stuck", "entry"] },
    { trade: "Appliance", words: ["fridge", "dishwasher", "washer", "dryer", "oven", "stove"] }
  ];
  const hit = matches.find((item) => item.words.some((word) => body.includes(word)));
  const urgentWords = ["active water", "leak", "gas", "spark", "no heat", "no ac", "flood", "lock", "cannot enter", "sewage"];
  const urgent = urgentWords.some((word) => body.includes(word));
  const severity = urgent ? "Urgent" : body.length > 160 ? "Medium" : "Normal";
  return {
    trade: hit?.trade || "General",
    severity,
    confidence: hit ? (urgent ? 94 : 88) : 71
  };
}

function estimateCost(trade, severity) {
  const base = {
    Plumbing: 260,
    HVAC: 420,
    Electrical: 310,
    Locks: 145,
    Appliance: 225,
    General: 175
  }[trade];
  return severity === "Urgent" ? Math.round(base * 1.25) : base;
}

function chooseVendor(trade, rulesText) {
  const lower = rulesText.toLowerCase();
  const tradeVendors = vendors.filter((vendor) => vendor.trade === trade);
  const named = vendors.find((vendor) => lower.includes(vendor.name.toLowerCase()) && vendor.trade === trade);
  return named || tradeVendors[0] || vendors.find((vendor) => vendor.trade === "General");
}

function needsOwnerApproval(unit, estimate, rulesText) {
  const lower = rulesText.toLowerCase();
  if (unit.toLowerCase() === "3b" && estimate > 150 && lower.includes("unit 3b")) return true;
  const approvalMatch = lower.match(/owner approval.*?\$?(\d+)/);
  return approvalMatch ? estimate > Number(approvalMatch[1]) : estimate > 500;
}

function createWorkOrder(form, rulesText) {
  const triage = classifyIssue(form.issue);
  const estimate = estimateCost(triage.trade, triage.severity);
  const vendor = chooseVendor(triage.trade, rulesText);
  const ownerApproval = needsOwnerApproval(form.unit, estimate, rulesText);
  return {
    id: `WO-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: nowStamp(),
    status: "Manager review",
    tenant: form.tenant,
    unit: form.unit,
    issue: form.issue,
    access: form.access,
    photos: form.photos,
    triage,
    estimate,
    vendor,
    ownerApproval,
    managerApproved: false,
    ownerApproved: false,
    tenantMessage: `Thanks, ${form.tenant.split(" ")[0] || "there"}. We received your ${triage.trade.toLowerCase()} request for Unit ${form.unit}. The manager is reviewing it now and we will keep this thread updated.`,
    managerMessage: `New ${triage.severity.toLowerCase()} ${triage.trade.toLowerCase()} request in Unit ${form.unit}. Estimated cost is about $${estimate}. Suggested vendor: ${vendor.name}. Tenant access: ${form.access || "not provided"}.`,
    ownerMessage: `Approval requested for Unit ${form.unit}: ${triage.Trade || triage.trade} repair estimated at $${estimate}. Issue: ${form.issue}`,
    vendorMessage: `Hi ${vendor.name}, can you take a ${triage.severity.toLowerCase()} ${triage.trade.toLowerCase()} job at Unit ${form.unit}? Tenant reports: "${form.issue}" Access notes: ${form.access || "not provided"}. Please confirm earliest slot and rough estimate.`,
    timeline: [
      { label: "Tenant submitted request", detail: `Unit ${form.unit} via intake page`, stamp: nowStamp() },
      { label: "AI triaged issue", detail: `${triage.trade}, ${triage.severity}, ${triage.confidence}% confidence`, stamp: nowStamp() },
      { label: "Manager review requested", detail: `Suggested ${vendor.name}; estimate $${estimate}`, stamp: nowStamp() }
    ]
  };
}

function App() {
  const [rules, setRules] = useState(defaultRules);
  const [form, setForm] = useState(samples[0]);
  const [orders, setOrders] = useState(() => [createWorkOrder(samples[1], defaultRules)]);
  const [selectedId, setSelectedId] = useState(orders[0]?.id);
  const selected = orders.find((order) => order.id === selectedId) || orders[0];
  const metrics = useMemo(() => {
    return {
      open: orders.filter((order) => order.status !== "Closed").length,
      review: orders.filter((order) => order.status.includes("review")).length,
      urgent: orders.filter((order) => order.triage.severity === "Urgent").length
    };
  }, [orders]);

  function updateSelected(patch, timelineItem) {
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== selected.id) return order;
        return {
          ...order,
          ...patch,
          timeline: timelineItem ? [...order.timeline, { ...timelineItem, stamp: nowStamp() }] : order.timeline
        };
      })
    );
  }

  function submitRequest(event) {
    event.preventDefault();
    const order = createWorkOrder(form, rules);
    setOrders((current) => [order, ...current]);
    setSelectedId(order.id);
  }

  function loadSample() {
    const next = samples[Math.floor(Math.random() * samples.length)];
    setForm(next);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Wrench size={20} /></div>
          <div>
            <h1>RelayDesk</h1>
            <p>AI maintenance coordination for small property managers</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={loadSample}><RefreshCcw size={16} /> Load sample</button>
          <button className="primary" onClick={submitRequest}><Plus size={16} /> New work order</button>
        </div>
      </header>

      <section className="metrics-grid">
        <Metric icon={<ClipboardList />} label="Open work orders" value={metrics.open} />
        <Metric icon={<AlertTriangle />} label="Urgent items" value={metrics.urgent} />
        <Metric icon={<Clock3 />} label="Need review" value={metrics.review} />
        <Metric icon={<ShieldCheck />} label="Avg response target" value="12m" />
      </section>

      <section className="workspace">
        <aside className="panel tenant-panel">
          <SectionTitle icon={<Home />} eyebrow="Tenant intake" title="Report a maintenance issue" />
          <form className="stack" onSubmit={submitRequest}>
            <label>
              Tenant name
              <input value={form.tenant} onChange={(event) => setForm({ ...form, tenant: event.target.value })} />
            </label>
            <label>
              Unit
              <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
            </label>
            <label>
              What is happening?
              <textarea rows="5" value={form.issue} onChange={(event) => setForm({ ...form, issue: event.target.value })} />
            </label>
            <label>
              Access notes
              <textarea rows="3" value={form.access} onChange={(event) => setForm({ ...form, access: event.target.value })} />
            </label>
            <label>
              Photo or video names
              <input value={form.photos} onChange={(event) => setForm({ ...form, photos: event.target.value })} placeholder="Optional" />
            </label>
            <button className="primary wide" type="submit"><Send size={16} /> Submit request</button>
          </form>

          <div className="rule-box">
            <SectionTitle icon={<Mic />} eyebrow="Manager voice rules" title="Dispatch policy" compact />
            <textarea rows="8" value={rules} onChange={(event) => setRules(event.target.value)} />
          </div>
        </aside>

        <section className="panel board-panel">
          <SectionTitle icon={<Building2 />} eyebrow="Operations" title="Maintenance desk" />
          <div className="order-layout">
            <div className="order-list">
              {orders.map((order) => (
                <button
                  key={order.id}
                  className={`order-card ${selected?.id === order.id ? "active" : ""}`}
                  onClick={() => setSelectedId(order.id)}
                >
                  <div className="order-card-top">
                    <strong>{order.id}</strong>
                    <span className={order.triage.severity === "Urgent" ? "badge urgent" : "badge"}>{order.triage.severity}</span>
                  </div>
                  <span>{order.unit} · {order.triage.trade}</span>
                  <p>{order.issue}</p>
                </button>
              ))}
            </div>

            {selected && (
              <div className="detail-pane">
                <div className="detail-header">
                  <div>
                    <span className="eyebrow">{selected.id} · {selected.createdAt}</span>
                    <h2>Unit {selected.unit}: {selected.triage.trade}</h2>
                  </div>
                  <span className="status-pill">{selected.status}</span>
                </div>

                <div className="triage-grid">
                  <InfoTile icon={<Bot />} label="AI triage" value={`${selected.triage.trade} · ${selected.triage.confidence}%`} />
                  <InfoTile icon={<AlertTriangle />} label="Urgency" value={selected.triage.severity} />
                  <InfoTile icon={<Wrench />} label="Vendor" value={selected.vendor.name} />
                  <InfoTile icon={<ClipboardList />} label="Estimate" value={`$${selected.estimate}`} />
                </div>

                <div className="issue-box">
                  <h3>Tenant issue</h3>
                  <p>{selected.issue}</p>
                  <span>Access: {selected.access || "Not provided"}</span>
                </div>

                <div className="actions-grid">
                  <ActionCard
                    icon={<UserRound />}
                    title="Manager approval"
                    body={selected.managerMessage}
                    done={selected.managerApproved}
                    cta="Approve dispatch"
                    onClick={() => updateSelected(
                      {
                        managerApproved: true,
                        status: selected.ownerApproval ? "Owner approval" : "Vendor coordination"
                      },
                      {
                        label: "Manager approved",
                        detail: selected.ownerApproval ? "Owner approval required before dispatch" : "Ready for vendor coordination"
                      }
                    )}
                  />
                  <ActionCard
                    icon={<Building2 />}
                    title="Owner approval"
                    body={selected.ownerApproval ? selected.ownerMessage : "No owner approval required under current rules."}
                    done={!selected.ownerApproval || selected.ownerApproved}
                    disabled={!selected.ownerApproval || !selected.managerApproved}
                    cta="Owner approved"
                    onClick={() => updateSelected(
                      { ownerApproved: true, status: "Vendor coordination" },
                      { label: "Owner approved", detail: "Dispatch cleared by owner" }
                    )}
                  />
                  <ActionCard
                    icon={<PhoneCall />}
                    title="Vendor coordination"
                    body={selected.vendorMessage}
                    done={["Vendor scheduled", "Closed"].includes(selected.status)}
                    disabled={!selected.managerApproved || (selected.ownerApproval && !selected.ownerApproved)}
                    cta="Send to vendor"
                    onClick={() => updateSelected(
                      { status: "Vendor scheduled" },
                      { label: "Vendor contacted", detail: `${selected.vendor.name} received scope and access notes` }
                    )}
                  />
                  <ActionCard
                    icon={<MessageSquare />}
                    title="Tenant update"
                    body={selected.tenantMessage}
                    done={selected.status === "Closed"}
                    disabled={selected.status === "Manager review"}
                    cta="Close request"
                    onClick={() => updateSelected(
                      { status: "Closed" },
                      { label: "Tenant notified and request closed", detail: "Completion confirmation recorded" }
                    )}
                  />
                </div>

                <div className="timeline">
                  <h3>Timeline</h3>
                  {selected.timeline.map((item, index) => (
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
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionTitle({ icon, eyebrow, title, compact = false }) {
  return (
    <div className={`section-title ${compact ? "compact" : ""}`}>
      <div className="section-icon">{icon}</div>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }) {
  return (
    <div className="info-tile">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActionCard({ icon, title, body, cta, done, disabled, onClick }) {
  return (
    <div className={`action-card ${done ? "done" : ""}`}>
      <div className="action-head">
        <div className="action-icon">{icon}</div>
        <h3>{title}</h3>
        {done ? <Check size={18} /> : <ChevronRight size={18} />}
      </div>
      <p>{body}</p>
      <button className={done ? "done-button" : "secondary"} disabled={disabled || done} onClick={onClick}>
        {done ? <Check size={16} /> : <ArrowRight size={16} />}
        {done ? "Done" : cta}
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
