-- ADDITIVE ONLY: creates one NEW table. It does not alter, update, delete, truncate or drop anything that already
-- exists - no existing table, column, index, constraint, policy or row is touched, so there is no data-loss risk.
-- Safe to run more than once (`if not exists`).
--
-- Why: customers are keyed by phone and their name/email are never overwritten, so a booking made with someone
-- else's phone number used to show that person's name. This table keeps the name/phone/email typed on each booking.
-- Old appointments simply have no row here; the backend falls back to the customer record for them.
--
-- Depends on: appointments(id) being the primary key (the backend already relies on this).

create table if not exists appointment_contacts (
  -- on delete cascade: deleting an appointment (e.g. from the Supabase dashboard) must never be blocked by this table.
  appointment_id uuid primary key references appointments (id) on delete cascade,
  contact_name   text,
  contact_phone  text,
  contact_email  text,
  created_at     timestamptz not null default now()
);

-- Only the backend (service-role key, which bypasses RLS) uses this table. Enabling RLS with no policies on this NEW
-- table keeps the public anon key from reading customer contact details.
alter table appointment_contacts enable row level security;
