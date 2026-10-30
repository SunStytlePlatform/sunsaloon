# Security notes

## Free text is stored as typed

`customer_name`, `notes` (and the contact fields on an appointment) are saved exactly as submitted, after control
characters are stripped and length limits applied. A value such as `<script>alert(1)</script>` is therefore a legal
note. This is safe today because nothing renders it as HTML:

- the public site never shows other customers' data;
- admin endpoints return JSON only.

**Rules for any future admin UI, email or PDF that shows these fields**

1. Render them as text (React escapes by default). Never use `dangerouslySetInnerHTML`, `innerHTML` or an HTML email
   template with unescaped interpolation for customer-supplied values.
2. If HTML output is ever required, sanitise it at render time with an allow-list sanitiser; do not rely on the stored value being clean.
3. Spreadsheet exports: prefix values starting with `=`, `+`, `-` or `@` with `'` to prevent CSV/formula injection.
4. Keep the Content-Security-Policy in `frontend/next.config.ts` (`object-src 'none'`, `frame-ancestors 'none'`).

## Secrets and access

- `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_API_KEY` live only in the backend environment; never prefix them with `NEXT_PUBLIC_`.
- Row level security is enabled on every table (see `supabase/migrations/000_base_schema.sql`) so the public anon key cannot read customers or appointments.
- Logs mask emails and phone numbers (`backend/utils/redact.js`); still run production at `LOG_LEVEL=info`.

## Known limits

- Rate limits, idempotency keys and the diagnostics cache are in process memory (single instance only).
- There is no CAPTCHA; abuse is limited by the honeypot, a per-IP limit and a per-phone cap on active bookings.
