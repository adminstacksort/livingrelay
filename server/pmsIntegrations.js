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
