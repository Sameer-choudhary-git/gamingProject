/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Force these packages to be server-only (avoids bundling their files)
  serverExternalPackages: ["pino", "thread-stream"],

  // 2. Explicitly ignore .md files in the build rules
  experimental: {
    turbo: {
      rules: {
        "*.md": {
          loaders: ["ignore-loader"], 
          as: "*.js",
        },
      },
    },
  },
};

export default nextConfig;