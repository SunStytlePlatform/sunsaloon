'use client';

import { useMutation } from '@tanstack/react-query';
import type { AppointmentFormValues } from '@/lib/validations/appointment.schema';
import type { FieldError } from '@/types/appointment';

export class BookingError extends Error {
  constructor(
    message: string,
    readonly fieldErrors?: FieldError[],
  ) {
    super(message);
  }
}

async function postAppointment(values: AppointmentFormValues): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  } catch {
    throw new BookingError('Network connection unavailable. Please check your connection and try again.');
  }
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  throw new BookingError(
    body?.message || 'We could not submit your request. Please try again.',
    Array.isArray(body?.fieldErrors) ? body.fieldErrors : undefined,
  );
}

// The browser only talks to the Next.js route handler, never to the Express backend directly.
// isPending blocks duplicate submissions; retry is off so a booking is never sent twice automatically.
export function useBooking() {
  return useMutation<void, BookingError, AppointmentFormValues>({ mutationFn: postAppointment, retry: false });
}
