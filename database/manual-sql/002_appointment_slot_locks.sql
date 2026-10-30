-- ADDITIVE ONLY: creates one NEW table. It does not alter, update, delete, truncate or drop anything that already
-- exists - no existing table, column, index, constraint, policy or row is touched, so there is no data-loss risk.
-- It is also safe to run on a database that already contains duplicate or overlapping appointments (nothing is
-- validated against existing rows). Safe to run more than once (`if not exists`).
--
-- Why: two customers sending the same date + time at the same instant must not both get it. The backend adds a row
-- here for every new pending/confirmed appointment; the exclusion constraint below lets the database decide a race
-- (it allows only ONE active row per date + time, exactly like a unique rule).
-- Rows are never deleted by the backend: when an appointment is rejected, cancelled or completed its row is only
-- marked with `released_at`, which frees the slot. Existing appointments are still checked through the appointments
-- table, so bookings made before this table existed keep blocking their slots.
--
-- Depends on: appointments(id) being a uuid primary key (the pre-check in checks/00_pre_check.sql verifies this).

create table if not exists appointment_slot_locks (
  -- on delete cascade: deleting an appointment (e.g. from the Supabase dashboard) is never blocked by this table;
  -- only this table's own row for that appointment goes with it.
  appointment_id   uuid primary key references appointments (id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  released_at      timestamptz,
  created_at       timestamptz not null default now(),
  -- One ACTIVE (not released) row per date + time. A released row no longer counts.
  constraint appointment_slot_locks_one_active_per_slot
    exclude using btree (appointment_date with =, appointment_time with =) where (released_at is null)
);

-- Only the backend (service-role key, which bypasses RLS) uses this table. Enabling RLS with no policies on this NEW
-- table keeps the public anon key from reading it.
alter table appointment_slot_locks enable row level security;
