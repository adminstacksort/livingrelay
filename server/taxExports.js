import { invoices, properties, recordAudit, vendors, workOrders } from "./data.js";

const SCHEDULE_E_LINES = {
  advertising: { line: "8", label: "Advertising" },
  autoTravel: { line: "9", label: "Auto and travel" },
  cleaningMaintenance: { line: "10", label: "Cleaning and maintenance" },
  commissions: { line: "11", label: "Commissions" },
  insurance: { line: "12", label: "Insurance" },
  legalProfessional: { line: "13", label: "Legal and other professional fees" },
  managementFees: { line: "14", label: "Management fees" },
  mortgageInterest: { line: "15", label: "Mortgage interest paid to banks, etc." },
  otherInterest: { line: "16", label: "Other interest" },
  repairs: { line: "17", label: "Repairs" },
  supplies: { line: "18", label: "Supplies" },
  taxes: { line: "19", label: "Taxes" },
  utilities: { line: "20", label: "Utilities" },
  depreciation: { line: "18/4562", label: "Depreciation or amortization" },
  other: { line: "19", label: "Other expenses statement" }
};

const TRADE_TO_CATEGORY = {
  Plumbing: "repairs",
  HVAC: "repairs",
  Electrical: "repairs",
  General: "repairs",
  Cleaning: "cleaningMaintenance",
  Landscaping: "cleaningMaintenance",
  Insurance: "insurance",
  Legal: "legalProfessional",
  Management: "managementFees",
  Supplies: "supplies",
  Utilities: "utilities",
  Taxes: "taxes"
};

export function buildTaxSummary(propertyId, year = "2026") {
  const property = properties.find((item) => item.id === propertyId);
  const propertyInvoices = invoices
    .filter((invoice) => invoice.propertyId === propertyId && String(invoice.taxYear || year) === String(year))
    .map(enrichInvoice);

  const categories = {};
  for (const invoice of propertyInvoices) {
    const key = invoice.taxCategory;
    categories[key] = categories[key] || {
      key,
      label: SCHEDULE_E_LINES[key]?.label || "Other expenses statement",
      scheduleELine: SCHEDULE_E_LINES[key]?.line || "19",
      amount: 0,
      count: 0
    };
    categories[key].amount += invoice.amount;
    categories[key].count += 1;
  }

  const categoryRows = Object.values(categories).sort((a, b) => a.scheduleELine.localeCompare(b.scheduleELine));
  const totalExpenses = propertyInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const scheduleE = buildScheduleEWorksheet({ property, year, categoryRows, totalExpenses });

  return {
    property,
    year: String(year),
    totalExpenses,
    categories: categoryRows,
    scheduleE,
    invoices: propertyInvoices
  };
}

export function buildTaxCsv(propertyId, year = "2026") {
  const summary = buildTaxSummary(propertyId, year);
  const header = [
    "tax_year",
    "property",
    "invoice_id",
    "work_order_id",
    "date",
    "vendor",
    "amount",
    "category",
    "schedule_e_line",
    "status",
    "note"
  ];
  const rows = summary.invoices.map((invoice) => [
    summary.year,
    summary.property?.name || "",
    invoice.id,
    invoice.orderId,
    invoice.receivedAt,
    invoice.vendor,
    invoice.amount.toFixed(2),
    SCHEDULE_E_LINES[invoice.taxCategory]?.label || "Other expenses statement",
    SCHEDULE_E_LINES[invoice.taxCategory]?.line || "19",
    invoice.status,
    invoice.note
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function recordTaxBundleAudit(propertyId, year) {
  const summary = buildTaxSummary(propertyId, year);
  recordAudit("owner", "Generated owner tax packet", `${summary.property?.name || propertyId}: ${summary.invoices.length} invoices for ${year}.`);
  return summary;
}

function buildScheduleEWorksheet({ property, year, categoryRows, totalExpenses }) {
  const lines = categoryRows.map((category) => ({
    line: category.scheduleELine,
    label: category.label,
    amount: category.amount
  }));
  return {
    form: "Schedule E (Form 1040)",
    taxYear: String(year),
    propertyAddress: property?.address || "",
    propertyTypeCode: "1 - Single family residence / residential rental",
    lines,
    totalExpensesLine20: totalExpenses,
    disclaimer: "Draft worksheet only. Owner or tax preparer should verify classification, capitalization, depreciation, personal-use allocation, and 1099 requirements before filing."
  };
}

function enrichInvoice(invoice) {
  const order = workOrders.find((item) => item.id === invoice.orderId);
  const vendor = vendors.find((item) => item.name === invoice.vendor);
  const taxCategory = invoice.taxCategory || inferTaxCategory({ invoice, order, vendor });
  return {
    ...invoice,
    amount: Number(invoice.amount || 0),
    taxCategory,
    trade: order?.trade || vendor?.trade || "General",
    workOrderIssue: order?.issue || ""
  };
}

function inferTaxCategory({ invoice, order, vendor }) {
  const text = `${invoice.vendor || ""} ${invoice.note || ""} ${order?.trade || ""} ${order?.issue || ""} ${vendor?.trade || ""}`.toLowerCase();
  if (text.includes("insurance")) return "insurance";
  if (text.includes("tax")) return "taxes";
  if (text.includes("legal") || text.includes("account") || text.includes("bookkeep")) return "legalProfessional";
  if (text.includes("management") || text.includes("manager")) return "managementFees";
  if (text.includes("supply") || text.includes("material")) return "supplies";
  if (text.includes("electric bill") || text.includes("water bill") || text.includes("gas bill") || text.includes("utility")) return "utilities";
  return TRADE_TO_CATEGORY[order?.trade] || TRADE_TO_CATEGORY[vendor?.trade] || "repairs";
}

function csvCell(value) {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}
