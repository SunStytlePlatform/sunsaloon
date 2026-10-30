-- ADDITIVE ONLY: creates one NEW table. It does not alter, update, delete, truncate or drop anything that already
-- exists - no existing table, column, index, constraint, policy or row is touched, so there is no data-loss risk.
-- It is also safe to run on a database that already contains duplicate or overlapping appointments (nothing is
-- validated against existing rows). Safe to run more than once (`if not exists`).
--
-- Why: two customers sending the same date + time at the same instant must not both get it. The backend inserts a
-- row here for every new pending/confirmed appointment; the unique constraint lets the database decide a race.
-- The backend removes the row when the appointment is rejected, cancelled or completed, and it ignores a stale row
-- whose appointment is no longer active. Existing appointments are still checked through the appointments table.
--
-- Depends on: appointments(id) being the primary key.

create table if not exists appointment_slot_locks (
  -- on delete cascade: deleting an appointment frees its slot and is never blocked by this table.
  appointment_id   uuid primary key references appointments (id) on delete cascade,
  appointment_date date not null,
  appointment_time time not null,
  created_at       timestamptz not null default now(),
  constraint appointment_slot_locks_unique_slot unique (appointment_date, appointment_time)
);

alter table appointment_slot_locks enable row level security;
