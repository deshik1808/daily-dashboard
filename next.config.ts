import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components lets a route ship a static shell containing real, cached
  // data while request-time bits (the Editor session) stream in behind their
  // own Suspense boundaries. Without it every route here was `ƒ (Dynamic)` —
  // fully re-rendered on every visit, which is why revisiting a page cost the
  // same as seeing it the first time.
  cacheComponents: true,

  // Each visible <Link> prefetches the destination's App Shell, so the next
  // page has already started loading by the time it's tapped.
  partialPrefetching: true,
};

const config: NextConfig =
  process.env.NODE_ENV === "development"
    ? nextConfig
    : withPWAInit({
        dest: "public",
        register: true,
        // Merge our push-event handler into the workbox-generated SW.
        customWorkerSrc: "public/sw-custom.js",
        workboxOptions: {
          disableDevLogs: true,
        },
      })(nextConfig);

export default config;
