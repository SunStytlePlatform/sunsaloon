import path from 'node:path';
import express from 'express';
import cors from 'cors';

// Render injects PORT; fall back to BACKEND_PORT from .env locally.
const PORT = Number(process.env.PORT || process.env.BACKEND_PORT) || 5000;
const FRONTEND_DIR = path.resolve(import.meta.dirname, '../frontend/out');
const CUSTOM_MESSAGE = process.env.CUSTOM_MESSAGE ?? '(CUSTOM_MESSAGE not set - .env not loaded)';
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, server-to-server) are allowed.
      callback(null, !origin || allowedOrigins.includes(origin));
    },
  }),
);

app.get('/suns/health', (req, res) => {
  res.json({
    status: `healthy at ${new Date().toLocaleString()}`,
    timestamp: new Date().toISOString(),
    customMessage: CUSTOM_MESSAGE,
  });
});

// Serve the statically exported Next.js frontend (built by `npm run build` at the repo root).
app.use(express.static(FRONTEND_DIR));

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log(`CORS allow list: ${allowedOrigins.join(', ') || '(none)'}`);
  console.log(`Custom message: ${CUSTOM_MESSAGE}`);
});
