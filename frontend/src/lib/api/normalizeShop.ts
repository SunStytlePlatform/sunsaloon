import type { Shop } from '@/types/shop';

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Only https images are accepted: javascript:/data:/http: URLs from the database are dropped (the site falls back to
// the initial-letter avatar), which also avoids mixed content and tracking over plain http.
export function safeLogoUrl(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// Maps backend shop_settings columns to the frontend Shop shape.
export function normalizeShop(raw: Raw): Shop {
  return {
    id: String(raw.id),
    name: str(raw.shop_name) ?? str(raw.name) ?? 'Salon',
    description: str(raw.description),
    address: str(raw.address),
    phone: str(raw.phone),
    email: str(raw.email),
    logoUrl: safeLogoUrl(raw.logo_url),
  };
}
