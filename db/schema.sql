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
  billing_payer_role text not null default 'Owner' check (billing_payer_role in ('Owner', 'Property manager')),
  billing_payer_person_id uuid,
  billing_setup_status text not null default 'Needs card',
  owner_subscription_status text not null default 'Free',
  owner_subscription_plan text not null default 'Owner Subscription',
  owner_subscription_stripe_id text,
  owner_subscription_current_period_end timestamptz,
  production_vendor_calls_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists platform_settings (
  id text primary key default 'platform',
  vendor_call_test_mode boolean not null default true,
  production_vendor_calls_enabled boolean not null default true,
  vendor_call_test_number text,
  updated_at timestamptz not null default now()
);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  name text not null,
  role text not null check (role in ('Site Admin', 'Admin', 'Manager', 'Owner', 'Tenant', 'Vendor')),
  phone text not null,
  email text,
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
  billing_status text not null default 'ready',
  billing_payer_role text not null default 'Owner' check (billing_payer_role in ('Owner', 'Property manager')),
  billing_payer_person_id uuid references people(id),
  billing_setup_status text not null default 'Needs card',
  setup_notification_status text not null default 'pending',
  approval_threshold numeric(10, 2) not null default 250,
  dispatch_settings jsonb not null default '{}'::jsonb,
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
  dispatch_stage text,
  estimate numeric(10, 2),
  issue text not null,
  access_notes text,
  service_window text,
  tenant_availability jsonb not null default '{}'::jsonb,
  manager_approved boolean not null default false,
  owner_approved boolean not null default false,
  dispatch_fee_status text not null default 'not_charged',
  dispatch_fee_amount numeric(10, 2) not null default 25,
  troubleshooting jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  work_order_id text references work_orders(id),
  type text not null default 'dispatch_fee',
  amount numeric(10, 2) not null default 25,
  status text not null,
  payer_role text not null,
  stripe_invoice_id text,
  note text,
  created_at timestamptz not null default now(),
  unique (work_order_id, type)
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
  discount text,
  warranty text,
  invoice_email text,
  invoice_recipients jsonb not null default '[]'::jsonb,
  invoice_delivery_instructions text,
  needs_photos boolean not null default false,
  confidence text,
  status text not null default 'pending',
  source text,
  selected boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists vendor_call_attempts (
  id uuid primary key default gen_random_uuid(),
  work_order_id text references work_orders(id) on delete cascade,
  vendor_id uuid references vendors(id),
  vendor_name text not null,
  phone text,
  provider text,
  status text not null,
  attempt_number integer not null default 1,
  call_sid text,
  conversation_id text,
  transcript jsonb not null default '[]'::jsonb,
  outcome text,
  retry jsonb not null default '{}'::jsonb,
  hold jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  completed_at timestamptz
);

create table if not exists vendor_completion_packages (
  id uuid primary key default gen_random_uuid(),
  work_order_id text references work_orders(id) on delete cascade,
  vendor_id uuid references vendors(id),
  status text not null default 'received',
  notes text,
  warranty text,
  invoice_delivery text,
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  work_order_id text references work_orders(id),
  vendor_name text not null,
  amount numeric(10, 2) not null,
  status text not null default 'unpaid',
  payment_status text not null default 'unpaid',
  payment_rail text not null default 'vendor_direct',
  recipient_name text,
  recipient_phone text,
  recipient_email text,
  recipients jsonb not null default '[]'::jsonb,
  invoice_delivery_instructions text,
  delivery_status text,
  tax_year text not null,
  tax_category text,
  source text not null default 'vendor_invoice',
  document_name text,
  capital_improvement_candidate boolean not null default false,
  note text,
  received_at date,
  paid_at timestamptz,
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
create index if not exists idx_billing_events_property on billing_events(property_id, created_at);
create index if not exists idx_messages_work_order on messages(work_order_id, created_at);
create index if not exists idx_invoices_property_year on invoices(property_id, tax_year);
create index if not exists idx_vendor_completion_work_order on vendor_completion_packages(work_order_id, created_at);
create index if not exists idx_vendor_call_attempts_work_order on vendor_call_attempts(work_order_id, started_at);
