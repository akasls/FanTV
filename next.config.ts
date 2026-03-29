import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['fluent-ffmpeg', '@ffprobe-installer/ffprobe'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
