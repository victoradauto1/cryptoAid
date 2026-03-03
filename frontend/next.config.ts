import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Allow:
     * 1. Internal API proxy route
     * 2. Any local static image (like /logo.png, /selfhug.png)
     */
    localPatterns: [
      {
        pathname: "/api/image-proxy",
      },
      {
        pathname: "/**", // allow all local static files
      },
    ],

    // No need for remotePatterns because all external images go through the proxy
    remotePatterns: [],

    unoptimized: false,
  },
};

export default nextConfig;