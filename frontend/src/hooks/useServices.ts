'use client';

import { useQuery } from '@tanstack/react-query';
import type { Service } from '@/types/service';

async function fetchServices(): Promise<Service[]> {
  let res: Response;
  try {
    res = await fetch('/api/services');
  } catch {
    throw new Error('Network connection unavailable. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || 'We could not load the services.');
  return body.data as Service[];
}

// initialData comes from the server render; when it failed there, the query loads on the client with retries.
export function useServices(initial: Service[] | undefined, enabled: boolean) {
  return useQuery({ queryKey: ['services'], queryFn: fetchServices, initialData: initial, enabled });
}
