import { Router } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';
import shopRoutes from './shop.routes.js';
import serviceRoutes from './service.routes.js';
import appointmentRoutes from './appointment.routes.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/api.routes.js`);
  next();
});

// Public: lets the booking form restrict the date/time pickers to what the server will accept.
router.get('/booking-rules', (req, res) => {
  sendSuccess(res, {
    message: 'Booking rules retrieved successfully',
    data: { timeZone: env.salonTimeZone, ...env.bookingRules },
  });
});

router.use('/shops', shopRoutes);
router.use('/services', serviceRoutes);
router.use('/appointments', appointmentRoutes);

export default router;
