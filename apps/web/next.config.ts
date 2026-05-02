import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Next.js 16 expects turbopack at the top level and the root must be absolute.
    root: path.resolve(__dirname, "../..")
  }
};

export default nextConfig;

