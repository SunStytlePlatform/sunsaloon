import app, { setFrontendHandler } from './app.js';
import { createFrontendHandler } from './utils/frontend.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection', reason));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception - shutting down', err);
  process.exit(1);
});

logger.debug('Configuration loaded', {
  appEnv: env.appEnv,
  logLevel: logger.level,
  port: env.port,
  corsAllowedOrigins: env.corsAllowedOrigins,
  supabaseConfigured: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
  salonTimeZone: env.salonTimeZone,
  bookingRateLimit: env.bookingRateLimit,
  trustProxy: env.trustProxy,
});

if (env.isProduction && ['debug', 'http'].includes(logger.level)) {
  logger.warn(`LOG_LEVEL=${logger.level} in production is very verbose - use "info" or "warn" (emails and phone numbers are masked in logs, but request details are still written)`);
}

if (env.isProduction && !env.trustProxy) {
  logger.warn('TRUST_PROXY is not set - if this server sits behind a reverse proxy/load balancer, every visitor shares one rate-limit bucket (set TRUST_PROXY=<number of proxies>)');
}

if (env.adminApiKey) {
  logger.info('Admin endpoints are enabled and require the ADMIN_API_KEY bearer token');
} else {
  logger.warn('ADMIN_API_KEY is not set - admin endpoints are DISABLED (403)');
}

try {
  await connectDB();
} catch (err) {
  logger.error('Unexpected error while connecting to the database - continuing without it', err);
}

const frontend = await createFrontendHandler();
if (frontend) setFrontendHandler(frontend.handler);

const server = app.listen(env.port, () => {
  logger.info(`Server listening on http://localhost:${env.port} (LOG_LEVEL=${logger.level})`);
  logger.info(`CORS allow list: ${env.corsAllowedOrigins.join(', ') || '(none)'}`);
  logger.info(`Custom message: ${env.customMessage}`);
});

if (frontend?.upgrade) server.on('upgrade', frontend.upgrade);

server.on('error', (err) => {
  const reason = err.code === 'EADDRINUSE' ? `port ${env.port} is already in use` : err.message;
  logger.error(`Server failed to start: ${reason}`, err);
  process.exit(1);
});

// Render sends SIGTERM on redeploy; finish in-flight requests before exiting.
function shutdown(signal) {
  logger.info(`${signal} received - shutting down gracefully`);
  server.close((err) => {
    if (err) {
      logger.error('Error while closing the server', err);
      process.exit(1);
    }
    logger.info('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Shutdown timed out - forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
