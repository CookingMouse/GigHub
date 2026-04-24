import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopack: {
      // This tells Turbopack the root is 2 levels up (the GigHub folder)
      root: "../../"
    }
  }
};

export default nextConfig;

