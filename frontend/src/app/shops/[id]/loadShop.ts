import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ApiRequestError } from '@/lib/api/client';
import { getShopById } from '@/lib/api/shops';

// The backend only accepts UUID ids, so anything else is a 404 without a pointless backend round trip.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Deduplicates the fetch between the layout, generateMetadata and the page. Only real 404/400 (bad id) become
// notFound; backend outages propagate to the error boundary.
export const loadShop = cache(async (id: string) => {
  if (!UUID_RE.test(id)) notFound();
  try {
    return await getShopById(id);
  } catch (err) {
    if (err instanceof ApiRequestError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
});
