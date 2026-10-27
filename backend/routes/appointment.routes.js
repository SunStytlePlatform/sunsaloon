import { Router } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  validateAppointmentFilters,
  validateCreateAppointmentInput,
  validateIdParams,
  validateStatusUpdateInput,
} from '../utils/validators.js';
import {
  createAppointment,
  listAppointments,
  updateAppointmentStatus,
} from '../controllers/appointment.controller.js';

const router = Router();

const bookingRateLimiter = createRateLimiter({ name: 'booking', ...env.bookingRateLimit });

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/appointment.routes.js`);
  next();
});

// Public: guest booking.
router.post('/', bookingRateLimiter, validateBody(validateCreateAppointmentInput), createAppointment);

// Admin.
router.get('/', adminAuth, validateQuery(validateAppointmentFilters), listAppointments);
router.patch(
  '/:id/status',
  adminAuth,
  validateParams(validateIdParams),
  validateBody(validateStatusUpdateInput),
  updateAppointmentStatus,
);

export default router;
