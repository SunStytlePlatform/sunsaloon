import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, createAppointmentSchema, salonDateTimeParts } from './appointment.schema.ts';

const rules = { timeZone: 'Asia/Kolkata', openingTime: '09:00', closingTime: '21:00', slotIntervalMinutes: 30, maxAdvanceDays: 90 };
const today = salonDateTimeParts(new Date(), rules.timeZone).date;

const valid = (overrides: Record<string, string> = {}) => ({
  customer_name: 'Alice Doe',
  customer_phone: '98765 43210',
  customer_email: 'Alice@Example.com',
  service_id: '3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f',
  appointment_date: addDays(today, 7),
  appointment_time: '10:30',
  notes: '',
  website: '',
  ...overrides,
});
const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((i) => i.message) ?? [];

test('accepts a valid request and normalises phone and email', () => {
  const result = createAppointmentSchema(rules).safeParse(valid());
  assert.equal(result.success, true);
  assert.equal(result.data?.customer_phone, '9876543210');
  assert.equal(result.data?.customer_email, 'alice@example.com');
});

test('rejects names shorter than two characters and malformed phones', () => {
  const schema = createAppointmentSchema(rules);
  assert.equal(schema.safeParse(valid({ customer_name: 'x' })).success, false);
  assert.equal(schema.safeParse(valid({ customer_phone: '12ab' })).success, false);
});

test('rejects times outside opening hours and off the slot grid', () => {
  const schema = createAppointmentSchema(rules);
  assert.match(messages(schema.safeParse(valid({ appointment_time: '07:00' }))).join(), /open from 09:00 to 21:00/);
  assert.match(messages(schema.safeParse(valid({ appointment_time: '21:00' }))).join(), /open from/);
  assert.match(messages(schema.safeParse(valid({ appointment_time: '10:15' }))).join(), /30-minute boundary/);
  assert.equal(schema.safeParse(valid({ appointment_time: '20:30' })).success, true);
});

test('rejects dates in the past and beyond the booking window', () => {
  const schema = createAppointmentSchema(rules);
  assert.match(messages(schema.safeParse(valid({ appointment_date: addDays(today, -1) }))).join(), /today or a future date/);
  assert.match(messages(schema.safeParse(valid({ appointment_date: addDays(today, 91) }))).join(), /at most 90 days/);
  assert.equal(schema.safeParse(valid({ appointment_date: addDays(today, 90) })).success, true);
});

test('without rules only the basic checks apply', () => {
  assert.equal(createAppointmentSchema(null).safeParse(valid({ appointment_time: '03:00' })).success, true);
});

test('salonDateTimeParts uses the salon wall clock, not the visitor clock', () => {
  const instant = new Date('2026-12-31T20:00:00Z'); // 01:30 on 1 Jan in Kolkata, 15:00 on 31 Dec in New York
  assert.deepEqual(salonDateTimeParts(instant, 'Asia/Kolkata'), { date: '2027-01-01', time: '01:30' });
  assert.deepEqual(salonDateTimeParts(instant, 'America/New_York'), { date: '2026-12-31', time: '15:00' });
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});
