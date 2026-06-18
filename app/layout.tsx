import type { Metadata } from "next";
import "./globals.css";

// Initialize observability (Sentry + structured logger) on server start.
try {
  // Use require so we keep the lazy/CJS behavior of lib/sentry.js and avoid
  // top-level ESM/CJS interop issues.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const Sentry = require('../lib/sentry');
  // eslint-disable-next-line no-unused-expressions
  Sentry && Sentry.init && Sentry.init();
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const logger = require('../lib/logger');
  logger && logger.info && logger.info('Observability: init attempted from app/layout');
} catch (err) {
  // best-effort; do not fail app startup if observability wiring isn't available
  // eslint-disable-next-line no-console
  console.warn('Observability init skipped:', String(err));
}

export const metadata: Metadata = {
  title: "Hallenverwaltung St. Valentin",
  description: "Technisches Grundgerüst für die Hallenverwaltung St. Valentin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
