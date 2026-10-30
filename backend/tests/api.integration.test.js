import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startFakeSupabase, SERVICE_ID, OPTIONAL_TABLES } from './helpers/fakeSupabase.js';
import { getNowInTimeZone } from '../utils/dateTime.js';

const ADMIN_KEY = 'test-admin-key-0123456789abcdef';
const fake = await startFakeSupabase();

// Config is read when the modules load, so set it before importing the app.
process.env.SUPABASE_URL = fake.url;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.ADMIN_API_KEY = ADMIN_KEY;
process.env.BOOKING_RATE_LIMIT_MAX = '1000';
process.env.LOG_LEVEL = 'none';
process.env.APP_ENV = 'production';

const { default: app } = await import('../app.js');
const { connectDB } = await import('../config/db.js');
const { env } = await import('../config/env.js');
await connectDB();

let server;
let base;
before(async () => {
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  await fake.close();
});
beforeEach(() => fake.reset());

const admin = { Authorization: `Bearer ${ADMIN_KEY}` };
const call = async (path, { method = 'GET', headers = {}, body } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, headers: res.headers, json: await res.json().catch(() => null) };
};
// A date inside the booking window, in the salon's time zone (defaults to Asia/Kolkata).
const futureDate = (daysAhead) => {
  const { date } = getNowInTimeZone(env.salonTimeZone);
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + daysAhead)).toISOString().slice(0, 10);
};
const booking = (overrides = {}) => ({
  customer_name: 'Alice',
  customer_phone: '9000000001',
  customer_email: 'alice@example.com',
  service_id: SERVICE_ID,
  appointment_date: futureDate(14),
  appointment_time: '10:00',
  ...overrides,
});
const book = (overrides, headers) => call('/api/appointments', { method: 'POST', body: booking(overrides), headers });

test('admin endpoints reject missing and wrong credentials, accept the key', async () => {
  assert.equal((await call('/api/appointments')).status, 401);
  assert.equal((await call('/api/appointments', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  assert.equal((await call('/api/appointments', { headers: { Authorization: ADMIN_KEY } })).status, 401);
  const ok = await call('/api/appointments', { headers: admin });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json.data, []);
});

test('admin endpoints stay closed when ADMIN_API_KEY is not configured', async (t) => {
  const original = env.adminApiKey;
  t.after(() => { env.adminApiKey = original; });
  env.adminApiKey = '';
  const res = await call('/api/appointments', { headers: admin });
  assert.equal(res.status, 403);
  assert.equal(res.json.error.code, 'ADMIN_ACCESS_DISABLED');
});

test('status update needs the admin key too', async () => {
  const created = (await book()).json.data;
  const url = `/api/appointments/${created.id}/status`;
  assert.equal((await call(url, { method: 'PATCH', body: { status: 'confirmed' } })).status, 401);
  const ok = await call(url, { method: 'PATCH', headers: admin, body: { status: 'confirmed' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.data.status, 'confirmed');
});

test('the same date and time cannot be booked twice', async () => {
  const first = await book();
  assert.equal(first.status, 201);
  const second = await book({ customer_name: 'Bob', customer_phone: '9000000002' });
  assert.equal(second.status, 409);
  assert.equal(second.json.error.code, 'SLOT_TAKEN');
  assert.equal(fake.tables().appointments.length, 1);
  assert.equal(fake.tables().customers.length, 1, 'a taken slot must not leave a stray customer row');
});

test('a different time on the same day is still bookable', async () => {
  assert.equal((await book()).status, 201);
  assert.equal((await book({ customer_phone: '9000000002', appointment_time: '10:30' })).status, 201);
});

test('a rejected appointment frees its slot', async () => {
  const first = (await book()).json.data;
  await call(`/api/appointments/${first.id}/status`, { method: 'PATCH', headers: admin, body: { status: 'rejected' } });
  assert.equal((await book({ customer_phone: '9000000002' })).status, 201);
});

test('simultaneous bookings for one slot produce exactly one success', async () => {
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) => book({ customer_name: `User${i}`, customer_phone: `91000000${String(i).padStart(2, '0')}` })),
  );
  const statuses = results.map((r) => r.status);
  assert.equal(statuses.filter((s) => s === 201).length, 1);
  assert.equal(statuses.filter((s) => s === 409).length, 7);
  assert.ok(results.filter((r) => r.status === 409).every((r) => r.json.error.code === 'SLOT_TAKEN'));
});

test('public booking response does not expose the internal customer id', async () => {
  const res = await book();
  assert.equal(res.status, 201);
  assert.equal('customer_id' in res.json.data, false);
  assert.equal(res.json.data.status, 'pending');
});

test('booking with an existing phone keeps the details typed on that booking', async () => {
  await book();
  const mallory = await book({ customer_name: 'Mallory', customer_email: 'm@example.com', appointment_time: '11:00' });
  assert.equal(mallory.status, 201);

  const list = await call('/api/appointments', { headers: admin });
  const byTime = Object.fromEntries(list.json.data.map((a) => [a.appointment_time, a.customer]));
  assert.equal(byTime['10:00'].name, 'Alice');
  assert.equal(byTime['10:00'].email, 'alice@example.com');
  assert.equal(byTime['11:00'].name, 'Mallory');
  assert.equal(byTime['11:00'].email, 'm@example.com');
  assert.equal(byTime['11:00'].phone, '9000000001');
  assert.equal(list.json.data.some((a) => 'contact_name' in a), false, 'contact_* columns are folded into customer');
});

test('API and diagnostics responses carry security headers', async () => {
  const res = await call('/api/shops');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('content-security-policy'), "default-src 'none'; frame-ancestors 'none'");
  assert.ok(res.headers.get('x-frame-options'));
  assert.ok(res.headers.get('referrer-policy'));
  assert.equal(res.headers.get('x-powered-by'), null);
  const health = await call('/suns/health');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
});

test('slots outside opening hours, off the slot grid or too far ahead are rejected with a field error', async () => {
  const early = await book({ appointment_time: '07:00' });
  assert.equal(early.status, 422);
  assert.equal(early.json.error.code, 'OUTSIDE_OPENING_HOURS');
  assert.equal(early.json.error.details[0].field, 'appointment_time');

  assert.equal((await book({ appointment_time: '21:00' })).json.error.code, 'OUTSIDE_OPENING_HOURS');
  assert.equal((await book({ appointment_time: '03:00' })).json.error.code, 'OUTSIDE_OPENING_HOURS');
  assert.equal((await book({ appointment_time: '10:15' })).json.error.code, 'INVALID_SLOT');

  const far = await book({ appointment_date: '9999-12-31' });
  assert.equal(far.status, 422);
  assert.equal(far.json.error.code, 'TOO_FAR_AHEAD');
  assert.equal(far.json.error.details[0].field, 'appointment_date');

  assert.equal((await book({ appointment_time: '20:30' })).status, 201, 'the last slot before closing is allowed');
  assert.equal(fake.tables().appointments.length, 1);
});

test('one phone number cannot hold more than the allowed number of active bookings', async () => {
  for (const time of ['09:00', '09:30', '10:00']) assert.equal((await book({ appointment_time: time })).status, 201);
  const blocked = await book({ appointment_time: '10:30' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.error.code, 'TOO_MANY_ACTIVE_BOOKINGS');

  // Rejecting one frees a place.
  const first = fake.tables().appointments[0];
  await call(`/api/appointments/${first.id}/status`, { method: 'PATCH', headers: admin, body: { status: 'rejected' } });
  assert.equal((await book({ appointment_time: '10:30' })).status, 201);
});

test('names that are empty after cleaning or a single character are rejected', async () => {
  const controlOnly = await book({ customer_name: '\u0001\u0002' });
  assert.equal(controlOnly.status, 422);
  assert.equal(controlOnly.json.error.details[0].field, 'customer_name');
  assert.equal((await book({ customer_name: 'x' })).status, 422);
  assert.equal((await book({ customer_name: 'Xi' })).status, 201);
});

test('a filled honeypot field is dropped silently without storing anything', async () => {
  const res = await call('/api/appointments', { method: 'POST', body: { ...booking(), website: 'http://spam.example' } });
  assert.equal(res.status, 201);
  // Same shape as a real booking, so a bot cannot tell it was caught.
  assert.deepEqual(Object.keys(res.json.data).sort(), Object.keys((await book({ customer_phone: '9000000099' })).json.data).sort());
  assert.equal(res.json.data.status, 'pending');
  assert.equal(fake.tables().appointments.length, 1, 'only the real booking above was stored');
  assert.equal(fake.tables().customers.length, 1, 'the bot created no customer of its own');
});

test('a retried booking with the same Idempotency-Key replays the first response', async () => {
  const headers = { 'Idempotency-Key': 'retry-key-0001' };
  const first = await book({}, headers);
  assert.equal(first.status, 201);
  const second = await book({}, headers);
  assert.equal(second.status, 201);
  assert.equal(second.headers.get('idempotent-replay'), 'true');
  assert.equal(second.json.data.id, first.json.data.id);
  assert.equal(fake.tables().appointments.length, 1);
});

test('the same Idempotency-Key with a different body is refused', async () => {
  const headers = { 'Idempotency-Key': 'retry-key-0002' };
  assert.equal((await book({}, headers)).status, 201);
  const other = await book({ appointment_time: '11:00' }, headers);
  assert.equal(other.status, 422);
  assert.equal(other.json.error.code, 'IDEMPOTENCY_KEY_REUSED');
});

test('simultaneous duplicates with one Idempotency-Key book exactly once', async () => {
  const headers = { 'Idempotency-Key': 'retry-key-0003' };
  const results = await Promise.all(Array.from({ length: 5 }, () => book({}, headers)));
  assert.ok(results.every((r) => r.status === 201));
  assert.equal(new Set(results.map((r) => r.json.data.id)).size, 1);
  assert.equal(fake.tables().appointments.length, 1);
});

test('a failed attempt does not burn the Idempotency-Key', async () => {
  const headers = { 'Idempotency-Key': 'retry-key-0004' };
  assert.equal((await book({ customer_name: 'x' }, headers)).status, 422);
  assert.equal((await book({ customer_name: 'Alice' }, headers)).status, 201);
});

test('a malformed Idempotency-Key is rejected', async () => {
  const res = await book({}, { 'Idempotency-Key': 'short' });
  assert.equal(res.status, 400);
  assert.equal(res.json.error.code, 'INVALID_IDEMPOTENCY_KEY');
});

test('public diagnostics hide details, admin sees them', async () => {
  const dbPublic = await call('/suns/db');
  assert.deepEqual(dbPublic.json, { connected: true });
  const dbAdmin = await call('/suns/db', { headers: admin });
  assert.equal(dbAdmin.json.connected, true);
  assert.ok(dbAdmin.json.message);

  const healthPublic = await call('/suns/health');
  assert.equal('customMessage' in healthPublic.json, false);
  const healthAdmin = await call('/suns/health', { headers: admin });
  assert.equal('customMessage' in healthAdmin.json, true);
});

test('booking rules are public', async () => {
  const res = await call('/api/booking-rules');
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.json.data).sort(), ['closingTime', 'maxAdvanceDays', 'openingTime', 'slotIntervalMinutes', 'timeZone']);
});

test('API responses are never cacheable', async () => {
  assert.equal((await call('/api/shops')).headers.get('cache-control'), 'no-store');
  assert.equal((await call('/api/appointments', { headers: admin })).headers.get('cache-control'), 'no-store');
  assert.equal((await call('/suns/health')).headers.get('cache-control'), 'no-store');
});

const activeCount = () => fake.tables().appointments.filter((a) => ['pending', 'confirmed'].includes(a.status)).length;

test('a race loser is closed as rejected and never deleted', async () => {
  const results = await Promise.all(
    Array.from({ length: 6 }, (_, i) => book({ customer_name: `Racer${i}`, customer_phone: `93000000${String(i).padStart(2, '0')}` })),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(activeCount(), 1, 'exactly one active appointment holds the slot');
  assert.equal(fake.tables().appointment_slot_locks.length, 1);
  const rejected = fake.tables().appointments.filter((a) => a.status === 'rejected');
  assert.ok(rejected.length >= 1, 'losing requests stay in the table as rejected, not deleted');
});

test('a stale slot lock (appointment changed outside the API) does not block the slot', async () => {
  const first = (await book()).json.data;
  // Someone sets the appointment to rejected directly in the database: the lock row is left behind.
  fake.tables().appointments.find((a) => a.id === first.id).status = 'rejected';
  assert.equal(fake.tables().appointment_slot_locks.length, 1);
  const again = await book({ customer_phone: '9000000002' });
  assert.equal(again.status, 201);
  assert.equal(fake.tables().appointment_slot_locks.length, 1);
  assert.equal(fake.tables().appointment_slot_locks[0].appointment_id, again.json.data.id);
});

test('an existing active appointment without a lock row still blocks its slot (pre-migration data)', async () => {
  const first = (await book()).json.data;
  fake.tables().appointment_slot_locks.length = 0; // as if it was booked before migration 002 existed
  const second = await book({ customer_phone: '9000000002' });
  assert.equal(second.status, 409);
  assert.equal(second.json.error.code, 'SLOT_TAKEN');
  assert.equal(activeCount(), 1);
  assert.ok(first.id);
});

test('releasing happens through the API: confirming keeps the lock, completing frees it', async () => {
  const first = (await book()).json.data;
  await call(`/api/appointments/${first.id}/status`, { method: 'PATCH', headers: admin, body: { status: 'confirmed' } });
  assert.equal(fake.tables().appointment_slot_locks.length, 1);
  await call(`/api/appointments/${first.id}/status`, { method: 'PATCH', headers: admin, body: { status: 'completed' } });
  assert.equal(fake.tables().appointment_slot_locks.length, 0);
});

test('everything keeps working when the optional migrations have not been applied', async () => {
  fake.withoutTables(...OPTIONAL_TABLES);

  const first = await book();
  assert.equal(first.status, 201, JSON.stringify(first.json));
  // Slot protection falls back to checking the appointments table.
  const clash = await book({ customer_phone: '9000000002' });
  assert.equal(clash.status, 409);
  assert.equal(clash.json.error.code, 'SLOT_TAKEN');

  const list = await call('/api/appointments', { headers: admin });
  assert.equal(list.status, 200);
  assert.equal(list.json.data.length, 1);
  assert.equal(list.json.data[0].customer.name, 'Alice', 'falls back to the customer record');

  const one = await call(`/api/appointments/${first.json.data.id}`, { headers: admin });
  assert.equal(one.status, 200);
  const updated = await call(`/api/appointments/${first.json.data.id}/status`, { method: 'PATCH', headers: admin, body: { status: 'rejected' } });
  assert.equal(updated.status, 200);
  assert.equal(updated.json.data.status, 'rejected');
});

test('the backend never writes to existing tables beyond new rows and status changes', async () => {
  await book();
  const [appointment] = fake.tables().appointments;
  // No new columns are written onto appointments (they would require an ALTER TABLE).
  assert.deepEqual(
    Object.keys(appointment).sort(),
    ['appointment_date', 'appointment_time', 'created_at', 'customer_id', 'id', 'notes', 'service_id', 'status'],
  );
  assert.equal(fake.tables().appointment_contacts.length, 1);
});

test('bot traffic cannot use up the idempotency store and lock real visitors out', async () => {
  // Honeypot hits with unique keys are answered without being remembered.
  for (let i = 0; i < 60; i++) {
    const res = await call('/api/appointments', {
      method: 'POST',
      headers: { 'Idempotency-Key': `bot-key-${String(i).padStart(6, '0')}` },
      body: { ...booking(), website: 'spam' },
    });
    assert.equal(res.status, 201);
  }
  // One client sending many distinct valid keys exceeds its own quota, but is never refused.
  const day = (n) => futureDate(10 + n);
  const statuses = [];
  for (let i = 0; i < 30; i++) {
    const res = await book(
      { customer_phone: `92000000${String(i).padStart(2, '0')}`, appointment_date: day(Math.floor(i / 20)), appointment_time: `${String(9 + (i % 20) / 2 | 0).padStart(2, '0')}:${i % 2 ? '30' : '00'}` },
      { 'Idempotency-Key': `visitor-key-${String(i).padStart(6, '0')}` },
    );
    statuses.push(res.status);
  }
  assert.ok(statuses.every((s) => s === 201), `statuses: ${statuses.join(' ')}`);
});

// Keep last: it locks this client's IP out of the admin endpoints.
test('repeated wrong admin keys are throttled, even for the correct key afterwards', async () => {
  const statuses = [];
  for (let i = 0; i < 12; i++) {
    statuses.push((await call('/api/appointments', { headers: { Authorization: `Bearer guess-${i}-aaaaaaaaaaaaaaaaaaaaaaaa` } })).status);
  }
  assert.ok(statuses.includes(429), `statuses: ${statuses.join(' ')}`);
  const locked = await call('/api/appointments', { headers: admin });
  assert.equal(locked.status, 429);
  assert.equal(locked.json.error.code, 'RATE_LIMITED');
});
