import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack: (config) => {
    // lib/sentry.ts lädt @sentry/node bewusst erst zur Laufzeit (optionale
    // Abhängigkeit); Webpack kann das createRequire-Argument nicht statisch
    // auswerten und meldet sonst eine erwartbare Warnung.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /lib[\\/]sentry\.ts/, message: /createRequire/ },
    ];
    return config;
  },
};

export default nextConfig;
