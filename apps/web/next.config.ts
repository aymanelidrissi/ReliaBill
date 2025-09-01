import type { NextConfig } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3333';

const nextConfig: NextConfig = {
  experimental: { optimizePackageImports: ['lucide-react'] },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_BASE}/:path*` }
    ];
  }
};

export default nextConfig;
