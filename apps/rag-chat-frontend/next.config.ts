import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output configuration
  // Use 'standalone' for Docker or Node.js deployment (includes minimal runtime)
  // Use undefined (default) for Vercel deployment
  // Use 'export' for static site generation (no server-side features)
  output: process.env.NEXT_OUTPUT_MODE as 'standalone' | 'export' | undefined,

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize production builds
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller bundles

  // Image optimization configuration
  images: {
    // For static export, use unoptimized images
    unoptimized: process.env.NEXT_OUTPUT_MODE === 'export',
    // For other deployments, configure remote patterns as needed
    remotePatterns: [],
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_JWT_TOKEN: process.env.NEXT_PUBLIC_JWT_TOKEN,
    NEXT_PUBLIC_TEST_API_KEY: process.env.TEST_API_KEY || process.env.NEXT_PUBLIC_TEST_API_KEY,
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Headers configuration for security and CORS (if needed for embedded mode)
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
