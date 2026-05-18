import path from "node:path";
import type { NextConfig } from "next";

const readApiUrl = () => {
  const value = process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();

  return value ? value.replace(/\/+$/, "") : "http://localhost:4000";
};

const apiUrl = readApiUrl();

const nextConfig: NextConfig = {
  turbopack: {
    // Next.js 16 expects turbopack at the top level and the root must be absolute.
    root: path.resolve(__dirname, "../..")
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`
      }
    ];
  }
};

export default nextConfig;

