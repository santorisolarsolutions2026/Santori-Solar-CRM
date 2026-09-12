import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  turbopack: {
    root: __dirname,
  }
};

export default nextConfig;
