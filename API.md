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
| 403 | Admin endpoint called while `APP_ENV=production` (`ADMIN_ACCESS_DISABLED`) |
| 404 | `SHOP_NOT_FOUND`, `SERVICE_NOT_FOUND`, `APPOINTMENT_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| 409 | `INVALID_STATUS_TRANSITION`, `STATUS_CONFLICT`, `DUPLICATE_RECORD` |
| 422 | `VALIDATION_ERROR` (see `error.details`), `APPOINTMENT_IN_PAST`, `CONSTRAINT_VIOLATION` |
| 429 | `RATE_LIMITED` (booking endpoint) |
| 500 / 503 | `INTERNAL_ERROR`, `DATABASE_ERROR` / `DATABASE_UNAVAILABLE`, `DATABASE_NOT_CONFIGURED` |

## Admin access

There is no admin login yet. Admin endpoints are controlled by `APP_ENV`:

- `development` → open (bypassed) - for local work only.
- `production` (default) → always `403 ADMIN_ACCESS_DISABLED`.

---

## GET /api/shop  (public)

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
- Optional: `customer_email`, `notes`.
- `customer_phone`: spaces, dashes, dots and brackets are stripped. The result must be 7-15 digits, with an optional leading `+`.
- Past date/time (in `SALON_TIMEZONE`) → `422 APPOINTMENT_IN_PAST`.
- An existing customer with the same phone is reused (name/email are not overwritten).
- `status` is always `pending`; any `status`, `shop_id`, `customer_id` sent by the client is ignored.

Response `201`:

```json
{
  "success": true,
  "message": "Appointment request submitted successfully",
  "data": {
    "id": "9d1e…",
    "customer_id": "c41a…",
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
