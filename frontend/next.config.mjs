/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose non-NEXT_PUBLIC_ values from the shared .env to client code.
  env: {
    CUSTOM_MESSAGE: process.env.CUSTOM_MESSAGE ?? '',
  },
};

export default nextConfig;
