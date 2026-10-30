import { Router } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { createIdempotency } from '../middleware/idempotency.js';
import { honeypot } from '../middleware/honeypot.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  validateAppointmentFilters,
  validateCreateAppointmentInput,
  validateIdParams,
  validateStatusUpdateInput,
} from '../utils/validators.js';
import {
  createAppointment,
  getAppointment,
  listAppointments,
  updateAppointmentStatus,
} from '../controllers/appointment.controller.js';

const router = Router();

const bookingRateLimiter = createRateLimiter({ name: 'booking', ...env.bookingRateLimit });
const idempotency = createIdempotency();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/appointment.routes.js`);
  next();
});

// Public: guest booking.
// Order matters: replays and bot traps are answered before they use up the caller's rate-limit quota, and the
// quota is only spent on well-formed requests so a customer fixing a typo is not locked out.
router.post(
  '/',
  honeypot,
  idempotency,
  validateBody(validateCreateAppointmentInput),
  bookingRateLimiter,
  createAppointment,
);

// Admin.
router.get('/', adminAuth, validateQuery(validateAppointmentFilters), listAppointments);
router.get('/:id', adminAuth, validateParams(validateIdParams), getAppointment);
router.patch(
  '/:id/status',
  adminAuth,
  validateParams(validateIdParams),
  validateBody(validateStatusUpdateInput),
  updateAppointmentStatus,
);

export default router;
