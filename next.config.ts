import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 썸네일(data URL, ~400KB) + 긴 본문 저장을 위한 여유
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
