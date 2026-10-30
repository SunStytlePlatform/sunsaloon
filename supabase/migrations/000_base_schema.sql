-- Base schema, RECONSTRUCTED from what the backend reads and writes (backend/services/*.js).
-- The live Supabase project was not available when this was written: compare it with your real tables
-- (Table editor or `supabase db diff`) before running it anywhere that already holds data. Every statement is
-- idempotent (`if not exists`), so on an existing database it should only add what is missing.
--
-- Order: 000 (this file) -> 001_unique_active_slot -> 002_appointment_contact_snapshot.

create extension if not exists pgcrypto;

create table if not exists shop_settings (
  id          uuid primary key default gen_random_uuid(),
  shop_name   text not null,
  phone       text,
  address     text,
  email       text,
  description text,
  logo_url    text
);

create table if not exists services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  price            numeric(10, 2) check (price >= 0),
  duration_minutes integer check (duration_minutes > 0),
  is_active        boolean not null default true
);

-- Phone is the identity of a customer (customer.service.js looks customers up by it).
create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null unique,
  email      text,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references customers (id),
  service_id       uuid not null references services (id),
  appointment_date date not null,
  appointment_time time not null,
  status           text not null default 'pending',
  notes            text,
  created_at       timestamptz not null default now(),
  constraint appointments_status_check
    check (status in ('pending', 'confirmed', 'rejected', 'completed', 'cancelled'))
);

create index if not exists appointments_date_time_idx on appointments (appointment_date, appointment_time);
create index if not exists appointments_customer_idx on appointments (customer_id);

-- Row level security: only the backend talks to the database, using the service-role key (which bypasses RLS).
-- Enabling RLS with no policies means the public anon key can read or write nothing, even if it leaks to a browser.
alter table shop_settings enable row level security;
alter table services      enable row level security;
alter table customers     enable row level security;
alter table appointments  enable row level security;
