export const env = {
  // Render injects PORT; fall back to BACKEND_PORT from .env locally.
  port: Number(process.env.PORT || process.env.BACKEND_PORT) || 5000,
  customMessage: process.env.CUSTOM_MESSAGE ?? '(CUSTOM_MESSAGE not set - .env not loaded)',
  corsAllowedOrigins: (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
};
