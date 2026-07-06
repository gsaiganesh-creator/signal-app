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
  async redirects() {
    return [
      // /risk was a legacy duplicate of /risk-disclosure — consolidated to one canonical page.
      { source: '/risk', destination: '/risk-disclosure', permanent: true },
    ];
  },
};

export default nextConfig;
