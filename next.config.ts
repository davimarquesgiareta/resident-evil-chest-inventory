import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mcyruricwobkowcdzbui.supabase.co",
      },
      {
        protocol: "https",
        hostname: "www.evilresource.com",
      },
    ],
  },
};

export default nextConfig;
