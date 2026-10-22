import type { NextConfig } from "next";

// STATIC_EXPORT=1 builds plain HTML/JS (for static hosts such as Cloudflare Pages).
// Without it, the same app runs on any Next.js host (for example Vercel).
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const, trailingSlash: true } : {}),
  images: { unoptimized: true },
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
