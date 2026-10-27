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

await connectDB();

const server = app.listen(env.port, () => {
  logger.info(`Backend listening on http://localhost:${env.port} (LOG_LEVEL=${logger.level})`);
  logger.info(`CORS allow list: ${env.corsAllowedOrigins.join(', ') || '(none)'}`);
  logger.info(`Custom message: ${env.customMessage}`);
});

server.on('error', (err) => {
  logger.error(`Server failed to start on port ${env.port}: ${err.message}`, err);
  process.exit(1);
});
