import { z } from 'zod';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// Digits with optional leading +, 7-15 digits (same rule as the backend). Spaces, dashes and brackets are stripped first.
const PHONE_RE = /^\+?\d{7,15}$/;

export function localDateTimeParts(now: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

// Past checks use the customer's clock; the backend remains authoritative and uses the salon's time zone.
export const appointmentSchema = z
  .object({
    customer_name: z.string().trim().min(2, 'Please enter your name').max(150, 'Name is too long'),
    customer_phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/[\s\-().]/g, ''))
      .refine((v) => PHONE_RE.test(v), 'Enter a valid phone number (7-15 digits, optional + prefix)'),
    customer_email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Please enter your email address')
      .max(255, 'Email is too long')
      .email('Enter a valid email address'),
    service_id: z.string().min(1, 'Please select a service'),
    appointment_date: z.string().regex(DATE_RE, 'Please choose a date'),
    appointment_time: z.string().regex(TIME_RE, 'Please choose a time'),
    notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer').optional(),
  })
  .superRefine((v, ctx) => {
    if (!DATE_RE.test(v.appointment_date) || !TIME_RE.test(v.appointment_time)) return;
    const now = localDateTimeParts(new Date());
    if (v.appointment_date < now.date) {
      ctx.addIssue({ code: 'custom', path: ['appointment_date'], message: 'Please choose today or a future date' });
    } else if (v.appointment_date === now.date && v.appointment_time <= now.time) {
      ctx.addIssue({ code: 'custom', path: ['appointment_time'], message: 'Please choose a time in the future' });
    }
  });

export type AppointmentFormInput = z.input<typeof appointmentSchema>;
export type AppointmentFormValues = z.output<typeof appointmentSchema>;
