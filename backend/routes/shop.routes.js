import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { getShop } from '../controllers/shop.controller.js';

const router = Router();

router.use((req, res, next) => {
  logger.debug(`[${req.id}] entered routes/shop.routes.js`);
  next();
});

router.get('/', getShop);

export default router;
