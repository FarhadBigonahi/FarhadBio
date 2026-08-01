/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // All raster imagery is self-hosted in /public/images. Allow modern formats.
    formats: ["image/avif", "image/webp"],
    // The source PNGs are very large (1200–1600px); these sizes cover our layout.
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1600, 1920],
    // Blog cover images uploaded through the admin are served by the backend
    // (api.farhad.bio in prod, localhost:3010 in dev) under /v1/uploads/*.
    remotePatterns: [
      { protocol: "https", hostname: "api.farhad.bio", pathname: "/v1/uploads/**" },
      { protocol: "http", hostname: "localhost", port: "3010", pathname: "/v1/uploads/**" },
    ],
  },
};

export default nextConfig;
