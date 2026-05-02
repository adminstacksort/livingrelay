import pg from "pg";

const { Pool } = pg;
let pool;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export async function loadStateFromPostgres() {
  if (!hasDatabaseUrl()) return null;
  const client = await getPool().connect();
  try {
    await ensureStateTable(client);
    const result = await client.query("select state from app_state where id = $1", ["livingrelay"]);
    return result.rows[0]?.state || null;
  } finally {
    client.release();
  }
}

export async function saveStateToPostgres(state) {
  if (!hasDatabaseUrl()) return;
  const client = await getPool().connect();
  try {
    await ensureStateTable(client);
    await client.query(
      `insert into app_state (id, state, updated_at)
       values ($1, $2, now())
       on conflict (id) do update set state = excluded.state, updated_at = now()`,
      ["livingrelay", state]
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
