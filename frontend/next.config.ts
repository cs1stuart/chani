import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  rewrites: async () => [
    { source: "/api/:path*", destination: "http://localhost:3002/api/:path*" },
    { source: "/uploads/:path*", destination: "http://localhost:3002/uploads/:path*" },
    { source: "/socket.io", destination: "http://localhost:3002/socket.io" },
    { source: "/socket.io/:path*", destination: "http://localhost:3002/socket.io/:path*" },
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: "buffer/",
      };
    }
    return config;
  },
};

export default nextConfig;
