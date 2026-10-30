import http from 'node:http';
import { randomUUID } from 'node:crypto';

export const SERVICE_ID = '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f';
export const INACTIVE_SERVICE_ID = '4f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f';

// The two tables added by database/manual-sql 001 and 002. Tests can "un-apply" them to check the backend still works.
export const OPTIONAL_TABLES = ['appointment_contacts', 'appointment_slot_locks'];

const seed = () => ({
  shop_settings: [{ id: '5b0c8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f', shop_name: 'Sun Saloon', phone: '9876543210', address: '1 Main St', email: 'hi@example.com', description: 'desc', logo_url: null }],
  services: [
    { id: SERVICE_ID, name: 'Haircut', description: null, price: 200, duration_minutes: 30, is_active: true },
    { id: INACTIVE_SERVICE_ID, name: 'Hidden', description: null, price: 1, duration_minutes: 5, is_active: false },
  ],
  customers: [],
  appointments: [],
  appointment_contacts: [],
  appointment_slot_locks: [],
});

// Minimal PostgREST emulator (eq / in / gte filters, order, limit, single-object responses, embeds, delete) plus the
// database rules the backend relies on: unique customer phone, and one slot lock per date + time.
export async function startFakeSupabase() {
  let db = seed();
  let missing = new Set();
  let deletes = 0;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://fake');
    const send = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(body === undefined ? undefined : JSON.stringify(body));
    };
    if (url.pathname === '/auth/v1/health') return send(200, { ok: true });

    const table = /^\/rest\/v1\/(\w+)$/.exec(url.pathname)?.[1];
    if (!table || !db[table]) return send(404, { code: '42P01', message: 'unknown table' });
    if (missing.has(table)) {
      return send(404, { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` });
    }
    const select = url.searchParams.get('select') ?? '';
    for (const name of missing) {
      if (select.includes(name)) {
        return send(400, { code: 'PGRST200', message: `Could not find a relationship between '${table}' and '${name}' in the schema cache` });
      }
    }

    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      const wantsObject = (req.headers.accept ?? '').includes('vnd.pgrst.object');
      const reply = (rows, code = 200) => {
        if (!wantsObject) return send(code, rows);
        if (rows.length === 1) return send(code, rows[0]);
        return send(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
      };
      const embed = (row) => {
        if (table !== 'appointments') return row;
        const customer = db.customers.find((c) => c.id === row.customer_id);
        const service = db.services.find((s) => s.id === row.service_id);
        const contact = db.appointment_contacts.find((c) => c.appointment_id === row.id);
        return {
          ...row,
          customer: customer && { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
          service: service && { id: service.id, name: service.name, price: service.price, duration_minutes: service.duration_minutes },
          contact: contact ? { contact_name: contact.contact_name, contact_phone: contact.contact_phone, contact_email: contact.contact_email } : null,
        };
      };
      // Honour ?select=a,b,alias:table(...) like PostgREST does: only the listed columns (and embeds) come back.
      const project = (row) => {
        if (!select || select === '*') return row;
        const parts = select.replace(/\([^)]*\)/g, '').split(',').map((p) => p.trim()).filter(Boolean);
        const keep = new Set(parts.map((p) => p.split(':')[0].trim()));
        return Object.fromEntries(Object.entries(row).filter(([key]) => keep.has(key)));
      };
      const matches = (rows) => {
        for (const [column, value] of url.searchParams) {
          const eq = /^eq\.(.*)$/.exec(value);
          const inList = /^in\.\((.*)\)$/.exec(value);
          const gte = /^gte\.(.*)$/.exec(value);
          if (value === 'is.null') rows = rows.filter((r) => r[column] === null || r[column] === undefined);
          if (eq) rows = rows.filter((r) => String(r[column]).slice(0, eq[1].length) === eq[1]);
          if (inList) rows = rows.filter((r) => inList[1].split(',').includes(String(r[column])));
          if (gte) rows = rows.filter((r) => String(r[column]) >= gte[1]);
        }
        return rows;
      };
      const sameTime = (a, b) => String(a).slice(0, 5) === String(b).slice(0, 5);
      const duplicate = (name) => send(409, { code: '23505', message: `duplicate key value violates unique constraint "${name}"` });

      if (req.method === 'GET') {
        let rows = matches(db[table]);
        for (const column of url.searchParams.getAll('order').reverse()) {
          rows = [...rows].sort((a, b) => String(a[column] ?? '').localeCompare(String(b[column] ?? '')));
        }
        const limit = url.searchParams.get('limit');
        if (limit) rows = rows.slice(0, Number(limit));
        return reply(rows.map(embed).map(project));
      }

      if (req.method === 'POST') {
        const row = JSON.parse(raw);
        if (table === 'customers' && db.customers.some((c) => c.phone === row.phone)) return duplicate('customers_phone_key');
        if (table === 'appointments') {
          if (!db.customers.some((c) => c.id === row.customer_id)) return send(409, { code: '23503', message: 'foreign key violation' });
          // The real table has no slot rule of its own: that lives in appointment_slot_locks.
          row.appointment_time = `${row.appointment_time}:00`;
        }
        if (table === 'appointment_contacts' || table === 'appointment_slot_locks') {
          if (!db.appointments.some((a) => a.id === row.appointment_id)) return send(409, { code: '23503', message: 'foreign key violation' });
          if (db[table].some((r) => r.appointment_id === row.appointment_id)) return duplicate(`${table}_pkey`);
        }
        // Exclusion constraint: only one ACTIVE (released_at is null) lock per date + time. Postgres code 23P01.
        if (table === 'appointment_slot_locks'
          && db.appointment_slot_locks.some((l) => !l.released_at && l.appointment_date === row.appointment_date && sameTime(l.appointment_time, row.appointment_time))) {
          return send(409, { code: '23P01', message: 'conflicting key value violates exclusion constraint "appointment_slot_locks_one_active_per_slot"' });
        }
        const record = { id: randomUUID(), created_at: new Date().toISOString(), ...row };
        db[table].push(record);
        return reply([project(record)], 201);
      }

      if (req.method === 'PATCH') {
        const rows = matches(db[table]);
        const patch = JSON.parse(raw);
        rows.forEach((r) => Object.assign(r, patch));
        return reply(rows.map(embed).map(project));
      }

      if (req.method === 'DELETE') {
        deletes += 1; // the backend is not supposed to delete anything; tests assert this stays 0
        const doomed = new Set(matches(db[table]));
        db[table] = db[table].filter((r) => !doomed.has(r));
        return send(204);
      }

      send(405, {});
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    reset: () => { db = seed(); missing = new Set(); deletes = 0; },
    tables: () => db,
    deleteRequests: () => deletes,
    // Simulates a database where the optional migrations have not been applied.
    withoutTables: (...names) => { missing = new Set(names); },
    close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(resolve); }),
  };
}
