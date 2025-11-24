import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";
import { createMDX } from "fumadocs-mdx/next";

// Import env here to validate during build
const jiti = createJiti(fileURLToPath(import.meta.url));
await jiti.import("./src/env");

const withMDX = createMDX({
  mdxOptions: {
    rehypeCodeOptions: {
      // Used in other places!
      themes: {
        light: "light-plus",
        dark: "dark-plus",
      },
    },
  },
});

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/local-first",
        destination: "/blog/local-first",
        permanent: true, // 301 redirect
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/docs/:path*.mdx",
        destination: "/llms.mdx/:path*",
      },
    ];
  },
};

export default withMDX(config);
