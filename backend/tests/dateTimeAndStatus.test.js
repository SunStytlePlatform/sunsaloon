import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNowInTimeZone, isInPast, isValidDateString, isValidTimeString } from '../utils/dateTime.js';
import { allowedNextStatuses, canTransition } from '../utils/appointmentStatus.js';

test('isValidDateString checks real calendar dates', () => {
  assert.equal(isValidDateString('2028-02-29'), true);
  assert.equal(isValidDateString('2026-02-29'), false);
  assert.equal(isValidDateString('2026-13-01'), false);
  assert.equal(isValidDateString('2026-1-1'), false);
});

test('isValidTimeString accepts 24h HH:MM[:SS]', () => {
  assert.equal(isValidTimeString('00:00'), true);
  assert.equal(isValidTimeString('23:59:59'), true);
  assert.equal(isValidTimeString('24:00'), false);
  assert.equal(isValidTimeString('9:30'), false);
});

test('isInPast compares against the salon-local now', () => {
  const now = { date: '2026-11-15', time: '10:30' };
  assert.equal(isInPast('2026-11-14', '23:00', now), true);
  assert.equal(isInPast('2026-11-15', '10:30', now), true);
  assert.equal(isInPast('2026-11-15', '10:31', now), false);
  assert.equal(isInPast('2026-11-16', '00:00', now), false);
});

test('getNowInTimeZone converts to the given zone', () => {
  const instant = new Date('2026-11-15T20:00:00Z');
  assert.deepEqual(getNowInTimeZone('Asia/Kolkata', instant), { date: '2026-11-16', time: '01:30' });
  assert.deepEqual(getNowInTimeZone('UTC', instant), { date: '2026-11-15', time: '20:00' });
});

test('status hierarchy: pending -> confirmed -> completed/cancelled, pending -> rejected', () => {
  assert.equal(canTransition('pending', 'confirmed'), true);
  assert.equal(canTransition('pending', 'rejected'), true);
  assert.equal(canTransition('confirmed', 'completed'), true);
  assert.equal(canTransition('confirmed', 'cancelled'), true);
  assert.equal(canTransition('pending', 'completed'), false);
  assert.equal(canTransition('pending', 'cancelled'), false);
  assert.equal(canTransition('confirmed', 'rejected'), false);
  assert.equal(canTransition('rejected', 'confirmed'), false);
  assert.equal(canTransition('completed', 'cancelled'), false);
  assert.deepEqual(allowedNextStatuses('constructor'), []);
});
