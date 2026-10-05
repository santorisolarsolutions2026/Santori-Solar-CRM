import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'leaflet', 'recharts'],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
