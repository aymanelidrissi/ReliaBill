import type { NextConfig } from "next";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/rb/:path*", destination: "http://localhost:3333/:path*" },
    ];
  },
};

export default nextConfig;
