'use client';

import { useMutation } from '@tanstack/react-query';
import { BROWSER_API_BASE } from '@/lib/api/normalize';
import type { AppointmentFormValues } from '@/lib/validations/appointment.schema';
import type { CreateAppointmentPayload, FieldError } from '@/types/appointment';

export class BookingError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: FieldError[],
  ) {
    super(message);
  }
}

// One key per form: if the response is lost and the customer presses "Try again", the server replays the first
// result instead of booking twice (or answering "slot taken" because of the customer's own first request).
// crypto.randomUUID only exists on secure origins, so fall back for plain-http deployments.
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function postAppointment(values: AppointmentFormValues, idempotencyKey: string): Promise<void> {
  const { notes, website, ...rest } = values;
  const payload: CreateAppointmentPayload = { ...rest, ...(notes ? { notes } : {}), ...(website ? { website } : {}) };

  let res: Response;
  try {
    res = await fetch(`${BROWSER_API_BASE}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch {
    throw new BookingError('Network connection unavailable. Please check your connection and try again.');
  }
  if (res.ok) return;

  // Backend error envelope: { message, error: { code, details: [{ field, message }] } }
  const body = await res.json().catch(() => null);
  const details = body?.error?.details;
  const message =
    res.status === 429 && body?.error?.code === 'RATE_LIMITED'
      ? 'Too many booking requests. Please wait a few minutes and try again.'
      : body?.message || 'We could not submit your request. Please try again.';
  throw new BookingError(message, Array.isArray(details) ? details : undefined);
}

// isPending blocks duplicate submissions; retry is off so a booking is never sent twice automatically.
export function useBooking() {
  return useMutation<void, BookingError, { values: AppointmentFormValues; idempotencyKey: string }>({
    mutationFn: ({ values, idempotencyKey }) => postAppointment(values, idempotencyKey),
    retry: false,
  });
}
