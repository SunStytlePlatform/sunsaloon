// Matches the POST /api/appointments contract of the Express backend exactly.
export interface CreateAppointmentPayload {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  service_id: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:mm (24h)
  notes?: string;
  website?: string; // honeypot, only ever set by bots
}

export interface FieldError {
  field: string;
  message: string;
}

export type BookingResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: FieldError[] };
