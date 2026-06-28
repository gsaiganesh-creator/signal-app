import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@signal/ui', '@signal/api-client'],
  async rewrites() {
    return [
      {
        source: '/api/ml/:path*',
        destination: `${process.env.ML_API_URL ?? 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
