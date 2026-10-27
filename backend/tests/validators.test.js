import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAppointmentFilters,
  validateCreateAppointmentInput,
  validateIdParams,
  validateStatusUpdateInput,
} from '../utils/validators.js';

const SERVICE_ID = '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f';
const validBooking = () => ({
  customer_name: '  John  ',
  customer_phone: '98765 43210',
  service_id: SERVICE_ID,
  appointment_date: '2099-11-15',
  appointment_time: '10:30',
});

test('accepts and sanitises a valid booking', () => {
  const { value, errors } = validateCreateAppointmentInput(validBooking());
  assert.deepEqual(errors, []);
  assert.equal(value.customer_name, 'John');
  assert.equal(value.customer_phone, '9876543210');
  assert.equal(value.customer_email, null);
  assert.equal(value.notes, null);
});

test('ignores client-supplied status and shop_id', () => {
  const { value, errors } = validateCreateAppointmentInput({ ...validBooking(), status: 'confirmed', shop_id: 'x' });
  assert.deepEqual(errors, []);
  assert.equal(value.status, undefined);
  assert.equal(value.shop_id, undefined);
});

test('reports every missing required field', () => {
  const { errors } = validateCreateAppointmentInput({});
  const fields = errors.map((e) => e.field).sort();
  assert.deepEqual(fields, ['appointment_date', 'appointment_time', 'customer_name', 'customer_phone', 'service_id']);
});

test('rejects a non-object body with status 400', () => {
  const result = validateCreateAppointmentInput(undefined);
  assert.equal(result.status, 400);
  assert.equal(result.errors.length, 1);
});

test('rejects invalid phone, service id, date, time and email', () => {
  const { errors } = validateCreateAppointmentInput({
    ...validBooking(),
    customer_phone: '12ab',
    service_id: '1',
    appointment_date: '2026-02-30',
    appointment_time: '25:00',
    customer_email: 'not-an-email',
  });
  const fields = errors.map((e) => e.field).sort();
  assert.deepEqual(fields, ['appointment_date', 'appointment_time', 'customer_email', 'customer_phone', 'service_id']);
});

test('rejects over-long names', () => {
  const { errors } = validateCreateAppointmentInput({ ...validBooking(), customer_name: 'a'.repeat(151) });
  assert.equal(errors[0].field, 'customer_name');
});

test('normalises HH:MM:SS to HH:MM', () => {
  const { value } = validateCreateAppointmentInput({ ...validBooking(), appointment_time: '09:05:00' });
  assert.equal(value.appointment_time, '09:05');
});

test('appointment filters accept valid status/date and reject bad ones', () => {
  assert.deepEqual(validateAppointmentFilters({ status: 'Pending', date: '2026-11-15' }), {
    value: { status: 'pending', date: '2026-11-15' },
    errors: [],
  });
  assert.equal(validateAppointmentFilters({ status: 'accepted' }).errors[0].field, 'status');
  assert.equal(validateAppointmentFilters({ date: '15-11-2026' }).errors[0].field, 'date');
  assert.deepEqual(validateAppointmentFilters({}).errors, []);
});

test('status update requires a known status', () => {
  assert.deepEqual(validateStatusUpdateInput({ status: 'confirmed' }).value, { status: 'confirmed' });
  assert.equal(validateStatusUpdateInput({}).errors[0].message, 'status is required');
  assert.equal(validateStatusUpdateInput({ status: 'accepted' }).errors.length, 1);
  assert.equal(validateStatusUpdateInput({ status: 'completed' }).errors.length, 1);
  assert.equal(validateStatusUpdateInput({ status: 'cancelled' }).errors.length, 1);
  assert.deepEqual(validateStatusUpdateInput({ status: 'rejected' }).value, { status: 'rejected' });
});

test('id param must be a UUID', () => {
  assert.equal(validateIdParams({ id: SERVICE_ID }).errors.length, 0);
  assert.equal(validateIdParams({ id: '101' }).errors.length, 1);
});
