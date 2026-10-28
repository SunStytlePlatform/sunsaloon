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

async function postAppointment(values: AppointmentFormValues): Promise<void> {
  const { notes, ...rest } = values;
  const payload: CreateAppointmentPayload = { ...rest, ...(notes ? { notes } : {}) };

  let res: Response;
  try {
    res = await fetch(`${BROWSER_API_BASE}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    res.status === 429
      ? 'Too many booking requests. Please wait a few minutes and try again.'
      : body?.message || 'We could not submit your request. Please try again.';
  throw new BookingError(message, Array.isArray(details) ? details : undefined);
}

// isPending blocks duplicate submissions; retry is off so a booking is never sent twice automatically.
export function useBooking() {
  return useMutation<void, BookingError, AppointmentFormValues>({ mutationFn: postAppointment, retry: false });
}
