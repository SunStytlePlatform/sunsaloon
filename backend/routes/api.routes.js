import { Router } from 'express';
import { logger } from '../utils/logger.js';
import shopRoutes from './shop.routes.js';
import serviceRoutes from './service.routes.js';
import appointmentRoutes from './appointment.routes.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/api.routes.js`);
  next();
});

router.use('/shop', shopRoutes);
router.use('/services', serviceRoutes);
router.use('/appointments', appointmentRoutes);

export default router;
