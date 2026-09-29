import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  // 4GB sandbox: keep Turbopack's Rust heap below the cgroup ceiling so the
  // OOM killer doesn't take down next-server when Chrome shares the box.
  experimental: {
    turbopackMemoryLimit: 1024,
  },
};

export default nextConfig;
