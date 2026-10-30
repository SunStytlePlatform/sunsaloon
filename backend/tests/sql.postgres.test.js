import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

// Runs the real SQL in database/manual-sql on a real Postgres engine (PGlite = Postgres compiled to WASM, in memory,
// nothing is installed or contacted) against a sample "existing" database, and proves the migrations change nothing
// that already exists.
const dir = path.resolve(import.meta.dirname, '../../database/manual-sql');
const read = (file) => readFileSync(path.join(dir, file), 'utf8');
const verdicts = (rows) => rows.map((r) => r.verdict);

async function legacyDb({ apptIdType = 'uuid' } = {}) {
  const db = new PGlite();
  await db.exec(`
    create table shop_settings (id uuid primary key default gen_random_uuid(), shop_name text not null, phone text, address text, email text, description text, logo_url text);
    create table services (id uuid primary key default gen_random_uuid(), name text not null, description text, price numeric(10,2), duration_minutes int, is_active boolean not null default true);
    create table customers (id uuid primary key default gen_random_uuid(), name text not null, phone text not null unique, email text, created_at timestamptz default now());
    create table appointments (
      id ${apptIdType} primary key ${apptIdType === 'uuid' ? 'default gen_random_uuid()' : ''},
      customer_id uuid references customers(id), service_id uuid references services(id),
      appointment_date date not null, appointment_time time not null,
      status text not null default 'pending' check (status in ('pending','confirmed','rejected','completed','cancelled')),
      notes text, created_at timestamptz default now(), legacy_extra_column text);
    create index appointments_date_idx on appointments(appointment_date);
    insert into shop_settings (shop_name) values ('Sun Saloon');
    insert into services (name, price, duration_minutes) values ('Haircut', 200, 30), ('Color', 900, 90);
    insert into customers (name, phone, email) values ('A','9000000001','a@x.com'),('B','9000000002',null),('C','9000000003','c@x.com');
  `);
  if (apptIdType === 'uuid') {
    // Includes OLD duplicate active bookings for one slot: the migrations must not care about existing data.
    await db.exec(`
      insert into appointments (customer_id, service_id, appointment_date, appointment_time, status)
      select c.id, s.id, '2027-01-10', '10:00', 'pending' from customers c, services s where c.phone in ('9000000001','9000000002') and s.name='Haircut';
      insert into appointments (customer_id, service_id, appointment_date, appointment_time, status)
      select c.id, s.id, '2027-01-11', '11:00', 'confirmed' from customers c, services s where c.phone='9000000003' and s.name='Color';
    `);
  }
  return db;
}

// Every row of the four existing tables as one checksum per table.
async function snapshot(db) {
  const out = {};
  for (const table of ['customers', 'appointments', 'services', 'shop_settings']) {
    const { rows } = await db.query(`select count(*)::int as n, coalesce(md5(string_agg(x::text, '|' order by x::text)), '') as h from ${table} x`);
    out[table] = rows[0];
  }
  return out;
}

// Check files must be read-only: run them inside a READ ONLY transaction, where any write would raise an error.
async function runCheck(db, file, sql = read(`checks/${file}`)) {
  await db.exec('begin read only');
  try {
    return (await db.query(sql)).rows;
  } finally {
    await db.exec('rollback');
  }
}

const pasteBefore = (sql, fingerprints, counts) =>
  sql.replace(/\('(\w+)',\s+'PASTE_FINGERPRINT', 0\)/g, (_, table) => `('${table}', '${fingerprints[table]}', ${counts[table]})`);

test('the migrations leave every existing table byte-for-byte unchanged, and the checks agree', async () => {
  const db = await legacyDb();
  const before = await snapshot(db);

  const pre = await runCheck(db, '00_pre_check.sql');
  assert.ok(!verdicts(pre).includes('STOP'), 'pre-check has no STOP');
  const fingerprints = Object.fromEntries(pre.filter((r) => r.check_name.startsWith('Fingerprint of ')).map((r) => [r.check_name.slice(15), r.actual]));
  const counts = Object.fromEntries(pre.filter((r) => r.check_name.startsWith('Rows in ')).map((r) => [r.check_name.slice(8), Number(r.actual)]));
  assert.equal(Object.keys(fingerprints).length, 4);

  await db.exec(read('001_appointment_contacts.sql'));
  assert.ok(verdicts(await runCheck(db, '01_after_001.sql')).every((v) => ['OK', 'INFO'].includes(v)));
  await db.exec(read('002_appointment_slot_locks.sql'));
  assert.ok(verdicts(await runCheck(db, '02_after_002.sql')).every((v) => ['OK', 'INFO'].includes(v)));

  const finalSql = read('checks/99_final_check.sql');
  assert.ok(verdicts(await runCheck(db, '99_final_check.sql')).includes('PASTE'), 'asks for the before-values first');
  assert.ok(verdicts(await runCheck(db, '99', pasteBefore(finalSql, fingerprints, counts))).every((v) => v === 'OK'));

  assert.deepEqual(await snapshot(db), before, 'no existing row or column changed');
});

test('running the migrations again changes nothing', async () => {
  const db = await legacyDb();
  await db.exec(read('001_appointment_contacts.sql'));
  await db.exec(read('002_appointment_slot_locks.sql'));
  const once = await snapshot(db);
  await db.exec(read('001_appointment_contacts.sql'));
  await db.exec(read('002_appointment_slot_locks.sql'));
  assert.deepEqual(await snapshot(db), once);
});

test('the new tables behave the way the backend relies on', async () => {
  const db = await legacyDb();
  await db.exec(read('001_appointment_contacts.sql'));
  await db.exec(read('002_appointment_slot_locks.sql'));
  const [a1, a2] = (await db.query('select id from appointments order by id limit 2')).rows.map((r) => r.id);
  const [confirmed] = (await db.query("select id from appointments where status = 'confirmed'")).rows.map((r) => r.id);
  const lock = (id) => db.query("insert into appointment_slot_locks (appointment_id, appointment_date, appointment_time) values ($1, '2027-02-01', '09:00')", [id]);

  await lock(a1);
  await assert.rejects(lock(a2), (error) => error.code === '23P01', 'a second ACTIVE lock for the slot is refused (exclusion violation)');
  await db.query('update appointment_slot_locks set released_at = now() where appointment_id = $1', [a1]);
  await lock(a2); // after release (an UPDATE, never a delete) the slot can be taken again

  await db.query("insert into appointment_contacts (appointment_id, contact_name, contact_phone) values ($1, 'Mallory', '9000000001')", [confirmed]);
  await db.query('delete from appointments where id = $1', [confirmed]); // an admin deleting an appointment is not blocked
  assert.equal((await db.query('select count(*)::int n from appointment_contacts')).rows[0].n, 0);
});

test('the pre-check says STOP on an unsupported database, and the final check catches a changed table', async () => {
  const wrong = await legacyDb({ apptIdType: 'bigint' });
  assert.ok(verdicts(await runCheck(wrong, '00_pre_check.sql')).includes('STOP'));

  const db = await legacyDb();
  const pre = await runCheck(db, '00_pre_check.sql');
  const fingerprints = Object.fromEntries(pre.filter((r) => r.check_name.startsWith('Fingerprint of ')).map((r) => [r.check_name.slice(15), r.actual]));
  const counts = Object.fromEntries(pre.filter((r) => r.check_name.startsWith('Rows in ')).map((r) => [r.check_name.slice(8), Number(r.actual)]));
  await db.exec(read('001_appointment_contacts.sql'));
  await db.exec(read('002_appointment_slot_locks.sql'));
  await db.exec('alter table customers add column sneaky text'); // someone changes an existing table
  const result = await runCheck(db, '99', pasteBefore(read('checks/99_final_check.sql'), fingerprints, counts));
  assert.ok(result.some((r) => r.verdict === 'STOP' && r.check_name.includes('customers')));
});
