import { randomUUID } from "node:crypto";
import {
  accounts,
  externalMappings,
  integrationConnections,
  integrationEvents,
  people,
  properties,
  recordAudit,
  saveState,
  vendors,
  workOrders
} from "./data.js";
import { normalizePhone } from "./smsLogic.js";

export const pmsProviders = [
  {
    id: "doorloop",
    name: "DoorLoop",
    category: "modern_pms",
    authMode: "api_key",
    readiness: "first_candidate",
    supported: {
      importDirectory: true,
      importMaintenanceRequests: true,
      exportWorkOrders: true,
      exportInvoices: true,
      webhooks: true
    },
    notes: "Best first API connector for small-to-mid property managers with work-order writeback."
  },
  {
    id: "buildium",
    name: "Buildium",
    category: "professional_pms",
    authMode: "api_key",
    readiness: "first_candidate",
    supported: {
      importDirectory: true,
      importMaintenanceRequests: true,
      exportWorkOrders: true,
      exportInvoices: true,
      webhooks: false
    },
    notes: "Strong source-of-record fit with an official Open API and maintenance task overlap."
  },
  {
    id: "tenantcloud",
    name: "TenantCloud",
    category: "small_operator",
    authMode: "personal_access_token",
    readiness: "next_candidate",
    supported: {
      importDirectory: true,
      importMaintenanceRequests: true,
      exportWorkOrders: true,
      exportInvoices: true,
      webhooks: false
    },
    notes: "Good owner-operator candidate; start with PAT-based directory and work-order sync."
  },
  {
    id: "rentec",
    name: "Rentec Direct",
    category: "small_pm",
    authMode: "api_key",
    readiness: "next_candidate",
    supported: {
      importDirectory: true,
      importMaintenanceRequests: true,
      exportWorkOrders: true,
      exportInvoices: true,
      webhooks: true
    },
    notes: "Promising for smaller managers using Rentec Pro/PM Open API."
  },
  {
    id: "appfolio",
    name: "AppFolio",
    category: "enterprise_pms",
    authMode: "partner_marketplace",
    readiness: "strategic_later",
    supported: {
      importDirectory: true,
      importMaintenanceRequests: true,
      exportWorkOrders: true,
      exportInvoices: true,
      webhooks: true
    },
    notes: "High-value target, but likely gated by partner approval or customer-specific access."
  },
  {
    id: "csv",
    name: "CSV import",
    category: "manual",
    authMode: "file_upload",
    readiness: "bootstrap",
    supported: {
      importDirectory: true,
      importMaintenanceRequests: false,
      exportWorkOrders: false,
      exportInvoices: false,
      webhooks: false
    },
    notes: "Lowest-friction way to import properties, units, tenants, owners, and vendors before API connectors."
  },
  {
    id: "email_forwarding",
    name: "Email forwarding",
    category: "manual",
    authMode: "forwarding_inbox",
    readiness: "bootstrap",
    supported: {
      importDirectory: false,
      importMaintenanceRequests: true,
      exportWorkOrders: false,
      exportInvoices: false,
      webhooks: false
    },
    notes: "Parses PMS maintenance notification emails into LivingRelay draft work orders."
  }
];

export function listIntegrationSummary({ user }) {
  const accountIds = accessibleAccountIds(user);
  const scopedConnections = integrationConnections
    .filter((connection) => canAccessAccount(user, connection.accountId, accountIds))
    .map(publicConnection);
  const connectionIds = new Set(scopedConnections.map((connection) => connection.id));
  return {
    providers: pmsProviders,
    connections: scopedConnections,
    mappings: externalMappings.filter((mapping) => connectionIds.has(mapping.connectionId)),
    events: integrationEvents
      .filter((event) => connectionIds.has(event.connectionId) || canAccessAccount(user, event.accountId, accountIds))
      .slice(0, 50),
    accounts: accounts
      .filter((account) => canAccessAccount(user, account.id, accountIds))
      .map((account) => ({ id: account.id, name: account.name, status: account.status }))
  };
}

export function createIntegrationConnection({ user, accountId, provider, authMode, credentialRef = "", sync = {}, scopes = [] }) {
  const providerSpec = pmsProviders.find((item) => item.id === provider);
  if (!providerSpec) throw statusError(400, "Unsupported integration provider");
  const account = accounts.find((item) => item.id === accountId);
  if (!account) throw statusError(404, "account not found");
  if (!canAccessAccount(user, accountId)) throw statusError(403, "You can only connect accounts you belong to");
  const now = new Date().toISOString();
  const connection = {
    id: `int-${randomUUID()}`,
    accountId,
    provider,
    providerName: providerSpec.name,
    status: credentialRef ? "Configured" : "Draft",
    authMode: authMode || providerSpec.authMode,
    credentialRef: String(credentialRef || "").trim(),
    scopes: scopes.length ? scopes : defaultScopesForProvider(providerSpec),
    sync: {
      importDirectory: providerSpec.supported.importDirectory,
      importMaintenanceRequests: false,
      exportWorkOrders: providerSpec.supported.exportWorkOrders,
      exportInvoices: providerSpec.supported.exportInvoices,
      ...sync
    },
    counts: integrationCountsForAccount(accountId),
    lastSyncAt: "",
    lastError: "",
    createdAt: now,
    updatedAt: now
  };
  integrationConnections.unshift(connection);
  recordIntegrationEvent({
    connection,
    direction: "internal",
    objectType: "connection",
    objectId: connection.id,
    action: "created",
    status: "ok",
    summary: `${providerSpec.name} connection created for ${account.name}.`
  });
  saveState();
  recordAudit(user?.name || "app", "Created PMS integration", `${providerSpec.name} connection created for ${account.name}.`);
  return publicConnection(connection);
}

export function updateIntegrationConnection({ user, connectionId, patch = {} }) {
  const connection = integrationConnections.find((item) => item.id === connectionId);
  if (!connection) throw statusError(404, "integration connection not found");
  if (!canAccessAccount(user, connection.accountId)) throw statusError(403, "You can only update integrations for accounts you belong to");
  const providerSpec = pmsProviders.find((item) => item.id === connection.provider);
  const allowed = ["status", "credentialRef", "lastError"];
  for (const key of allowed) {
    if (patch[key] !== undefined) connection[key] = patch[key];
  }
  if (patch.sync && typeof patch.sync === "object") {
    connection.sync = { ...(connection.sync || {}), ...patch.sync };
  }
  if (Array.isArray(patch.scopes)) connection.scopes = patch.scopes;
  connection.updatedAt = new Date().toISOString();
  recordIntegrationEvent({
    connection,
    direction: "internal",
    objectType: "connection",
    objectId: connection.id,
    action: "updated",
    status: "ok",
    summary: `${providerSpec?.name || connection.providerName || connection.provider} connection settings updated.`
  });
  saveState();
  return publicConnection(connection);
}

export function deleteIntegrationConnection({ user, connectionId }) {
  const index = integrationConnections.findIndex((item) => item.id === connectionId);
  if (index < 0) throw statusError(404, "integration connection not found");
  const connection = integrationConnections[index];
  if (!canAccessAccount(user, connection.accountId)) throw statusError(403, "You can only delete integrations for accounts you belong to");
  integrationConnections.splice(index, 1);
  removeWhere(externalMappings, (mapping) => mapping.connectionId === connectionId);
  recordIntegrationEvent({
    connection,
    direction: "internal",
    objectType: "connection",
    objectId: connection.id,
    action: "deleted",
    status: "ok",
    summary: `${connection.providerName || connection.provider} connection removed.`
  });
  saveState();
  recordAudit(user?.name || "app", "Deleted PMS integration", `${connection.providerName || connection.provider} connection removed.`);
  return { deleted: true, connectionId };
}

export function dryRunIntegrationSync({ user, connectionId }) {
  const connection = integrationConnections.find((item) => item.id === connectionId);
  if (!connection) throw statusError(404, "integration connection not found");
  if (!canAccessAccount(user, connection.accountId)) throw statusError(403, "You can only sync integrations for accounts you belong to");
  const counts = integrationCountsForAccount(connection.accountId);
  connection.counts = counts;
  connection.status = connection.credentialRef ? "Ready for sandbox sync" : "Needs credentials";
  connection.lastSyncAt = new Date().toISOString();
  connection.lastError = connection.credentialRef ? "" : "Add a credential reference before live API sync.";
  connection.updatedAt = connection.lastSyncAt;
  recordIntegrationEvent({
    connection,
    direction: "outbound",
    objectType: "account",
    objectId: connection.accountId,
    action: "dry_run",
    status: connection.credentialRef ? "ok" : "blocked",
    summary: `Dry run prepared ${counts.importedProperties} properties, ${counts.importedPeople} people, ${counts.importedVendors} vendors, and ${counts.exportedWorkOrders} work orders for ${connection.providerName || connection.provider}.`
  });
  saveState();
  return publicConnection(connection);
}

export function importDirectoryCsv({ user, connectionId, csv = "" }) {
  const connection = integrationConnections.find((item) => item.id === connectionId);
  if (!connection) throw statusError(404, "integration connection not found");
  if (!canAccessAccount(user, connection.accountId)) throw statusError(403, "You can only import directories for accounts you belong to");
  if (connection.sync?.importDirectory === false) throw statusError(400, "Directory import is disabled for this connection");
  const rows = parseCsv(csv);
  if (!rows.length) throw statusError(400, "CSV must include a header row and at least one data row");
  const result = {
    rows: rows.length,
    propertiesCreated: 0,
    propertiesUpdated: 0,
    peopleCreated: 0,
    peopleUpdated: 0,
    vendorsCreated: 0,
    vendorsUpdated: 0,
    unitsAdded: 0,
    skipped: 0
  };
  for (const row of rows) {
    const property = upsertCsvProperty({ connection, row, result });
    if (!property) {
      result.skipped += 1;
      continue;
    }
    const unit = valueFor(row, ["unit", "unitLabel", "unitName"]);
    if (unit && !property.units?.includes(unit)) {
      property.units = [...(property.units || []), unit];
      result.unitsAdded += 1;
    }
    upsertCsvPerson({ connection, row, property, role: "Manager", result });
    upsertCsvPerson({ connection, row, property, role: "Owner", result });
    upsertCsvPerson({ connection, row, property, role: "Tenant", unit, result });
    upsertCsvVendor({ connection, row, property, result });
  }
  const now = new Date().toISOString();
  connection.counts = integrationCountsForAccount(connection.accountId);
  connection.status = "Imported directory";
  connection.lastSyncAt = now;
  connection.lastError = "";
  connection.updatedAt = now;
  recordIntegrationEvent({
    connection,
    direction: "inbound",
    objectType: "directory",
    objectId: connection.accountId,
    action: "csv_import",
    status: "ok",
    summary: `Imported ${result.propertiesCreated} new properties, ${result.peopleCreated} new people, and ${result.vendorsCreated} new vendors from ${result.rows} CSV rows.`
  });
  saveState();
  recordAudit(user?.name || "app", "Imported PMS directory CSV", `${connection.providerName || connection.provider}: ${result.rows} rows processed for ${accountName(connection.accountId)}.`);
  return { connection: publicConnection(connection), result };
}

export function previewWorkOrderExport({ user, connectionId, limit = 25 }) {
  const connection = integrationConnections.find((item) => item.id === connectionId);
  if (!connection) throw statusError(404, "integration connection not found");
  if (!canAccessAccount(user, connection.accountId)) throw statusError(403, "You can only export work orders for accounts you belong to");
  if (connection.sync?.exportWorkOrders === false) throw statusError(400, "Work-order export is disabled for this connection");
  const accountPropertyIds = properties.filter((property) => property.accountId === connection.accountId).map((property) => property.id);
  const propertyIdSet = new Set(accountPropertyIds);
  const payloads = workOrders
    .filter((order) => propertyIdSet.has(order.propertyId))
    .slice(0, Math.max(1, Math.min(Number(limit || 25), 100)))
    .map((order) => buildWorkOrderExportPayload(connection, order));
  connection.counts = {
    ...integrationCountsForAccount(connection.accountId),
    pendingWorkOrderExports: payloads.filter((payload) => payload.exportState === "pending").length,
    mappedWorkOrderExports: payloads.filter((payload) => payload.exportState === "mapped").length
  };
  connection.updatedAt = new Date().toISOString();
  recordIntegrationEvent({
    connection,
    direction: "outbound",
    objectType: "work_order",
    objectId: connection.accountId,
    action: "work_order_export_preview",
    status: "ok",
    summary: `Prepared ${payloads.length} work-order writeback payloads for ${connection.providerName || connection.provider}.`
  });
  saveState();
  return {
    connection: publicConnection(connection),
    payloads
  };
}

export function recordExternalMapping({ connection, externalType, externalId, internalType, internalId, syncDirection = "two_way" }) {
  const existing = externalMappings.find((mapping) =>
    mapping.connectionId === connection.id
    && mapping.externalType === externalType
    && mapping.externalId === externalId
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.internalType = internalType;
    existing.internalId = internalId;
    existing.syncDirection = syncDirection;
    existing.updatedAt = now;
    return existing;
  }
  const mapping = {
    id: `map-${randomUUID()}`,
    connectionId: connection.id,
    accountId: connection.accountId,
    provider: connection.provider,
    externalType,
    externalId,
    internalType,
    internalId,
    syncDirection,
    createdAt: now,
    updatedAt: now
  };
  externalMappings.unshift(mapping);
  return mapping;
}

function buildWorkOrderExportPayload(connection, order) {
  const property = properties.find((item) => item.id === order.propertyId);
  const tenant = people.find((person) => person.id === order.tenantId);
  const vendor = vendors.find((item) => item.id === order.vendorId);
  const existingMapping = externalMappings.find((mapping) =>
    mapping.connectionId === connection.id
    && mapping.internalType === "work_order"
    && mapping.internalId === order.id
  );
  return {
    exportState: existingMapping ? "mapped" : "pending",
    provider: connection.provider,
    externalId: existingMapping?.externalId || "",
    internalId: order.id,
    workOrder: {
      source: "LivingRelay",
      title: `${order.trade || "General"}: ${truncate(order.issue, 80)}`,
      description: order.issue || "",
      status: mapWorkOrderStatus(order.status),
      priority: mapWorkOrderPriority(order.severity),
      trade: order.trade || "General",
      estimate: Number(order.estimate || 0),
      accessNotes: order.access || order.accessNotes || "",
      serviceWindow: order.serviceWindow || "",
      approval: {
        managerApproved: Boolean(order.managerApproved),
        ownerApproved: Boolean(order.ownerApproved),
        requiresOwnerApproval: String(order.status || "").toLowerCase().includes("owner")
      },
      property: {
        internalId: property?.id || order.propertyId,
        externalId: externalIdFor(connection, "property", property?.id),
        name: property?.name || "",
        address: property?.address || "",
        unit: order.unit || ""
      },
      tenant: tenant ? {
        internalId: tenant.id,
        externalId: externalIdFor(connection, "tenant", tenant.id),
        name: tenant.name,
        phone: tenant.phone || "",
        email: tenant.email || ""
      } : null,
      vendor: vendor ? {
        internalId: vendor.id,
        externalId: externalIdFor(connection, "vendor", vendor.id),
        name: vendor.name,
        trade: vendor.trade || order.trade || "General",
        phone: vendor.phone || ""
      } : null,
      timelineSummary: (order.timeline || []).slice(-6).map((event) => ({
        label: event.label,
        detail: event.detail,
        at: event.stamp || event.createdAt || ""
      }))
    }
  };
}

function upsertCsvProperty({ connection, row, result }) {
  const propertyName = valueFor(row, ["propertyName", "property", "building", "name"]);
  const address = valueFor(row, ["address", "propertyAddress", "streetAddress"]);
  if (!propertyName && !address) return null;
  const externalId = valueFor(row, ["propertyExternalId", "propertyId", "externalPropertyId", "externalId"])
    || stableExternalId("property", propertyName, address);
  const mapped = mappingTarget(connection, "property", externalId);
  let property = mapped ? properties.find((item) => item.id === mapped.internalId) : null;
  if (!property) {
    property = properties.find((item) =>
      item.accountId === connection.accountId
      && sameText(item.name, propertyName)
      && (!address || sameText(item.address, address))
    );
  }
  if (property) {
    if (propertyName) property.name = property.name || propertyName;
    if (address) property.address = property.address || address;
    result.propertiesUpdated += 1;
  } else {
    property = {
      id: `p-${Date.now()}-${properties.length + 1}`,
      accountId: connection.accountId,
      name: propertyName || address,
      address: address || "",
      subscription: "Imported",
      plan: "$0/property + $25 only when a vendor is booked",
      units: [],
      adminId: null,
      managerId: null,
      ownerId: null,
      billingPayerRole: "Owner",
      billingSetupStatus: "Needs card",
      approvalThreshold: 250,
      launchNotificationStatus: "Pending setup",
      dispatchSettings: defaultImportedDispatchSettings(),
      rules: "Imported from property management software. Review approval thresholds, contacts, vendors, and dispatch settings before production outreach.",
      externalSource: {
        provider: connection.provider,
        connectionId: connection.id,
        externalId
      }
    };
    properties.push(property);
    result.propertiesCreated += 1;
  }
  recordExternalMapping({ connection, externalType: "property", externalId, internalType: "property", internalId: property.id });
  return property;
}

function upsertCsvPerson({ connection, row, property, role, unit = "", result }) {
  const lowerRole = role.toLowerCase();
  const name = valueFor(row, [`${lowerRole}Name`, `${lowerRole}`, `${lowerRole}FullName`]);
  const phone = valueFor(row, [`${lowerRole}Phone`, `${lowerRole}Mobile`, `${lowerRole}Cell`]);
  const email = valueFor(row, [`${lowerRole}Email`, `${lowerRole}Mail`]);
  if (!name && !phone && !email) return null;
  const externalId = valueFor(row, [`${lowerRole}ExternalId`, `${lowerRole}Id`, `external${role}Id`])
    || stableExternalId(lowerRole, name, phone || email, property.id, unit);
  const mapped = mappingTarget(connection, lowerRole, externalId);
  let person = mapped ? people.find((item) => item.id === mapped.internalId) : null;
  const canonicalPhone = phone ? normalizePhone(phone) : "";
  if (!person && canonicalPhone) {
    person = people.find((item) => normalizePhone(item.phone) === canonicalPhone && item.role === role);
  }
  if (!person) {
    person = {
      id: `${lowerRole}-${Date.now()}-${people.length + 1}`,
      name: name || email || canonicalPhone,
      role,
      phone: canonicalPhone || "",
      email: email || undefined,
      pin: String(Math.floor(1000 + Math.random() * 9000)),
      propertyIds: [property.id],
      accountIds: [connection.accountId],
      unit: role === "Tenant" ? unit || undefined : undefined,
      notify: defaultImportedNotify(role)
    };
    people.push(person);
    result.peopleCreated += 1;
  } else {
    if (name) person.name = person.name || name;
    if (canonicalPhone) person.phone = person.phone || canonicalPhone;
    if (email) person.email = person.email || email;
    person.propertyIds = addUnique([...(person.propertyIds || []), property.id]);
    person.accountIds = addUnique([...(person.accountIds || []), connection.accountId]);
    if (role === "Tenant" && unit) person.unit = person.unit || unit;
    result.peopleUpdated += 1;
  }
  if (role === "Manager") {
    property.managerId = property.managerId || person.id;
    property.adminId = property.adminId || person.id;
    person.managesPropertyIds = addUnique([...(person.managesPropertyIds || []), property.id]);
  }
  if (role === "Owner") property.ownerId = property.ownerId || person.id;
  recordExternalMapping({ connection, externalType: lowerRole, externalId, internalType: "person", internalId: person.id });
  return person;
}

function upsertCsvVendor({ connection, row, property, result }) {
  const name = valueFor(row, ["vendorName", "serviceProvider", "contractorName"]);
  const phone = valueFor(row, ["vendorPhone", "contractorPhone", "serviceProviderPhone"]);
  const trade = valueFor(row, ["vendorTrade", "trade", "category"]) || "General";
  if (!name && !phone) return null;
  const externalId = valueFor(row, ["vendorExternalId", "vendorId", "externalVendorId"])
    || stableExternalId("vendor", name, phone, trade);
  const mapped = mappingTarget(connection, "vendor", externalId);
  let vendor = mapped ? vendors.find((item) => item.id === mapped.internalId) : null;
  const canonicalPhone = phone ? normalizePhone(phone) : "";
  if (!vendor) {
    vendor = vendors.find((item) =>
      item.accountId === connection.accountId
      && sameText(item.name, name)
      && (!canonicalPhone || normalizePhone(item.phone) === canonicalPhone)
    );
  }
  if (!vendor) {
    vendor = {
      id: `v-${Date.now()}-${vendors.length + 1}`,
      accountId: connection.accountId,
      name: name || canonicalPhone,
      trade,
      phone: canonicalPhone,
      preferred: false,
      propertyIds: [property.id],
      metadata: {
        importedFrom: connection.provider,
        externalId
      }
    };
    vendors.push(vendor);
    result.vendorsCreated += 1;
  } else {
    if (name) vendor.name = vendor.name || name;
    if (trade) vendor.trade = vendor.trade || trade;
    if (canonicalPhone) vendor.phone = vendor.phone || canonicalPhone;
    vendor.accountId = vendor.accountId || connection.accountId;
    vendor.propertyIds = addUnique([...(vendor.propertyIds || []), property.id]);
    result.vendorsUpdated += 1;
  }
  recordExternalMapping({ connection, externalType: "vendor", externalId, internalType: "vendor", internalId: vendor.id });
  return vendor;
}

function publicConnection(connection) {
  return {
    ...connection,
    credentialConfigured: Boolean(connection.credentialRef),
    credentialRef: connection.credentialRef ? redactCredentialRef(connection.credentialRef) : ""
  };
}

function defaultScopesForProvider(providerSpec) {
  const scopes = [];
  if (providerSpec.supported.importDirectory) scopes.push("properties:read", "people:read", "vendors:read");
  if (providerSpec.supported.importMaintenanceRequests) scopes.push("maintenance:read");
  if (providerSpec.supported.exportWorkOrders) scopes.push("work_orders:write");
  if (providerSpec.supported.exportInvoices) scopes.push("invoices:write");
  return scopes;
}

function integrationCountsForAccount(accountId) {
  const accountPropertyIds = properties.filter((property) => property.accountId === accountId).map((property) => property.id);
  const propertyIdSet = new Set(accountPropertyIds);
  const personCount = people.filter((person) =>
    person.role !== "Site Admin"
    && (
      person.accountIds?.includes(accountId)
      || person.propertyIds?.some((propertyId) => propertyIdSet.has(propertyId))
      || person.managesPropertyIds?.some((propertyId) => propertyIdSet.has(propertyId))
    )
  ).length;
  return {
    importedProperties: accountPropertyIds.length,
    importedPeople: personCount,
    importedVendors: vendors.filter((vendor) => vendor.accountId === accountId || vendor.propertyIds?.some((propertyId) => propertyIdSet.has(propertyId))).length,
    exportedWorkOrders: workOrders.filter((order) => propertyIdSet.has(order.propertyId)).length
  };
}

function recordIntegrationEvent({ connection, direction, objectType, objectId, action, status, summary }) {
  integrationEvents.unshift({
    id: `intevt-${randomUUID()}`,
    connectionId: connection.id,
    accountId: connection.accountId,
    provider: connection.provider,
    direction,
    objectType,
    objectId,
    action,
    status,
    summary,
    createdAt: new Date().toISOString()
  });
}

function parseCsv(csv = "") {
  const lines = String(csv || "").replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      if (header) row[header] = String(values[index] || "").trim();
      return row;
    }, {});
  }).filter((row) => Object.values(row).some(Boolean));
}

function parseCsvLine(line = "") {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function normalizeHeader(header = "") {
  const cleaned = String(header).trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
  if (!cleaned) return "";
  return cleaned
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part, index) => index === 0 ? part.toLowerCase() : `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join("");
}

function valueFor(row, keys = []) {
  for (const key of keys) {
    const value = row[normalizeHeader(key)] ?? row[key];
    if (String(value || "").trim()) return String(value).trim();
  }
  return "";
}

function mappingTarget(connection, externalType, externalId) {
  if (!externalId) return null;
  return externalMappings.find((mapping) =>
    mapping.connectionId === connection.id
    && mapping.externalType === externalType
    && mapping.externalId === externalId
  );
}

function stableExternalId(...parts) {
  return parts.map((part) => String(part || "").trim().toLowerCase()).filter(Boolean).join(":");
}

function sameText(left = "", right = "") {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function addUnique(items = []) {
  return [...new Set(items.filter(Boolean))];
}

function accountName(accountId) {
  return accounts.find((account) => account.id === accountId)?.name || accountId;
}

function defaultImportedDispatchSettings() {
  return {
    vendorOutreachMode: "manager_approval",
    autoOutreachAfterTenantConfirmed: false,
    emergencyOutreachMode: "manager_approval",
    maxVendorsToCall: 5,
    requireTenantAvailabilityBeforeBooking: true,
    inboundInvoiceEmail: process.env.INBOUND_EMAIL_ADDRESS || "invoices@livingrelay.com",
    invoiceRecipientPolicy: "manager_owner_system",
    productionVendorCallsEnabled: true,
    vendorPreferences: {
      Plumbing: [],
      HVAC: [],
      Electrical: [],
      Painting: [],
      General: []
    }
  };
}

function defaultImportedNotify(role) {
  return {
    tenantReports: ["Manager", "Owner"].includes(role),
    everyUpdate: role === "Manager",
    keyUpdates: ["Manager", "Owner"].includes(role)
  };
}

function externalIdFor(connection, internalType, internalId) {
  return externalMappings.find((mapping) =>
    mapping.connectionId === connection.id
    && mapping.internalType === internalType
    && mapping.internalId === internalId
  )?.externalId || "";
}

function mapWorkOrderStatus(status = "") {
  const normalized = String(status).toLowerCase();
  if (normalized.includes("closed") || normalized.includes("resolved")) return "completed";
  if (normalized.includes("scheduled") || normalized.includes("booked")) return "scheduled";
  if (normalized.includes("owner")) return "pending_owner_approval";
  if (normalized.includes("vendor")) return "vendor_outreach";
  return "open";
}

function mapWorkOrderPriority(severity = "") {
  const normalized = String(severity).toLowerCase();
  if (normalized.includes("urgent") || normalized.includes("emergency")) return "high";
  if (normalized.includes("low")) return "low";
  return "normal";
}

function truncate(value = "", maxLength = 80) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function accessibleAccountIds(user) {
  if (!user || user.role === "Site Admin") return accounts.map((account) => account.id);
  const propertyIds = new Set([...(user.propertyIds || []), ...(user.managesPropertyIds || [])]);
  return [
    ...(user.accountIds || []),
    ...properties.filter((property) => propertyIds.has(property.id)).map((property) => property.accountId)
  ].filter(Boolean);
}

function canAccessAccount(user, accountId, cachedAccountIds = null) {
  if (!user || user.role === "Site Admin") return true;
  return (cachedAccountIds || accessibleAccountIds(user)).includes(accountId);
}

function redactCredentialRef(value = "") {
  const text = String(value);
  if (text.length <= 8) return "configured";
  return `${text.slice(0, 3)}...${text.slice(-3)}`;
}

function removeWhere(list, predicate) {
  let removed = 0;
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (predicate(list[index])) {
      list.splice(index, 1);
      removed += 1;
    }
  }
  return removed;
}

function statusError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
