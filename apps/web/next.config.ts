import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Windows can retain a transient lock on the default .next trace file.
  distDir: ".next-build"
};

export default nextConfig;
