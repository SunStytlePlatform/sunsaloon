import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// Origin of a separately hosted API (`next dev` + Express on another port); empty when served from the same origin.
function apiOrigin(): string {
  try {
    return process.env.NEXT_PUBLIC_API_BASE_URL ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin : '';
  } catch {
    return '';
  }
}

// NEXT_PUBLIC_* values are inlined into the browser bundle at build time. A localhost API URL in a production build
// means visitors' browsers would call their own machine and booking would silently fail.
if (!isDev && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(process.env.NEXT_PUBLIC_API_BASE_URL ?? '')) {
  console.warn(
    `\n[config] WARNING: NEXT_PUBLIC_API_BASE_URL="${process.env.NEXT_PUBLIC_API_BASE_URL}" is baked into this production build. ` +
      'Leave it empty when Express serves the site, or booking and services will fail for real visitors.\n',
  );
}

// Next.js needs inline scripts/styles (hydration data, the theme init script), so script-src keeps 'unsafe-inline'.
// Everything else is locked down: no plugins, no framing, no foreign base/form targets, https-only remote images.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin()}${isDev ? ' ws: wss:' : ''}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  // Shop logos come from arbitrary hosts (Supabase storage etc.), so they are rendered
  // with plain <img> elements instead of next/image to avoid an open remote-host allowlist.
  poweredByHeader: false,
  // Linting runs via `npm run lint`; eslint is a devDependency and is absent from production installs.
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
