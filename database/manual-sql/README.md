# Manual SQL - NOT applied automatically

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
| `002_appointment_slot_locks.sql` | `appointment_slot_locks` | lets the database settle two simultaneous bookings for one slot |

Both are optional: without them the backend logs a warning and keeps working without that feature.

## How to apply (only when you decide to)

1. Open the Supabase dashboard -> SQL Editor.
2. Read the file, paste it, run it. Do `001` first, then `002`.
3. Nothing else is needed: the backend notices the tables on the next request.

## Guard

`backend/tests/migrations.test.js` fails if these files ever contain a drop, truncate, delete, update, insert, alter of an
existing table or an index change, and if a `supabase/migrations` folder, `supabase/config.toml` or a CI step that applies
SQL is added to the repo.
