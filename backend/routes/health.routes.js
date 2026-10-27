import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/health.routes.js`);
  next();
});

router.get('/', getHealth);

export default router;
