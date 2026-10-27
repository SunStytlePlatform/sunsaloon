import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

process.on('unhandledRejection', (reason) => logger.error('Unhandled promise rejection', reason));
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception - shutting down', err);
  process.exit(1);
});

logger.debug('Configuration loaded', {
  logLevel: logger.level,
  port: env.port,
  corsAllowedOrigins: env.corsAllowedOrigins,
  supabaseConfigured: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
});

try {
  await connectDB();
} catch (err) {
  logger.error('Unexpected error while connecting to the database - continuing without it', err);
}

const server = app.listen(env.port, () => {
  logger.info(`Backend listening on http://localhost:${env.port} (LOG_LEVEL=${logger.level})`);
  logger.info(`CORS allow list: ${env.corsAllowedOrigins.join(', ') || '(none)'}`);
  logger.info(`Custom message: ${env.customMessage}`);
});

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
