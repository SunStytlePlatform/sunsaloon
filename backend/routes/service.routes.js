import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { listServices } from '../controllers/service.controller.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/service.routes.js`);
  next();
});

router.get('/', listServices);

export default router;
