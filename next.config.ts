import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  allowedDevOrigins: isDev
    ? ['localhost:5000', '127.0.0.1:5000', '192.168.31.28:5000', '192.168.31.28']
    : [],

  serverExternalPackages: ['pg', '@prisma/client', 'prisma', 'web-push'],

  experimental: {
    /* WHY: Tree-shakes barrel exports (index.ts files) of these packages,
       so only the specific icons/components used get bundled.
       Without this, 'lucide-react' alone adds ~100KB to the bundle. */
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      'canvas-confetti',
      'swr',
      'zustand',
      'sonner',
      'zod',
    ],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: isDev
          ? [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }]
          : [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|svg|webp|avif|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: isDev ? 'no-store' : 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      /* WHY: Security headers improve Lighthouse Best Practices score.
         X-Content-Type-Options prevents MIME-sniffing attacks.
         X-Frame-Options blocks clickjacking.
         Referrer-Policy limits information leakage.
         Permissions-Policy restricts access to sensitive device APIs. */
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
