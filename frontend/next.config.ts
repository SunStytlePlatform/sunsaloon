import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Shop logos come from arbitrary hosts (Supabase storage etc.), so they are rendered
  // with plain <img> elements instead of next/image to avoid an open remote-host allowlist.
  poweredByHeader: false,
  // Linting runs via `npm run lint`; eslint is a devDependency and is absent from production installs.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
