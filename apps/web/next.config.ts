import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@addisgo/types", "@addisgo/ui"],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
