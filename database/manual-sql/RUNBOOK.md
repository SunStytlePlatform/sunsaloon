# Runbook: add two new tables to Supabase (nothing is deleted or changed)

**Who:** the person who owns the Supabase project. **Time:** about 15 minutes. **Risk:** none for your existing data (details below).
Nothing here runs by itself. You copy each file into the Supabase **SQL Editor** and click **Run**, one step at a time.

## What this does, in plain words

It adds **two new, empty tables** next to your existing ones:

| New table | What it is for |
|---|---|
| `appointment_contacts` | remembers the name, phone and email typed on each booking (so a booking made with someone else's phone number shows the right name) |
| `appointment_slot_locks` | lets the database settle two people booking the same date + time at the same instant (only one active booking per slot) |

## What it does NOT do

- It does **not** delete, drop, truncate, update, rename or alter **anything** that exists: no table, column, row, index, constraint or policy of `customers`, `appointments`, `services` or `shop_settings`.
- It does **not** touch your existing data. Existing bookings stay exactly as they are. Old bookings simply have no row in the new tables, and the app handles that.
- It cannot fail because of old data (for example, old double bookings are ignored).
- It is safe to run twice. Running it again changes nothing.
- The app does not need it: if you skip it, everything keeps working and the server logs a warning that those two features are off.

Two honest technical notes: creating a new table that points at `appointments` makes PostgreSQL take a **very short lock** on `appointments` (a fraction of a second), so run it when the salon is not busy. And PostgreSQL keeps its own internal foreign-key bookkeeping for that link; it is invisible and does not change your columns, rows or settings.

## What you need

- Access to the Supabase project (dashboard -> **SQL Editor**). Use the project that your live website uses.
- The files in this folder: `001_appointment_contacts.sql`, `002_appointment_slot_locks.sql` and the four files in `checks/`.

## How to read the check results

Each check file returns one table with a **verdict** column:

| Verdict | Meaning |
|---|---|
| `OK` | good |
| `STOP` | do not continue. Copy the whole result table and send it to the developer. |
| `NOTE` | write the value down, you need it in Step 6 |
| `INFO` | for your information, nothing to do |
| `PASTE` | you have not pasted your "before" values yet (Step 6) |

All check files are **read-only**: they cannot change anything.

---

## Step 0 - Back up (2 minutes, recommended)

Even though nothing existing is changed, a backup is good practice.
Supabase dashboard -> **Database** -> **Backups** (check that a recent backup exists, or take one if your plan allows).
If your plan has no backups: **Table Editor** -> open `customers` and `appointments` -> **Export** -> CSV.

## Step 1 - Pre-check (read-only)

1. Open **SQL Editor** -> **New query**.
2. Open `checks/00_pre_check.sql`, copy everything, paste it, click **Run**.
3. Every row with step 1 to 5 must say `OK`.
4. **Write down** the rows marked `NOTE`: the four `Rows in ...` numbers and the four `Fingerprint of ...` values (a short code like `042404d21b`). Keep this page; you need them in Step 6.
5. If any row says `STOP`, or you see an error like `relation "public.customers" does not exist`: **stop here** and send the result to the developer.

## Step 2 - Create the first new table

1. New query -> paste the contents of `001_appointment_contacts.sql` -> **Run**.
2. Expected: "Success. No rows returned".

## Step 3 - Check it (read-only)

1. New query -> paste `checks/01_after_001.sql` -> **Run**.
2. Every row must be `OK` (the last row is `INFO`). If anything says `STOP`: stop and send the result.

## Step 4 - Create the second new table

1. New query -> paste the contents of `002_appointment_slot_locks.sql` -> **Run**.
2. Expected: "Success. No rows returned".

## Step 5 - Check it (read-only)

1. New query -> paste `checks/02_after_002.sql` -> **Run**.
2. Every row must be `OK` (the last row is `INFO`). If anything says `STOP`: stop and send the result.

## Step 6 - Final check: prove nothing existing changed (read-only)

1. Open `checks/99_final_check.sql`.
2. Near the top, find the block **PASTE YOUR VALUES HERE**. For each of the four tables replace `PASTE_FINGERPRINT` with the fingerprint you wrote down in Step 1, and replace `0` with the `Rows in ...` number you wrote down. Example:

   `('customers', '042404d21b', 118),`

3. Copy the whole file into a new query -> **Run**.
4. Every row must say `OK`:
   - "Structure of ... is unchanged" = the table is exactly as before.
   - "Rows in ... (no rows lost)" = the count is the same or higher (new bookings in the meantime are fine; lower would be `STOP`).
5. If a row says `STOP`, send the result to the developer. If rows say `PASTE`, you have not pasted the values yet.

## Step 7 - Try it (optional, 2 minutes)

1. Make one test booking on the website.
2. In SQL Editor run these read-only lookups:

   ```sql
   select * from appointment_contacts order by created_at desc limit 5;
   select * from appointment_slot_locks order by created_at desc limit 5;
   ```

   You should see one row each for the test booking.
3. If the server log still says a table is "not available", Supabase's API has not noticed the new tables yet. Run this once; it only tells the API to refresh its list and changes no data:

   ```sql
   notify pgrst, 'reload schema';
   ```

---

## If something goes wrong

- **Nothing needs to be rolled back.** The two tables are new and optional. Leaving them in place is harmless.
- **Please do not drop or delete the new tables** (they will hold customer contact details once people book). Send the result of the check that said `STOP` and the error message to the developer instead.
- `relation "appointments" does not exist` -> you are in the wrong project or schema.
- `there is no unique constraint matching given keys` or a type error when running 001 or 002 -> `appointments.id` is not a uuid primary key. Step 1 would have said `STOP`. Send the result.
- `permission denied` -> run it as the project owner in the SQL Editor (not through an API key).

## How this was tested

The same files run automatically on every change in this repository against a real PostgreSQL engine with a sample "existing" database
(`backend/tests/sql.postgres.test.js`): all four existing tables have identical contents row by row after both migrations,
running them twice changes nothing, the new tables behave as the app expects, deleting an appointment is never blocked,
and the check files give `STOP` when something is wrong. It was **not** run against your real Supabase project, which is why Steps 1 and 6 exist.
