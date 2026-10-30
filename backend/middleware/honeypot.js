import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';

// The booking form carries a hidden `website` field that people never see or fill in. Bots that auto-fill every
// input reveal themselves; they get a response shaped like a real booking so they cannot tell they were caught, and
// nothing is stored. This runs before the idempotency store so bot traffic never occupies it.
export const HONEYPOT_FIELD = 'website';

const text = (value) => (typeof value === 'string' ? value.slice(0, 64) : null);

export function honeypot(req, res, next) {
  const body = req.body;
  const value = body?.[HONEYPOT_FIELD];
  if (typeof value === 'string' && value.trim() !== '') {
    logger.warn(`[${req.id}] honeypot field filled - request dropped (ip ${req.ip})`);
    return sendSuccess(res, {
      status: 201,
      message: 'Appointment request submitted successfully',
      data: {
        id: randomUUID(),
        service_id: text(body.service_id),
        appointment_date: text(body.appointment_date),
        appointment_time: text(body.appointment_time),
        status: 'pending',
        notes: null,
        created_at: new Date().toISOString(),
      },
    });
  }
  next();
}
