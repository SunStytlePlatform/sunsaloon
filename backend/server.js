import express from 'express';
import cors from 'cors';

const PORT = Number(process.env.BACKEND_PORT) || 5000;
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

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log(`CORS allow list: ${allowedOrigins.join(', ') || '(none)'}`);
  console.log(`Custom message: ${CUSTOM_MESSAGE}`);
});
