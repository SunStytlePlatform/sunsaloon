import 'server-only';
import { apiRequest } from './client';
import type { Shop } from '@/types/shop';

const REVALIDATE_SECONDS = 60;

type Raw = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

// Isolated normalizer: maps backend shop_settings columns to the frontend Shop shape.
function normalizeShop(raw: Raw): Shop {
  return {
    id: String(raw.id),
    name: str(raw.shop_name) ?? str(raw.name) ?? 'Salon',
    description: str(raw.description),
    address: str(raw.address),
    phone: str(raw.phone),
    email: str(raw.email),
    logoUrl: str(raw.logo_url),
  };
}

export async function getShops(): Promise<Shop[]> {
  const data = await apiRequest<Raw[] | null>('/api/shops', { cache: { revalidate: REVALIDATE_SECONDS } });
  return (data ?? []).map(normalizeShop);
}

export async function getShopById(id: string): Promise<Shop> {
  const data = await apiRequest<Raw>(`/api/shops/${encodeURIComponent(id)}`, { cache: { revalidate: REVALIDATE_SECONDS } });
  return normalizeShop(data);
}
