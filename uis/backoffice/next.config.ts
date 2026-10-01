import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() {
    return [{
      source: "/api/:path*",
      destination: `${process.env.NEXT_PUBLIC_INVENTORY_API_URL || "http://127.0.0.1:8000"}/:path*`,
    }];
  },
};

export default nextConfig;