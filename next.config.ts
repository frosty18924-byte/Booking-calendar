import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // This allows production builds to successfully complete 
    // even if your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // This allows production builds to successfully complete 
    // even if your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
};

export default nextConfig;