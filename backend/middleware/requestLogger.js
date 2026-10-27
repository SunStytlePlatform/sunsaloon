import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';

export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  req.id = randomUUID().slice(0, 8);

  logger.ingress(`--> [${req.id}] ${req.method} ${req.originalUrl}`);
  logger.debug(`[${req.id}] request details`, {
    ip: req.ip,
    origin: req.get('origin') ?? null,
    userAgent: req.get('user-agent') ?? null,
    query: req.query,
  });

  res.on('finish', () => {
    const ms = (Number(process.hrtime.bigint() - start) / 1e6).toFixed(1);
    logger.egress(`<-- [${req.id}] ${req.method} ${req.originalUrl} ${res.statusCode} (${ms} ms)`, res.statusCode);
  });

  res.on('close', () => {
    if (!res.writableFinished) {
      logger.warn(`[${req.id}] connection closed before the response was sent`);
    }
  });

  next();
}
