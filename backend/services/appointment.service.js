import { getSupabase } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { toApiError } from '../utils/supabaseError.js';
import { getNowInTimeZone, isInPast, toHHMM } from '../utils/dateTime.js';
import { checkBookingRules } from '../utils/bookingRules.js';
import { APPOINTMENT_STATUS, allowedNextStatuses, canTransition } from '../utils/appointmentStatus.js';
import { getActiveServiceById } from './service.service.js';
import { findOrCreateCustomer } from './customer.service.js';

// customer_id is internal and never returned to the public booking client.
const CREATED_COLUMNS = 'id, service_id, appointment_date, appointment_time, status, notes, created_at';
const DETAIL_COLUMNS = `
  id, appointment_date, appointment_time, status, notes, created_at,
  contact_name, contact_phone, contact_email,
  customer:customers ( id, name, phone, email ),
  service:services ( id, name, price, duration_minutes )
`;
// A slot is held by pending and confirmed requests; rejected, cancelled and completed ones free it.
const SLOT_HOLDING_STATUSES = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED];
const UNIQUE_VIOLATION = '23505';

// The contact details typed on this booking win over the shared, phone-keyed customer record.
function formatAppointment({ contact_name, contact_phone, contact_email, ...row }) {
  const formatted = { ...row, appointment_time: toHHMM(row.appointment_time) };
  if (row.customer && contact_phone) {
    formatted.customer = { ...row.customer, name: contact_name, phone: contact_phone, email: contact_email };
  }
  return formatted;
}

const slotTakenError = () =>
  new ApiError(409, 'SLOT_TAKEN', 'That date and time has just been booked. Please choose another time.');

async function isSlotTaken(date, time) {
  const { data, error } = await getSupabase()
    .from('appointments')
    .select('id')
    .eq('appointment_date', date)
    .eq('appointment_time', time)
    .in('status', SLOT_HOLDING_STATUSES)
    .limit(1);
  if (error) throw toApiError(error, 'checking slot availability');
  return data.length > 0;
}

async function countActiveBookings(customerId, today) {
  const { data, error } = await getSupabase()
    .from('appointments')
    .select('id')
    .eq('customer_id', customerId)
    .in('status', SLOT_HOLDING_STATUSES)
    .gte('appointment_date', today);
  if (error) throw toApiError(error, 'counting active appointments');
  return data.length;
}

export async function createAppointment(input) {
  const now = getNowInTimeZone(env.salonTimeZone);
  if (isInPast(input.appointment_date, input.appointment_time, now)) {
    logger.debug(`appointment.service: rejected past slot ${input.appointment_date} ${input.appointment_time} (now ${now.date} ${now.time} ${env.salonTimeZone})`);
    throw new ApiError(422, 'APPOINTMENT_IN_PAST', 'Appointment date and time must be in the future');
  }

  const broken = checkBookingRules(input.appointment_date, input.appointment_time, now, env.bookingRules);
  if (broken) {
    throw new ApiError(422, broken.code, broken.message, [{ field: broken.field, message: broken.message }]);
  }

  const service = await getActiveServiceById(input.service_id);
  // Checked before the customer insert so a taken slot leaves no stray customer row behind.
  if (await isSlotTaken(input.appointment_date, input.appointment_time)) throw slotTakenError();

  const { customer, created } = await findOrCreateCustomer({
    name: input.customer_name,
    phone: input.customer_phone,
    email: input.customer_email,
  });

  // Stops one phone number from filling the calendar with requests.
  if (!created && (await countActiveBookings(customer.id, now.date)) >= env.maxActiveBookingsPerPhone) {
    throw new ApiError(
      429,
      'TOO_MANY_ACTIVE_BOOKINGS',
      `This phone number already has ${env.maxActiveBookingsPerPhone} upcoming appointment requests. Please wait for the salon to respond.`,
    );
  }

  // Not atomic with the customer insert; a leftover customer row is harmless and reused next time.
  const { data, error } = await getSupabase()
    .from('appointments')
    .insert({
      customer_id: customer.id,
      service_id: service.id,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      notes: input.notes,
      contact_name: input.customer_name,
      contact_phone: input.customer_phone,
      contact_email: input.customer_email,
      status: APPOINTMENT_STATUS.PENDING,
    })
    .select(CREATED_COLUMNS)
    .single();

  if (error) {
    if (created) logger.warn(`appointment.service: customer ${customer.id} was created but the appointment insert failed`);
    // The partial unique index catches a concurrent booking that slipped past isSlotTaken().
    if (error.code === UNIQUE_VIOLATION) throw slotTakenError();
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

export async function getAppointmentById(id) {
  logger.debug(`appointment.service: fetching appointment ${id}`);
  const { data, error } = await getSupabase()
    .from('appointments')
    .select(DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw toApiError(error, 'fetching appointment');
  if (!data) throw new ApiError(404, 'APPOINTMENT_NOT_FOUND', 'Appointment not found');
  return formatAppointment(data);
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
