import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

let supabase = null;

export async function connectDB() {
  if (env.supabaseUrl && env.supabaseServiceRoleKey) {
    supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return checkDBConnection();
}

// supabase-js connects lazily, so ping the Auth health endpoint to verify URL + key.
export async function checkDBConnection() {
  let result;
  if (!supabase) {
    result = { connected: false, message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set' };
  } else {
    try {
      const res = await fetch(`${env.supabaseUrl}/auth/v1/health`, {
        headers: { apikey: env.supabaseServiceRoleKey },
      });
      result = res.ok
        ? { connected: true, message: 'Connected to Supabase successfully' }
        : { connected: false, message: `Supabase responded with status ${res.status}` };
    } catch (err) {
      result = { connected: false, message: `Unable to reach Supabase: ${err.message}` };
    }
  }

  if (result.connected) console.log(`Supabase: ${result.message}`);
  else console.error(`Supabase: connection FAILED - ${result.message}`);
  return result;
}

export function getSupabase() {
  if (!supabase) throw new Error('Supabase client not initialised - check SUPABASE_* env vars');
  return supabase;
}
