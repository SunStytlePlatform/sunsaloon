# SunSaloon

Salon appointment booking: an Express API (`backend/`) that also serves the Next.js site (`frontend/`) from one process.

See [API.md](API.md), [server_architecture.md](server_architecture.md) and [UI_architecture.md](UI_architecture.md).

## Run locally

```bash
cp .env.example .env        # then fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_API_KEY
npm install --prefix backend
npm install --prefix frontend
npm run dev:backend         # API (and the site, if the frontend is installed) on http://localhost:5000
```

Tests: `npm test --prefix backend` (unit + API integration tests; they use an in-memory fake Supabase, no credentials needed).
Frontend checks: `npm run typecheck --prefix frontend`, `npm run lint --prefix frontend`.

## Database

**Merging or deploying this repo never changes your database.** The SQL lives in [database/manual-sql](database/manual-sql),
a folder that nothing executes (not CI, not a deploy script, not the backend). It is deliberately *not* in
`supabase/migrations/`, which Supabase's GitHub integration would apply automatically on merge. You run the files by hand,
when you decide to.

The SQL is also **additive only**: each file creates one new table and nothing else. No existing table, column, index,
constraint or row is altered, updated, deleted, truncated or dropped, so running them cannot lose or change existing data
(a test, `backend/tests/migrations.test.js`, enforces this).

- `001_appointment_contacts.sql`: new table keeping the name/phone/email typed on each booking.
- `002_appointment_slot_locks.sql`: new table that lets the database decide two simultaneous bookings for one slot.

Both are optional: if a table is missing the backend logs a warning and keeps working (without that feature), so the
code can be deployed before or after the SQL is applied.

**To apply them, follow the step-by-step [runbook](database/manual-sql/RUNBOOK.md)**: a pre-check, each file, a check after
each, and a final check that proves your existing tables are unchanged. All check queries are read-only.
Security notes for stored customer text: [docs/SECURITY.md](docs/SECURITY.md).

## Deploying (production checklist)

- `APP_ENV=production`, `LOG_LEVEL=info` (debug logs include IP addresses and request details).
- `ADMIN_API_KEY`: at least 24 random characters. Without it every admin endpoint answers 403.
- `NEXT_PUBLIC_API_BASE_URL`: leave **empty**. It is compiled into the browser bundle at build time; a localhost value breaks booking for real visitors.
- **Reverse proxy / load balancer:** set `TRUST_PROXY` to the number of proxies in front of the app (Render sets it to 1 automatically).
  If it is missing behind a proxy, all visitors share one IP and therefore one rate-limit bucket; if it is set while the app is
  exposed directly, clients can spoof their IP. The server logs a warning at startup when it looks unset.
- Rate limits, idempotency keys and the diagnostics cache live in process memory. With more than one instance, move them to a shared store (e.g. Redis).
- Salon hours and slot length: `SALON_OPENING_TIME`, `SALON_CLOSING_TIME`, `BOOKING_SLOT_MINUTES`, `BOOKING_MAX_ADVANCE_DAYS`, `SALON_TIMEZONE`.
- Commit the `package-lock.json` files so installs are reproducible.
