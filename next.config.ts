import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

const config: NextConfig =
  process.env.NODE_ENV === "development"
    ? nextConfig
    : withPWAInit({
        dest: "public",
        register: true,
        workboxOptions: {
          disableDevLogs: true,
        },
      })(nextConfig);

export default config;
