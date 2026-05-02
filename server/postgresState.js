import pg from "pg";

const { Pool } = pg;
const legacyStateId = "livingrelay";
let pool;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function isDurablePersistenceRequired() {
  return ["production", "staging"].includes(getRuntimeEnvironment());
}

export async function loadStateFromPostgres() {
  if (isDurablePersistenceRequired() && !hasDatabaseUrl()) {
    throw new Error(`${getRuntimeEnvironment()} requires DATABASE_URL for durable persistence.`);
  }
  if (!hasDatabaseUrl()) return null;
  const client = await getPool().connect();
  try {
    await ensureStateTable(client);
    const stateId = getStateId();
    const result = await client.query("select state from app_state where id = $1", [stateId]);
    if (result.rows[0]?.state) return result.rows[0].state;
    if (shouldLoadLegacyState(stateId)) {
      const legacy = await client.query("select state from app_state where id = $1", [legacyStateId]);
      return legacy.rows[0]?.state || null;
    }
    return null;
  } finally {
    client.release();
  }
}

export async function saveStateToPostgres(state) {
  if (isDurablePersistenceRequired() && !hasDatabaseUrl()) {
    throw new Error(`${getRuntimeEnvironment()} requires DATABASE_URL for durable persistence.`);
  }
  if (!hasDatabaseUrl()) return;
  const client = await getPool().connect();
  try {
    await ensureStateTable(client);
    await client.query(
      `insert into app_state (id, state, updated_at)
       values ($1, $2, now())
       on conflict (id) do update set state = excluded.state, updated_at = now()`,
      [getStateId(), state]
    );
  } finally {
    client.release();
  }
}

export async function getPostgresStatus() {
  if (!hasDatabaseUrl()) {
    return { configured: false, ok: false, mode: "local-json" };
  }
  try {
    const result = await getPool().query("select 1 as ok");
    return { configured: true, ok: result.rows[0]?.ok === 1, mode: "postgres" };
  } catch (error) {
    return { configured: true, ok: false, mode: "postgres", error: error.message };
  }
}

export function getRuntimeEnvironment() {
  const explicit = process.env.APP_ENV || process.env.LIVINGRELAY_ENV || process.env.ENVIRONMENT;
  if (explicit) return normalizeEnvironmentName(explicit);
  try {
    const host = new URL(process.env.APP_PUBLIC_URL || "").hostname.toLowerCase();
    if (host.startsWith("staging.")) return "staging";
    if (host.startsWith("dev.")) return "dev";
    if (host === "livingrelay.com" || host === "www.livingrelay.com" || host === "admin.livingrelay.com" || host === "app.livingrelay.com") return "production";
  } catch {
    // Fall through to local development.
  }
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

export function getStateId() {
  return `${legacyStateId}-${getRuntimeEnvironment()}`;
}

function shouldLoadLegacyState(stateId) {
  return stateId === `${legacyStateId}-production`;
}

function normalizeEnvironmentName(value) {
  const normalized = String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (["prod", "live"].includes(normalized)) return "production";
  if (["stage"].includes(normalized)) return "staging";
  return normalized || "development";
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

async function ensureStateTable(client) {
  await client.query(`
    create table if not exists app_state (
      id text primary key,
      state jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);
}
