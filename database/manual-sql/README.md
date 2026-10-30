# Manual SQL - NOT applied automatically

**Start with [RUNBOOK.md](RUNBOOK.md): a step-by-step guide with checks before and after.**

These files are **reference SQL that you run by hand**. Nothing in this repository executes them: no script, no CI job,
no deploy step, and the backend cannot run SQL (it only talks to Supabase's REST API).

They are deliberately **not** in `supabase/migrations/`. If your Supabase project is connected to this GitHub repo
(Supabase dashboard -> Integrations -> GitHub), Supabase applies every file in `supabase/migrations/` automatically when
a branch is merged. Keeping them here means merging this repository can never change your database.

## What they do

Each file only creates one **new** table (`create table if not exists`). Nothing existing is altered, updated, deleted,
truncated or dropped, and they cannot fail because of existing data. Re-running them is safe.

| File | New table | Purpose |
|---|---|---|
| `001_appointment_contacts.sql` | `appointment_contacts` | name/phone/email typed on each booking |
| `002_appointment_slot_locks.sql` | `appointment_slot_locks` | lets the database settle two simultaneous bookings for one slot (rows are released by a timestamp, never deleted) |

Both are optional: without them the backend logs a warning and keeps working without that feature.

## Read-only check queries (`checks/`)

| File | Run | Purpose |
|---|---|---|
| `00_pre_check.sql` | before | confirms your database is what the migrations expect and records a fingerprint of your existing tables |
| `01_after_001.sql` | after 001 | confirms the first new table is correct |
| `02_after_002.sql` | after 002 | confirms the second new table is correct |
| `99_final_check.sql` | last | proves your four existing tables are unchanged |

## Guard

`backend/tests/migrations.test.js` fails if these files ever contain a drop, truncate, delete, update, insert, alter of an
existing table or an index change, if a check file is not a single read-only SELECT, and if a `supabase/migrations` folder,
`supabase/config.toml` or a CI step that applies SQL is added to the repo. `backend/tests/sql.postgres.test.js` runs the real
SQL on a real PostgreSQL engine.
