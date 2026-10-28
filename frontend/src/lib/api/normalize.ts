import type { Service } from '@/types/service';

// Shared by server code and the browser; maps the backend's service row to the frontend Service shape.
export function normalizeService(raw: Record<string, unknown>): Service {
  const price = raw.price === null || raw.price === undefined ? NaN : Number(raw.price);
  const duration = raw.duration_minutes === null || raw.duration_minutes === undefined ? NaN : Number(raw.duration_minutes);
  return {
    id: String(raw.id),
    name: typeof raw.name === 'string' ? raw.name : 'Service',
    description: typeof raw.description === 'string' && raw.description.trim() ? raw.description.trim() : null,
    price: Number.isFinite(price) ? price : null,
    durationMinutes: Number.isFinite(duration) ? duration : null,
  };
}

// Empty = same origin (Express serves both the API and the frontend). Set for a separate `next dev` server.
export const BROWSER_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
