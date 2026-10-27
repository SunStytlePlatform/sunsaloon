import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let supabase = null;
const HEALTH_TIMEOUT_MS = 5000;

export async function connectDB() {
  if (env.supabaseUrl && env.supabaseServiceRoleKey) {
    try {
      logger.debug('Supabase: creating client');
      supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } catch (err) {
      supabase = null;
      logger.error(`Supabase: failed to create client - ${err.message}`, err);
    }
  } else {
    logger.warn('Supabase: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing - client not created');
  }
  return checkDBConnection();
}

// supabase-js connects lazily, so ping the Auth health endpoint to verify URL + key.
// Never throws: always resolves to { connected, message }.
export async function checkDBConnection() {
  logger.debug('Supabase: checking connection');
  const start = Date.now();
  let result;
  if (!supabase) {
    result = { connected: false, message: 'Supabase client is not configured (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)' };
  } else {
    try {
      const res = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
        headers: { apikey: env.supabaseServiceRoleKey },
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
      });
      logger.debug(`Supabase: health endpoint responded ${res.status} in ${Date.now() - start} ms`);
      if (res.ok) {
        result = { connected: true, message: 'Connected to Supabase successfully' };
      } else if (res.status === 401 || res.status === 403) {
        result = { connected: false, message: `Supabase rejected the API key (status ${res.status})` };
      } else {
        result = { connected: false, message: `Supabase responded with status ${res.status}` };
      }
    } catch (err) {
      logger.debug('Supabase: connection error details', err);
      result = err.name === 'TimeoutError'
        ? { connected: false, message: `Supabase did not respond within ${HEALTH_TIMEOUT_MS} ms` }
        : { connected: false, message: `Unable to reach Supabase: ${err.message}` };
    }
  }

  if (result.connected) logger.info(`Supabase: ${result.message}`);
  else logger.error(`Supabase: connection FAILED - ${result.message}`);
  return result;
}

export function getSupabase() {
  if (!supabase) throw new Error('Supabase client not initialised - check SUPABASE_* env vars');
  return supabase;
}
