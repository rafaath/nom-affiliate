import type { NextConfig } from 'next';

const isWindows = process.platform === 'win32';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react'],
    turbopackFileSystemCacheForDev: !isWindows,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
