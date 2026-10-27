import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

// Runs a pure validator against req[source] and stores the sanitised result on req.validated[source].
function validate(source, validator) {
  return (req, res, next) => {
    const { value, errors, status = 422 } = validator(req[source]);
    if (errors.length) {
      logger.debug(`[${req.id}] ${source} validation failed`, errors);
      const message = status === 400 ? 'Invalid request' : 'Request validation failed';
      return next(new ApiError(status, status === 400 ? 'INVALID_REQUEST' : 'VALIDATION_ERROR', message, errors));
    }
    req.validated = { ...req.validated, [source]: value };
    logger.debug(`[${req.id}] ${source} validation passed`);
    next();
  };
}

export const validateBody = (validator) => validate('body', validator);
export const validateQuery = (validator) => validate('query', validator);
export const validateParams = (validator) => validate('params', validator);
