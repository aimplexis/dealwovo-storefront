import type { NextConfig } from "next";
const config: NextConfig = {
  reactStrictMode: true,
  // Prelaunch release hold: cover non-HTML responses as well as page metadata.
  // Remove only in a separately reviewed production release; keep preview protection.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
  },
};
export default config;
