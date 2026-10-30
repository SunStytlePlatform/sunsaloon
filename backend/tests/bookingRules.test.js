import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBookingRules } from '../utils/bookingRules.js';

const rules = { openingTime: '09:00', closingTime: '21:00', slotIntervalMinutes: 30, maxAdvanceDays: 90 };
const now = { date: '2026-10-30', time: '12:00' };

test('allows slots on the grid inside opening hours', () => {
  assert.equal(checkBookingRules('2026-11-02', '09:00', now, rules), null);
  assert.equal(checkBookingRules('2026-11-02', '20:30', now, rules), null);
});

test('rejects times before opening, at or after closing', () => {
  assert.equal(checkBookingRules('2026-11-02', '08:30', now, rules).code, 'OUTSIDE_OPENING_HOURS');
  assert.equal(checkBookingRules('2026-11-02', '21:00', now, rules).code, 'OUTSIDE_OPENING_HOURS');
  assert.equal(checkBookingRules('2026-11-02', '00:00', now, rules).code, 'OUTSIDE_OPENING_HOURS');
});

test('rejects times that are not on the slot grid', () => {
  const result = checkBookingRules('2026-11-02', '10:10', now, rules);
  assert.equal(result.code, 'INVALID_SLOT');
  assert.equal(result.field, 'appointment_time');
});

test('slot grid is measured from opening time', () => {
  const odd = { ...rules, openingTime: '09:15' };
  assert.equal(checkBookingRules('2026-11-02', '09:45', now, odd), null);
  assert.equal(checkBookingRules('2026-11-02', '10:00', now, odd).code, 'INVALID_SLOT');
});

test('enforces the maximum advance window, inclusive of the last day', () => {
  assert.equal(checkBookingRules('2027-01-28', '10:00', now, rules), null); // exactly 90 days
  assert.equal(checkBookingRules('2027-01-29', '10:00', now, rules).code, 'TOO_FAR_AHEAD');
});
