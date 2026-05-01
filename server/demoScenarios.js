import { event, message, people, properties, recordAudit, vendors, workOrders } from "./data.js";
import { runFullFlowDemo } from "./demoOutreach.js";

const scenarios = {
  leak: {
    title: "Kitchen leak",
    tenantText: "Kitchen sink is leaking and water is pooling under the cabinet. Please send someone today if possible.",
    trade: "Plumbing",
    severity: "Urgent",
    estimate: 325,
    unit: "3B",
    access: "Tenant is home after 1 PM. Text before entering.",
    options: [
      ["Carlos Plumbing", "+13105550104", "$150-$400", "Preferred vendor"],
      ["New Pro Plumbing", "+18003367467", "$200-$450", "Same-day window possible"],
      ["Roy E. Smith Plumbing Co", "+13103988855", "$175-$425", "Can review photos first"],
      ["FORD's Plumbing and Heating", "+13108151515", "$160-$380", "Next available tomorrow"],
      ["Mar Vista Classic Plumbers", "+13103417546", "$140-$350", "Emergency slot available"]
    ]
  },
  heat: {
    title: "No heat",
    tenantText: "The heat is not turning on and the apartment is cold. Thermostat is blank.",
    trade: "HVAC",
    severity: "Urgent",
    estimate: 425,
    unit: "2A",
    access: "Tenant can do today between 3 PM and 7 PM.",
    options: [
      ["Nova HVAC", "+14245550195", "$250-$550", "Preferred vendor"],
      ["Westside Climate", "+13105550220", "$275-$600", "Can dispatch today"],
      ["Pacific Air Repair", "+14245550221", "$225-$500", "Tomorrow morning"],
      ["LA Comfort Tech", "+13105550222", "$300-$650", "Emergency fee after 5 PM"],
      ["Metro HVAC Pros", "+14245550223", "$240-$520", "Needs model number"]
    ]
  },
  spark: {
    title: "Outlet spark",
    tenantText: "Bedroom outlet sparked once and the lights in the room are out.",
    trade: "Electrical",
    severity: "Urgent",
    estimate: 185,
    unit: "7C",
    access: "Tenant is available all afternoon.",
    options: [
      ["Spark Right Electric", "+13105550119", "$150-$350", "Preferred vendor"],
      ["West LA Electric", "+13105550331", "$175-$400", "Can inspect today"],
      ["Brightline Electrical", "+14245550332", "$160-$375", "Tomorrow 8-10 AM"],
      ["Current Works", "+13105550333", "$200-$450", "Emergency visit available"],
      ["Breaker Box LA", "+14245550334", "$145-$325", "Needs photos of panel"]
    ]
  }
};

export function listDemoScenarios() {
  return Object.entries(scenarios).map(([id, scenario]) => ({
    id,
    title: scenario.title,
    trade: scenario.trade,
    severity: scenario.severity,
    estimate: scenario.estimate,
    tenantText: scenario.tenantText
  }));
}

export function createDemoScenario(scenarioId = "leak") {
  const scenario = scenarios[scenarioId] || scenarios.leak;
  const property = properties[0];
  const tenant = people.find((person) => person.role === "Tenant" && person.propertyIds.includes(property.id)) || people.find((person) => person.role === "Tenant");
  const preferredVendor = vendors.find((vendor) => vendor.trade === scenario.trade) || vendors[0];
  const id = `WO-${Math.floor(3000 + Math.random() * 6000)}`;
  const order = {
    id,
    propertyId: property.id,
    unit: scenario.unit,
    tenantId: tenant.id,
    trade: scenario.trade,
    severity: scenario.severity,
    status: "Manager review",
    estimate: scenario.estimate,
    vendorId: preferredVendor.id,
    issue: scenario.tenantText,
    access: scenario.access,
    managerApproved: false,
    ownerApproved: false,
    invoiceId: null,
    vendorOptions: scenario.options.map(([name, phone, estimate, availability]) => ({
      name,
      phone,
      trade: scenario.trade,
      estimate,
      availability
    })),
    timeline: [
      event("Tenant SMS received", scenario.tenantText),
      event("AI triaged request", `${scenario.severity} ${scenario.trade}; owner approval likely required.`),
      event("AI found vendor options", "Five local options prepared for manager review.")
    ],
    messages: [
      message("tenant", scenario.tenantText),
      message("relay", `Thanks ${tenant.name.split(" ")[0]}. We opened ${id}. A manager is reviewing it now.`)
    ]
  };

  workOrders.unshift(order);
  recordAudit("demo", "Created demo scenario", `${scenario.title} created as ${id}.`);
  runFullFlowDemo(order.id);
  return { order, scenarios: listDemoScenarios() };
}
