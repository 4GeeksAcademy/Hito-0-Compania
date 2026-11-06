import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: { root: process.cwd() },
   devIndicators: false,
};

export default nextConfig;
