import { Router } from 'express';
import { logger } from '../utils/logger.js';
import healthRoutes from './health.routes.js';
import dbRoutes from './db.routes.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/index.js`);
  next();
});

router.use('/health', healthRoutes);
router.use('/db', dbRoutes);

export default router;
