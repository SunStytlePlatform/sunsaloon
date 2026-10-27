import { test } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../config/env.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validate.js';
import { validateStatusUpdateInput } from '../utils/validators.js';

const fakeRes = () => ({ headers: {}, set(name, value) { this.headers[name] = value; } });
const run = (middleware, req = {}) => {
  let nextArg = 'not-called';
  middleware({ id: 'test', method: 'GET', originalUrl: '/api/x', ...req }, fakeRes(), (arg) => { nextArg = arg; });
  return nextArg;
};

test('adminAuth bypasses in development and blocks in production', (t) => {
  const original = env.isProduction;
  t.after(() => { env.isProduction = original; });

  env.isProduction = false;
  assert.equal(run(adminAuth), undefined);

  env.isProduction = true;
  const err = run(adminAuth);
  assert.equal(err.status, 403);
  assert.equal(err.code, 'ADMIN_ACCESS_DISABLED');
});

test('rate limiter allows max requests per window then returns 429', () => {
  const limiter = createRateLimiter({ name: 'test', max: 2, windowMs: 60_000 });
  assert.equal(run(limiter, { ip: '1.1.1.1' }), undefined);
  assert.equal(run(limiter, { ip: '1.1.1.1' }), undefined);
  const err = run(limiter, { ip: '1.1.1.1' });
  assert.equal(err.status, 429);
  assert.equal(run(limiter, { ip: '2.2.2.2' }), undefined);
});

test('validateBody stores sanitised input or forwards a 422', () => {
  const middleware = validateBody(validateStatusUpdateInput);

  const okReq = { id: 't', body: { status: ' Confirmed ' } };
  middleware(okReq, fakeRes(), () => {});
  assert.deepEqual(okReq.validated.body, { status: 'confirmed' });

  const err = run(middleware, { body: { status: 'nope' } });
  assert.equal(err.status, 422);
  assert.equal(err.code, 'VALIDATION_ERROR');
});
