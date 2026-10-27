import { logger } from '../utils/logger.js';
import { sendSuccess } from '../utils/response.js';
import { getActiveServiceById, listActiveServices } from '../services/service.service.js';

export async function getService(req, res, next) {
  try {
    logger.debug(`[${req.id}] entered service.controller.getService`);
    const service = await getActiveServiceById(req.validated.params.id);
    sendSuccess(res, { message: 'Service retrieved successfully', data: service });
  } catch (err) {
    logger.debug(`[${req.id}] service.controller.getService failed: ${err.message}`);
    next(err);
  }
}

export async function listServices(req, res, next) {
  try {
    logger.debug(`[${req.id}] entered service.controller.listServices`);
    const services = await listActiveServices();
    sendSuccess(res, { message: 'Services retrieved successfully', data: services });
  } catch (err) {
    logger.debug(`[${req.id}] service.controller.listServices failed: ${err.message}`);
    next(err);
  }
}
