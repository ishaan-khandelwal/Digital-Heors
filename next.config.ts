import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint is handled separately; don't fail the build on ESLint warnings
    ignoreDuringBuilds: true,
  },
  // Prevent Next.js from bundling server-only Node modules (fs, path, crypto)
  // into the client-side bundle
  serverExternalPackages: ['fs', 'path', 'crypto'],
};

export default nextConfig;
