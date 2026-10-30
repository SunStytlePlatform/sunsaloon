# SunSaloon API - Phase 1

Base URL: `http://localhost:5000` locally, or your Render URL. All bodies are JSON.

## Response format

```json
{ "success": true,  "message": "…", "data": … }
{ "success": false, "message": "…", "error": { "code": "ERROR_CODE", "details": …, "requestId": "a1b2c3d4" } }
```

| Status | When |
|---|---|
| 200 / 201 | OK / appointment created |
| 400 | Body is not a JSON object, or invalid JSON (`INVALID_REQUEST`, `INVALID_JSON`) |
| 401 | Admin endpoint called without a valid bearer token (`UNAUTHORIZED`) |
| 403 | Admin endpoint called while `ADMIN_API_KEY` is not configured (`ADMIN_ACCESS_DISABLED`) |
| 404 | `SHOP_NOT_FOUND`, `SERVICE_NOT_FOUND`, `APPOINTMENT_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| 409 | `INVALID_STATUS_TRANSITION`, `STATUS_CONFLICT`, `DUPLICATE_RECORD`, `SLOT_TAKEN` |
| 400 | also `INVALID_IDEMPOTENCY_KEY` |
| 422 | `VALIDATION_ERROR` (see `error.details`), `APPOINTMENT_IN_PAST`, `OUTSIDE_OPENING_HOURS`, `INVALID_SLOT`, `TOO_FAR_AHEAD` (these three include `error.details[{field,message}]`), `IDEMPOTENCY_KEY_REUSED`, `CONSTRAINT_VIOLATION` |
| 429 | `RATE_LIMITED` (per IP, booking endpoint), `TOO_MANY_ACTIVE_BOOKINGS` (per phone number) |
| 500 / 503 | `INTERNAL_ERROR`, `DATABASE_ERROR` / `DATABASE_UNAVAILABLE`, `DATABASE_NOT_CONFIGURED` |

## Admin access

Admin endpoints require `Authorization: Bearer <ADMIN_API_KEY>` in every environment:

- `ADMIN_API_KEY` not set (or shorter than 24 characters) → always `403 ADMIN_ACCESS_DISABLED`.
- Header missing or wrong → `401 UNAUTHORIZED`.

## Diagnostics

`GET /suns/health` and `GET /suns/db` are public and limited to 60 requests/minute per IP. Without the admin key they return only `{ status, timestamp }` and `{ connected }`; with the key they also return `customMessage` and the Supabase check `message`. The DB check result is cached for 10 seconds.

---

## GET /api/booking-rules  (public)

What the server accepts for `appointment_date` / `appointment_time` (all in `timeZone`, the salon's):

```json
{ "success": true, "message": "Booking rules retrieved successfully",
  "data": { "timeZone": "Asia/Kolkata", "openingTime": "09:00", "closingTime": "21:00", "slotIntervalMinutes": 30, "maxAdvanceDays": 90 } }
```

## GET /api/shops  (public)

Table: `shop_settings`

```json
{
  "success": true,
  "message": "Salon details retrieved successfully",
  "data": {
    "id": "5b0c…",
    "shop_name": "Sun Saloon",
    "phone": "9876543210",
    "address": "…",
    "email": "hello@example.com",
    "description": "…",
    "logo_url": "https://…"
  }
}
```

## GET /api/services  (public)

Table: `services` (only `is_active = true`, ordered by name). Returns `[]` when none.

```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": [
    { "id": "3f2b…", "name": "Haircut", "description": null, "price": 200, "duration_minutes": 30 }
  ]
}
```

## POST /api/appointments  (public, rate-limited)

Tables: `services` (check), `customers` (find by phone / insert), `appointments` (insert).

Request:

```json
{
  "customer_name": "John",
  "customer_phone": "9876543210",
  "customer_email": "john@example.com",
  "service_id": "3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f",
  "appointment_date": "2026-11-15",
  "appointment_time": "10:30",
  "notes": "Optional"
}
```

- Required: `customer_name`, `customer_phone`, `service_id`, `appointment_date` (YYYY-MM-DD), `appointment_time` (HH:MM, 24h).
- Optional: `customer_email`, `notes`. (The API accepts bookings without an email; the website's form deliberately requires one.)
- `customer_phone`: spaces, dashes, dots and brackets are stripped. The result must be 7-15 digits, with an optional leading `+`.
- Past date/time (in `SALON_TIMEZONE`) → `422 APPOINTMENT_IN_PAST`. The time must also be inside opening hours, on the slot grid, and not further ahead than `maxAdvanceDays` (see `GET /api/booking-rules`).
- `customer_name` must be at least 2 characters after control characters are removed.
- A phone number can hold at most `MAX_ACTIVE_BOOKINGS_PER_PHONE` (default 3) upcoming pending/confirmed appointments → `429 TOO_MANY_ACTIVE_BOOKINGS`.
- Optional header `Idempotency-Key: <8-64 chars [A-Za-z0-9_-]>`. Resending the same key with the same body returns the first successful response (header `Idempotent-Replay: true`) instead of booking again; the same key with a different body → `422 IDEMPOTENCY_KEY_REUSED`. Keys are remembered for 10 minutes.
- The web form includes a hidden `website` field (honeypot). A request with it filled in gets a normal-looking `201` with `data: null` and nothing is stored. Never send it from a real client.
- The per-IP rate limit only counts well-formed requests, so fixing a typo does not use up the quota.
- An existing customer with the same phone is reused, but the name/email typed on this booking are stored on the appointment itself (`contact_*` columns) and shown to admins.
- A date + time already held by a `pending` or `confirmed` appointment → `409 SLOT_TAKEN`. Rejected, cancelled and completed appointments free the slot.
- `status` is always `pending`; any `status`, `shop_id`, `customer_id` sent by the client is ignored.

Response `201`:

```json
{
  "success": true,
  "message": "Appointment request submitted successfully",
  "data": {
    "id": "9d1e…",
    "service_id": "3f2b…",
    "appointment_date": "2026-11-15",
    "appointment_time": "10:30",
    "status": "pending",
    "notes": null,
    "created_at": "2026-10-27T10:00:00.000Z"
  }
}
```

Validation error `422`:

```json
{
  "success": false,
  "message": "Request validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [{ "field": "customer_phone", "message": "customer_phone must contain 7-15 digits, optionally starting with +" }],
    "requestId": "a1b2c3d4"
  }
}
```

## GET /api/appointments  (admin)

Tables: `appointments` joined with `customers` and `services`. Ordered by date, time, then creation time.

Optional query: `?status=pending|confirmed|rejected|completed|cancelled`, `?date=YYYY-MM-DD`.

```json
{
  "success": true,
  "message": "Appointments retrieved successfully",
  "data": [
    {
      "id": "9d1e…",
      "appointment_date": "2026-11-15",
      "appointment_time": "10:30",
      "status": "pending",
      "notes": null,
      "created_at": "2026-10-27T10:00:00.000Z",
      "customer": { "id": "c41a…", "name": "John", "phone": "9876543210", "email": null },
      "service": { "id": "3f2b…", "name": "Haircut", "price": 200, "duration_minutes": 30 }
    }
  ]
}
```

## PATCH /api/appointments/:id/status  (admin)

Table: `appointments`. Allowed transitions in Phase 1: `pending → confirmed`, `pending → rejected`.

Request: `{ "status": "confirmed" }`

Response `200`: same shape as one item from `GET /api/appointments`, with the new status.

Invalid transition `409`:

```json
{
  "success": false,
  "message": "Cannot change appointment status from 'confirmed' to 'rejected'",
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "details": { "current_status": "confirmed", "allowed_statuses": [] },
    "requestId": "a1b2c3d4"
  }
}
```

---

## Trying it (PowerShell)

```powershell
$base = 'http://localhost:5000'
Invoke-RestMethod "$base/api/shop"
Invoke-RestMethod "$base/api/services"

$body = @{ customer_name='Test'; customer_phone='9000000001'; service_id='<service-uuid>';
           appointment_date='2099-01-01'; appointment_time='10:30' } | ConvertTo-Json
Invoke-RestMethod "$base/api/appointments" -Method Post -ContentType 'application/json' -Body $body

Invoke-RestMethod "$base/api/appointments?status=pending"
Invoke-RestMethod "$base/api/appointments/<appointment-uuid>/status" -Method Patch `
  -ContentType 'application/json' -Body '{"status":"confirmed"}'
```

Unit tests (no database access): `cd backend; npm test`.
