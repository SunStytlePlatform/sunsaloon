import { NextResponse } from 'next/server';
import { ApiRequestError } from '@/lib/api/client';
import { createAppointment } from '@/lib/api/appointments';
import { createAppointmentSchema } from '@/lib/validations/appointment.schema';
import type { FieldError } from '@/types/appointment';

export const dynamic = 'force-dynamic';

const schema = createAppointmentSchema({ checkPast: false });

function fail(status: number, message: string, fieldErrors?: FieldError[]) {
  return NextResponse.json({ success: false, message, fieldErrors }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, 'The request body must be valid JSON.');
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.map((i) => ({ field: String(i.path[0] ?? ''), message: i.message }));
    return fail(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  const { notes, ...rest } = parsed.data;
  try {
    await createAppointment({ ...rest, ...(notes ? { notes } : {}) });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiRequestError) {
      const details = Array.isArray(err.details) ? (err.details as FieldError[]) : undefined;
      const status = err.status >= 400 && err.status < 600 ? err.status : 502;
      return fail(status, err.message, details);
    }
    console.error('Unexpected error creating appointment:', err);
    return fail(500, 'Something went wrong while submitting your request.');
  }
}
