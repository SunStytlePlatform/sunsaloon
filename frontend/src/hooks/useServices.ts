'use client';

import { useQuery } from '@tanstack/react-query';
import { BROWSER_API_BASE, normalizeService } from '@/lib/api/normalize';
import type { Service } from '@/types/service';

async function fetchServices(): Promise<Service[]> {
  let res: Response;
  try {
    res = await fetch(`${BROWSER_API_BASE}/api/services`);
  } catch {
    throw new Error('Network connection unavailable. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(body?.data)) throw new Error(body?.message || 'We could not load the services.');
  return body.data.map(normalizeService);
}

// initialData comes from the server render; when it failed there, the query loads in the browser with retries.
export function useServices(initial: Service[] | undefined, enabled: boolean) {
  return useQuery({ queryKey: ['services'], queryFn: fetchServices, initialData: initial, enabled });
}
