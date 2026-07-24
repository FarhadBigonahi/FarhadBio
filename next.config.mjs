/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // All raster imagery is self-hosted in /public/images. Allow modern formats.
    formats: ["image/avif", "image/webp"],
    // The source PNGs are very large (1200–1600px); these sizes cover our layout.
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1600, 1920],
  },
};

export default nextConfig;
