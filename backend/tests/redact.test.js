import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactText, redactValue } from '../utils/redact.js';

test('masks emails and phone numbers in text', () => {
  assert.equal(redactText('booked by alice@example.com'), 'booked by [email]');
  assert.equal(redactText('Key (phone)=(9000000001) already exists'), 'Key (phone)=(***01) already exists');
  assert.equal(redactText('call +919876543210 now'), 'call ***10 now');
});

test('leaves dates, times, ids and durations alone', () => {
  const text = 'slot 2027-01-10 10:00 req 3f2b8c1e id 3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f took 123.4 ms status 409';
  assert.equal(redactText(text), text);
});

test('masks nested metadata and errors without mutating the original', () => {
  const meta = { details: 'phone 9000000001', list: ['a@b.co'], n: 5 };
  const clean = redactValue(meta);
  assert.deepEqual(clean, { details: 'phone ***01', list: ['[email]'], n: 5 });
  assert.equal(meta.details, 'phone 9000000001');

  const err = redactValue(new Error('duplicate 9000000001'));
  assert.ok(err instanceof Error);
  assert.equal(err.message, 'duplicate ***01');
  assert.ok(!err.stack.includes('9000000001'));
});
