import path from "path";
import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.INTERNAL_API_URL || "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000",
        pathname: "/uploads/**",
      },
      ...(process.env.AWS_S3_BUCKET
        ? [
            {
              protocol: "https" as const,
              hostname: `${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || "ap-southeast-3"}.amazonaws.com`,
              pathname: "/**",
            },
          ]
        : []),
    ],
  },
  outputFileTracingRoot: path.join(__dirname, ".."),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
