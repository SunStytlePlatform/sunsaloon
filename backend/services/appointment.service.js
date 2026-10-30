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
const BASE_DETAIL_COLUMNS = `
  id, appointment_date, appointment_time, status, notes, created_at,
  customer:customers ( id, name, phone, email ),
  service:services ( id, name, price, duration_minutes )
`;
// appointment_contacts is a separate table (database/manual-sql/001) so no existing table has to change.
const DETAIL_COLUMNS = `${BASE_DETAIL_COLUMNS}, contact:appointment_contacts ( contact_name, contact_phone, contact_email )`;

// A slot is held by pending and confirmed requests; rejected, cancelled and completed ones free it.
const SLOT_HOLDING_STATUSES = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED];
// 23505 = unique violation, 23P01 = exclusion violation (what appointment_slot_locks raises for a taken slot).
const SLOT_CONFLICT_CODES = new Set(['23505', '23P01']);
// PostgREST / Postgres codes for "that table or relationship does not exist (yet)": the optional migrations are not applied.
const MISSING_RELATION_CODES = new Set(['PGRST200', 'PGRST205', '42P01']);
const isMissingRelation = (error) => MISSING_RELATION_CODES.has(error?.code);

// The contact details typed on this booking win over the shared, phone-keyed customer record.
function formatAppointment({ contact, ...row }) {
  const formatted = { ...row, appointment_time: toHHMM(row.appointment_time) };
  if (row.customer && contact?.contact_phone) {
    formatted.customer = { ...row.customer, name: contact.contact_name, phone: contact.contact_phone, email: contact.contact_email };
  }
  return formatted;
}

// Runs a detail query with the contact join; if migration 001 has not been applied, runs it again without the join so
// the admin endpoints keep working (they then show the customer record, as before).
async function fetchDetail(buildQuery) {
  const result = await buildQuery(DETAIL_COLUMNS);
  if (result.error && isMissingRelation(result.error)) {
    logger.debug('appointment.service: appointment_contacts is not available - using customer records only');
    return buildQuery(BASE_DETAIL_COLUMNS);
  }
  return result;
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

// The race-loser's request is closed as 'rejected' (a normal lifecycle step) rather than deleted, so this service never
// deletes appointment rows.
async function abandonAppointment(id) {
  const { error } = await getSupabase()
    .from('appointments')
    .update({ status: APPOINTMENT_STATUS.REJECTED })
    .eq('id', id)
    .eq('status', APPOINTMENT_STATUS.PENDING);
  if (error) logger.error(`appointment.service: could not close losing appointment ${id}: ${error.message}`);
}

// Reserves the date + time in appointment_slot_locks (database/manual-sql/002). The unique constraint there decides
// a race between two requests that both passed isSlotTaken(). Without the table the booking still works, just without
// that last-instant protection.
async function lockSlot(appointment) {
  const supabase = getSupabase();
  const row = {
    appointment_id: appointment.id,
    appointment_date: appointment.appointment_date,
    appointment_time: appointment.appointment_time,
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { error } = await supabase.from('appointment_slot_locks').insert(row);
    if (!error) return;
    if (isMissingRelation(error)) {
      logger.warn('appointment.service: appointment_slot_locks is not available - apply database/manual-sql/002 to prevent simultaneous double bookings');
      return;
    }
    if (!SLOT_CONFLICT_CODES.has(error.code)) {
      await abandonAppointment(appointment.id);
      throw toApiError(error, 'reserving the appointment slot');
    }

    // Someone holds this slot. If their appointment is no longer active the lock is stale (status changed outside the
    // API): mark it released and try once more. Otherwise this request lost the race.
    const { data: lock } = await supabase
      .from('appointment_slot_locks')
      .select('appointment_id')
      .eq('appointment_date', row.appointment_date)
      .eq('appointment_time', row.appointment_time)
      .is('released_at', null)
      .maybeSingle();
    const { data: holder } = lock
      ? await supabase.from('appointments').select('id, status').eq('id', lock.appointment_id).maybeSingle()
      : { data: null };
    if (holder && holder.id !== appointment.id && SLOT_HOLDING_STATUSES.includes(holder.status)) break;
    if (lock) await markReleased(lock.appointment_id);
  }

  await abandonAppointment(appointment.id);
  throw slotTakenError();
}

// Frees the slot by stamping the lock row, never by deleting it (nothing is deleted anywhere by this backend).
async function markReleased(appointmentId) {
  const { error } = await getSupabase()
    .from('appointment_slot_locks')
    .update({ released_at: new Date().toISOString() })
    .eq('appointment_id', appointmentId)
    .is('released_at', null);
  // A leftover active lock is harmless: lockSlot() ignores locks whose appointment is no longer active.
  if (error && !isMissingRelation(error)) logger.warn(`appointment.service: could not release slot lock for ${appointmentId}: ${error.message}`);
}

// Best effort: the booking already exists, so a failure here must not fail the request.
async function saveContact(appointmentId, input) {
  const { error } = await getSupabase().from('appointment_contacts').insert({
    appointment_id: appointmentId,
    contact_name: input.customer_name,
    contact_phone: input.customer_phone,
    contact_email: input.customer_email,
  });
  if (!error) return;
  if (isMissingRelation(error)) {
    logger.warn('appointment.service: appointment_contacts is not available - apply database/manual-sql/001 to keep per-booking contact details');
  } else {
    logger.error(`appointment.service: could not save contact details for appointment ${appointmentId}: ${error.message}`);
  }
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
      status: APPOINTMENT_STATUS.PENDING,
    })
    .select(CREATED_COLUMNS)
    .single();

  if (error) {
    if (created) logger.warn(`appointment.service: customer ${customer.id} was created but the appointment insert failed`);
    throw toApiError(error, 'creating appointment');
  }

  await lockSlot(data);
  await saveContact(data.id, input);

  logger.info(`appointment.service: created appointment ${data.id} for customer ${customer.id}`);
  return formatAppointment(data);
}

export async function listAppointments({ status, date } = {}) {
  logger.debug('appointment.service: listing appointments', { status, date });
  const { data, error } = await fetchDetail((columns) => {
    let query = getSupabase()
      .from('appointments')
      .select(columns)
      .order('appointment_date')
      .order('appointment_time')
      .order('created_at');
    if (status) query = query.eq('status', status);
    if (date) query = query.eq('appointment_date', date);
    return query;
  });
  if (error) throw toApiError(error, 'listing appointments');
  logger.debug(`appointment.service: found ${data.length} appointment(s)`);
  return data.map(formatAppointment);
}

export async function getAppointmentById(id) {
  logger.debug(`appointment.service: fetching appointment ${id}`);
  const { data, error } = await fetchDetail((columns) =>
    getSupabase().from('appointments').select(columns).eq('id', id).maybeSingle(),
  );

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
  const { data, error } = await fetchDetail((columns) =>
    supabase
      .from('appointments')
      .update({ status: nextStatus })
      .eq('id', id)
      .eq('status', current.status)
      .select(columns)
      .maybeSingle(),
  );

  if (error) throw toApiError(error, 'updating appointment status');
  if (!data) {
    throw new ApiError(409, 'STATUS_CONFLICT', 'The appointment was updated by another request; reload and try again');
  }

  if (!SLOT_HOLDING_STATUSES.includes(nextStatus)) await markReleased(id);

  logger.info(`appointment.service: appointment ${id} status ${current.status} -> ${nextStatus}`);
  return formatAppointment(data);
}
