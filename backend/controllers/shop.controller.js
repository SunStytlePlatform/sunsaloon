import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';
import { getCurrentShop } from '../services/shop.service.js';

export async function getShop(req, res, next) {
  try {
    logger.debug(`[${req.id}] entered shop.controller.getShop`);
    const shop = await getCurrentShop();
    sendSuccess(res, { message: 'Salon details retrieved successfully', data: shop });
  } catch (err) {
    logger.debug(`[${req.id}] shop.controller.getShop failed: ${err.message}`);
    next(err);
  }
}
