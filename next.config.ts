import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { oldFileRewrites, oldPageRedirects } from "./lib/old-site";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Gallery originals are large scans/photos; these widths keep the
    // lightbox sharp on retina without shipping the full 2–4 MP file.
    deviceSizes: [420, 640, 828, 1080, 1440, 1920, 2560],
    formats: ["image/avif", "image/webp"],
  },

  // The old site's addresses (see lib/old-site.ts).
  async redirects() {
    return oldPageRedirects();
  },
  async rewrites() {
    return { beforeFiles: [], afterFiles: oldFileRewrites(), fallback: [] };
  },

  allowedDevOrigins: ["192.168.1.161", "172.20.10.5", "192.168.100.59,", "192.168.3.215", "192.168.100.59", "192.168.1.57", "192.168.1.164"],
};

export default withNextIntl(nextConfig);
