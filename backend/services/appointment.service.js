import { getSupabase } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { toApiError } from '../utils/supabaseError.js';
import { getNowInTimeZone, isInPast, toHHMM } from '../utils/dateTime.js';
import { APPOINTMENT_STATUS, allowedNextStatuses, canTransition } from '../utils/appointmentStatus.js';
import { getActiveServiceById } from './service.service.js';
import { findOrCreateCustomer } from './customer.service.js';

const CREATED_COLUMNS = 'id, customer_id, service_id, appointment_date, appointment_time, status, notes, created_at';
const DETAIL_COLUMNS = `
  id, appointment_date, appointment_time, status, notes, created_at,
  customer:customers ( id, name, phone, email ),
  service:services ( id, name, price, duration_minutes )
`;

const formatAppointment = (row) => ({ ...row, appointment_time: toHHMM(row.appointment_time) });

export async function createAppointment(input) {
  const now = getNowInTimeZone(env.salonTimeZone);
  if (isInPast(input.appointment_date, input.appointment_time, now)) {
    logger.debug(`appointment.service: rejected past slot ${input.appointment_date} ${input.appointment_time} (now ${now.date} ${now.time} ${env.salonTimeZone})`);
    throw new ApiError(422, 'APPOINTMENT_IN_PAST', 'Appointment date and time must be in the future');
  }

  const service = await getActiveServiceById(input.service_id);
  const { customer, created } = await findOrCreateCustomer({
    name: input.customer_name,
    phone: input.customer_phone,
    email: input.customer_email,
  });

  // Not atomic with the customer insert; a leftover customer row is harmless and reused next time.
  const { data, error } = await getSupabase()
    .from('appointments')
    .insert({
      customer_id: customer.id,
      service_id: service.id,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      notes: input.notes,
      status: APPOINTMENT_STATUS.PENDING,
    })
    .select(CREATED_COLUMNS)
    .single();

  if (error) {
    if (created) logger.warn(`appointment.service: customer ${customer.id} was created but the appointment insert failed`);
    throw toApiError(error, 'creating appointment');
  }

  logger.info(`appointment.service: created appointment ${data.id} for customer ${customer.id}`);
  return formatAppointment(data);
}

export async function listAppointments({ status, date } = {}) {
  logger.debug('appointment.service: listing appointments', { status, date });
  let query = getSupabase()
    .from('appointments')
    .select(DETAIL_COLUMNS)
    .order('appointment_date')
    .order('appointment_time')
    .order('created_at');

  if (status) query = query.eq('status', status);
  if (date) query = query.eq('appointment_date', date);

  const { data, error } = await query;
  if (error) throw toApiError(error, 'listing appointments');
  logger.debug(`appointment.service: found ${data.length} appointment(s)`);
  return data.map(formatAppointment);
}

export async function updateAppointmentStatus(id, nextStatus) {
  const supabase = getSupabase();

  const { data: current, error: findError } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();

  if (findError) throw toApiError(findError, 'fetching appointment');
  if (!current) throw new ApiError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');

  if (!canTransition(current.status, nextStatus)) {
    throw new ApiError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot change appointment status from '${current.status}' to '${nextStatus}'`,
      { current_status: current.status, allowed_statuses: allowedNextStatuses(current.status) },
    );
  }

  // Conditional update: only succeeds if nobody changed the status since we read it.
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: nextStatus })
    .eq('id', id)
    .eq('status', current.status)
    .select(DETAIL_COLUMNS)
    .maybeSingle();

  if (error) throw toApiError(error, 'updating appointment status');
  if (!data) {
    throw new ApiError(409, 'STATUS_CONFLICT', 'The appointment was updated by another request; reload and try again');
  }

  logger.info(`appointment.service: appointment ${id} status ${current.status} -> ${nextStatus}`);
  return formatAppointment(data);
}
