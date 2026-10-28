import 'server-only';
import { apiRequest } from './client';
import type { CreateAppointmentPayload } from '@/types/appointment';

// Never cached: every call creates a booking request.
export async function createAppointment(payload: CreateAppointmentPayload): Promise<unknown> {
  return apiRequest('/api/appointments', { method: 'POST', body: payload, cache: 'no-store' });
}
