-- LivingRelay production schema target for Postgres/RDS.
-- The current app can persist a full state snapshot in app_state immediately.
-- These normalized tables are the next migration target as the API is moved
-- from demo-shaped arrays to tenant-scoped queries.

create extension if not exists pgcrypto;

create table if not exists app_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  name text not null,
  role text not null check (role in ('Admin', 'Manager', 'Owner', 'Tenant', 'Vendor')),
  phone text not null,
  pin_hash text,
  notify jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (account_id, phone)
);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  name text not null,
  address text not null,
  subscription_status text not null default 'trial',
  stripe_subscription_id text,
  approval_threshold numeric(10, 2) not null default 250,
  rules text not null default '',
  admin_person_id uuid references people(id),
  manager_person_id uuid references people(id),
  owner_person_id uuid references people(id),
  created_at timestamptz not null default now()
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  label text not null,
  tenant_person_id uuid references people(id),
  created_at timestamptz not null default now(),
  unique (property_id, label)
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  person_id uuid references people(id),
  name text not null,
  trade text not null,
  phone text not null,
  preferred boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists work_orders (
  id text primary key,
  property_id uuid references properties(id) on delete cascade,
  unit_id uuid references units(id),
  tenant_person_id uuid references people(id),
  vendor_id uuid references vendors(id),
  trade text not null,
  severity text not null,
  status text not null,
  estimate numeric(10, 2),
  issue text not null,
  access_notes text,
  manager_approved boolean not null default false,
  owner_approved boolean not null default false,
  troubleshooting jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  work_order_id text references work_orders(id) on delete cascade,
  person_id uuid references people(id),
  direction text not null check (direction in ('inbound', 'outbound', 'internal')),
  channel text not null default 'sms',
  body text not null,
  provider_sid text,
  created_at timestamptz not null default now()
);

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  work_order_id text references work_orders(id) on delete cascade,
  message_id uuid references messages(id) on delete cascade,
  storage_url text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create table if not exists vendor_quotes (
  id uuid primary key default gen_random_uuid(),
  work_order_id text references work_orders(id) on delete cascade,
  vendor_id uuid references vendors(id),
  vendor_name text not null,
  phone text,
  quote text,
  availability text,
  confidence text,
  status text not null default 'pending',
  source text,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  work_order_id text references work_orders(id),
  vendor_name text not null,
  amount numeric(10, 2) not null,
  status text not null default 'received',
  tax_year text not null,
  tax_category text,
  note text,
  received_at date,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  actor text not null,
  action text not null,
  detail text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_people_account_phone on people(account_id, phone);
create index if not exists idx_properties_account on properties(account_id);
create index if not exists idx_work_orders_property_status on work_orders(property_id, status);
create index if not exists idx_messages_work_order on messages(work_order_id, created_at);
create index if not exists idx_invoices_property_year on invoices(property_id, tax_year);
