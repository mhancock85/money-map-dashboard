import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/money-map-dashboard',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
