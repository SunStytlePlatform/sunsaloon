import http from 'node:http';
import { randomUUID } from 'node:crypto';

export const SERVICE_ID = '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f';
export const INACTIVE_SERVICE_ID = '4f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f';
const ACTIVE_STATUSES = ['pending', 'confirmed'];

const seed = () => ({
  shop_settings: [{ id: '5b0c8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f', shop_name: 'Sun Saloon', phone: '9876543210', address: '1 Main St', email: 'hi@example.com', description: 'desc', logo_url: null }],
  services: [
    { id: SERVICE_ID, name: 'Haircut', description: null, price: 200, duration_minutes: 30, is_active: true },
    { id: INACTIVE_SERVICE_ID, name: 'Hidden', description: null, price: 1, duration_minutes: 5, is_active: false },
  ],
  customers: [],
  appointments: [],
});

// Minimal PostgREST emulator (eq / in filters, order, limit, single-object responses, embeds) plus the two
// database rules the backend relies on: unique customer phone and one active appointment per date + time.
export async function startFakeSupabase() {
  let db = seed();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://fake');
    const send = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/auth/v1/health') return send(200, { ok: true });

    const table = /^\/rest\/v1\/(\w+)$/.exec(url.pathname)?.[1];
    if (!table || !db[table]) return send(404, { code: '42P01', message: 'unknown table' });

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
        return {
          ...row,
          customer: customer && { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
          service: service && { id: service.id, name: service.name, price: service.price, duration_minutes: service.duration_minutes },
        };
      };
      // Honour ?select=a,b,alias:table(...) like PostgREST does: only the listed columns (and embeds) come back.
      const project = (row) => {
        const select = url.searchParams.get('select');
        if (!select || select === '*') return row;
        const parts = select.replace(/\([^)]*\)/g, '').split(',').map((p) => p.trim()).filter(Boolean);
        const keep = new Set(parts.map((p) => p.split(':')[0].trim()));
        return Object.fromEntries(Object.entries(row).filter(([key]) => keep.has(key)));
      };
      const matches = (rows) => {
        for (const [column, value] of url.searchParams) {
          const eq = /^eq\.(.*)$/.exec(value);
          const inList = /^in\.\((.*)\)$/.exec(value);
          if (eq) rows = rows.filter((r) => String(r[column]).slice(0, eq[1].length) === eq[1]);
          const gte = /^gte\.(.*)$/.exec(value);
          if (inList) rows = rows.filter((r) => inList[1].split(',').includes(String(r[column])));
          if (gte) rows = rows.filter((r) => String(r[column]) >= gte[1]);
        }
        return rows;
      };

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
        if (table === 'customers' && db.customers.some((c) => c.phone === row.phone)) {
          return send(409, { code: '23505', message: 'duplicate key value violates unique constraint' });
        }
        if (table === 'appointments') {
          if (!db.customers.some((c) => c.id === row.customer_id)) return send(409, { code: '23503', message: 'foreign key violation' });
          const clash = db.appointments.some(
            (a) => ACTIVE_STATUSES.includes(a.status) && ACTIVE_STATUSES.includes(row.status)
              && a.appointment_date === row.appointment_date && a.appointment_time.slice(0, 5) === row.appointment_time.slice(0, 5),
          );
          if (clash) return send(409, { code: '23505', message: 'duplicate key value violates unique constraint "appointments_unique_active_slot"' });
          row.appointment_time = `${row.appointment_time}:00`;
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

      send(405, {});
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    reset: () => { db = seed(); },
    tables: () => db,
    close: () => new Promise((resolve) => { server.closeAllConnections?.(); server.close(resolve); }),
  };
}
