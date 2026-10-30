import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';

// The booking form carries a hidden `website` field that people never see or fill in. Bots that auto-fill every
// input reveal themselves; they get a normal-looking success so they do not adapt, and nothing is stored.
export const HONEYPOT_FIELD = 'website';

export function honeypot(req, res, next) {
  const value = req.body?.[HONEYPOT_FIELD];
  if (typeof value === 'string' && value.trim() !== '') {
    logger.warn(`[${req.id}] honeypot field filled - request dropped (ip ${req.ip})`);
    return sendSuccess(res, { status: 201, message: 'Appointment request submitted successfully', data: null });
  }
  next();
}
