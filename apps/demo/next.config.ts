import type { NextConfig } from "next";

/** Where each demo moved when the routes were grouped by what they teach. */
const groupedRoutes = {
  "/controls": "/features/controls",
  "/fullscreen": "/recipes/fullscreen",
  "/lazy": "/recipes/lazy",
  "/ltr": "/features/ltr",
  "/progress": "/recipes/progress",
  "/slots": "/features/slots",
  "/spread-page": "/features/spread-page",
  "/spreads": "/features/spreads",
  "/zoom": "/features/zoom",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The flat paths were shared before the move, so they keep working.
  redirects: () =>
    Object.entries(groupedRoutes).map(([source, destination]) => ({
      destination,
      permanent: true,
      source,
    })),
};

export default nextConfig;
