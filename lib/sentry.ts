// Minimal, safe Sentry initializer with graceful fallback.
// @sentry/node is an optional dependency: if it is not installed or SENTRY_DSN
// is unset, all functions degrade to console logging.
import { createRequire } from "node:module";
import os from "node:os";
import pkg from "../package.json";

type SentryScope = {
  setUser(user: Record<string, unknown>): void;
  setExtras(extras: Record<string, unknown>): void;
  setTags(tags: Record<string, string>): void;
};

type SentryClient = {
  init(options: Record<string, unknown>): void;
  withScope(callback: (scope: SentryScope) => void): void;
  captureException(error: unknown): void;
  captureMessage(message: string, level?: string): void;
};

export type CaptureContext = {
  user?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
};

const SENTRY_DSN = process.env.SENTRY_DSN;
let client: SentryClient | null = null;
let initialized = false;

function optionalRequire(moduleName: string): SentryClient | null {
  try {
    // createRequire keeps the lookup at runtime so bundlers do not try to
    // resolve the optional dependency at build time.
    const runtimeRequire = createRequire(process.cwd() + "/");
    return runtimeRequire(moduleName) as SentryClient;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function init(): boolean {
  if (!SENTRY_DSN) return false;
  if (client) return true;
  try {
    const Sentry = optionalRequire("@sentry/node");
    if (!Sentry) return false;
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
      release: process.env.SENTRY_RELEASE || pkg.version,
      serverName: process.env.SENTRY_SERVER_NAME || os.hostname(),
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.0),
    });
    client = Sentry;
    initialized = true;
    console.log("Sentry initialized.");
    return true;
  } catch (error) {
    console.warn("Sentry not available or failed to initialize:", getErrorMessage(error));
    return false;
  }
}

export function captureException(err: unknown, ctx?: CaptureContext) {
  if (!client) init();
  if (client) {
    try {
      client.withScope((scope) => {
        if (ctx?.user) scope.setUser(ctx.user);
        if (ctx?.extra) scope.setExtras(ctx.extra);
        if (ctx?.tags) scope.setTags(ctx.tags);
        client!.captureException(err);
      });
    } catch (error) {
      console.error("Sentry capture failed:", getErrorMessage(error));
    }
  } else {
    console.error("Error captured without Sentry:", err instanceof Error ? err.stack : err);
  }
}

export function captureMessage(msg: string, level: string = "info", ctx?: CaptureContext) {
  if (!client) init();
  if (client) {
    try {
      client.withScope((scope) => {
        if (ctx?.tags) scope.setTags(ctx.tags);
        client!.captureMessage(msg, level);
      });
    } catch (error) {
      console.warn("Sentry message failed:", getErrorMessage(error));
    }
  } else {
    console.log("Sentry message fallback:", level, msg);
  }
}

export function enabled() {
  return initialized;
}
