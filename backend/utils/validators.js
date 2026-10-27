import { isValidDateString, isValidTimeString, toHHMM } from './dateTime.js';
import { APPOINTMENT_STATUSES } from './appointmentStatus.js';

// Pure validators: each returns { value, errors[, status] } so they can be unit-tested without Express.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_RE = /^\+?\d{7,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_RE = /[\u0000-\u001F\u007F]/g;

const LIMITS = { name: 150, phone: 20, email: 255, notes: 500 };

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function cleanText(value) {
  return value.replace(CONTROL_CHARS_RE, '').trim();
}

export function normalizePhone(value) {
  return value.replace(/[\s\-().]/g, '');
}

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

const notAnObject = (what) => ({
  value: null,
  status: 400,
  errors: [{ field: what, message: `${what} must be a JSON object` }],
});

export function validateCreateAppointmentInput(body) {
  if (!isPlainObject(body)) return notAnObject('body');

  const errors = [];
  const value = {};
  const required = (field) => {
    if (isBlank(body[field])) {
      errors.push({ field, message: `${field} is required` });
      return false;
    }
    if (typeof body[field] !== 'string') {
      errors.push({ field, message: `${field} must be a string` });
      return false;
    }
    return true;
  };

  if (required('customer_name')) {
    const name = cleanText(body.customer_name);
    if (name.length > LIMITS.name) errors.push({ field: 'customer_name', message: `customer_name must be at most ${LIMITS.name} characters` });
    else value.customer_name = name;
  }

  if (required('customer_phone')) {
    const phone = normalizePhone(body.customer_phone.trim());
    if (!PHONE_RE.test(phone) || phone.length > LIMITS.phone) {
      errors.push({ field: 'customer_phone', message: 'customer_phone must contain 7-15 digits, optionally starting with +' });
    } else value.customer_phone = phone;
  }

  if (isBlank(body.customer_email)) {
    value.customer_email = null;
  } else if (typeof body.customer_email !== 'string') {
    errors.push({ field: 'customer_email', message: 'customer_email must be a string' });
  } else {
    const email = body.customer_email.trim().toLowerCase();
    if (email.length > LIMITS.email || !EMAIL_RE.test(email)) errors.push({ field: 'customer_email', message: 'customer_email must be a valid email address' });
    else value.customer_email = email;
  }

  if (required('service_id')) {
    if (!isUuid(body.service_id.trim())) errors.push({ field: 'service_id', message: 'service_id must be a valid UUID' });
    else value.service_id = body.service_id.trim().toLowerCase();
  }

  if (required('appointment_date')) {
    if (!isValidDateString(body.appointment_date.trim())) errors.push({ field: 'appointment_date', message: 'appointment_date must be a valid date in YYYY-MM-DD format' });
    else value.appointment_date = body.appointment_date.trim();
  }

  if (required('appointment_time')) {
    if (!isValidTimeString(body.appointment_time.trim())) errors.push({ field: 'appointment_time', message: 'appointment_time must be a valid 24-hour time in HH:MM format' });
    else value.appointment_time = toHHMM(body.appointment_time.trim());
  }

  if (isBlank(body.notes)) {
    value.notes = null;
  } else if (typeof body.notes !== 'string') {
    errors.push({ field: 'notes', message: 'notes must be a string' });
  } else {
    const notes = cleanText(body.notes);
    if (notes.length > LIMITS.notes) errors.push({ field: 'notes', message: `notes must be at most ${LIMITS.notes} characters` });
    else value.notes = notes;
  }

  // Anything else (status, shop_id, customer_id, ...) is intentionally ignored.
  return { value, errors };
}

export function validateAppointmentFilters(query) {
  const source = isPlainObject(query) ? query : {};
  const errors = [];
  const value = {};

  if (!isBlank(source.status)) {
    const status = typeof source.status === 'string' ? source.status.trim().toLowerCase() : null;
    if (!APPOINTMENT_STATUSES.includes(status)) {
      errors.push({ field: 'status', message: `status must be one of: ${APPOINTMENT_STATUSES.join(', ')}` });
    } else value.status = status;
  }

  if (!isBlank(source.date)) {
    if (!isValidDateString(source.date)) errors.push({ field: 'date', message: 'date must be a valid date in YYYY-MM-DD format' });
    else value.date = source.date;
  }

  return { value, errors };
}

export function validateStatusUpdateInput(body) {
  if (!isPlainObject(body)) return notAnObject('body');

  if (isBlank(body.status)) return { value: null, errors: [{ field: 'status', message: 'status is required' }] };
  const status = typeof body.status === 'string' ? body.status.trim().toLowerCase() : null;
  if (!APPOINTMENT_STATUSES.includes(status)) {
    return { value: null, errors: [{ field: 'status', message: `status must be one of: ${APPOINTMENT_STATUSES.join(', ')}` }] };
  }
  return { value: { status }, errors: [] };
}

export function validateIdParams(params) {
  const id = params?.id;
  if (!isUuid(id)) return { value: null, errors: [{ field: 'id', message: 'id must be a valid UUID' }] };
  return { value: { id: id.toLowerCase() }, errors: [] };
}
