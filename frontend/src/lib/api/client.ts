import 'server-only';

// Backend envelope: { success: true, message, data } | { success: false, message, error: { code, details } }.
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }

  get isNotFound() {
    return this.status === 404;
  }
}

const REQUEST_TIMEOUT_MS = 10_000;

function baseUrl(): string {
  // Same process as Express in production, so loopback on the port Express listens on.
  const port = process.env.PORT || process.env.BACKEND_PORT || 5000;
  const url = process.env.API_BASE_URL || `http://127.0.0.1:${port}`;
  return url.replace(/\/+$/, '');
}

export type CacheMode = 'no-store' | { revalidate: number };

interface RequestOptions {
  cache?: CacheMode;
}

export async function apiRequest<T = unknown>(path: string, { cache = 'no-store' }: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(cache === 'no-store' ? { cache: 'no-store' as const } : { next: { revalidate: cache.revalidate } }),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    throw new ApiRequestError(
      timedOut ? 'The server took too long to respond.' : 'Unable to reach the server. Please try again shortly.',
      503,
      timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
    );
  }

  let json: { data?: T; message?: string; error?: { code?: string; details?: unknown } } | null = null;
  try {
    json = await res.json();
  } catch {
    // handled below
  }

  if (!res.ok) {
    throw new ApiRequestError(
      json?.message || `Request failed with status ${res.status}.`,
      res.status,
      json?.error?.code || 'UPSTREAM_ERROR',
      json?.error?.details,
    );
  }
  if (!json || !('data' in json)) {
    throw new ApiRequestError('Unexpected response from the server.', 502, 'BAD_RESPONSE');
  }
  return json.data as T;
}
