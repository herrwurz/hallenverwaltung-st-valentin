// Initialize observability (Sentry + structured logger) once on server start.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const sentry = await import("@/lib/sentry");
    const logger = await import("@/lib/logger");
    const sentryEnabled = sentry.init();
    logger.info("Observability initialized", { sentryEnabled });
  }
}
