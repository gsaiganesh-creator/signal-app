import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@signal/ui', '@signal/api-client'],
};

export default nextConfig;
