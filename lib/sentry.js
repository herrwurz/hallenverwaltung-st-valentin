// Minimal, safe Sentry initializer with graceful fallback.
// Usage: const Sentry = require('../lib/sentry'); Sentry.captureException(err, { extra });

const pkg = (() => {
  try { return require('../package.json'); } catch (e) { return {}; }
})();

const SENTRY_DSN = process.env.SENTRY_DSN;
let client = null;
let enabled = false;

function init() {
  if (!SENTRY_DSN) return false;
  if (client) return true;
  try {
    // Lazy require so missing dep won't crash the app
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || pkg.version,
      serverName: process.env.SENTRY_SERVER_NAME || require('os').hostname(),
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.0),
    });
    client = Sentry;
    enabled = true;
    console.log('Sentry initialized (DSN present).');
    return true;
  } catch (e) {
    console.warn('Sentry not available or failed to initialize:', e.message || e);
    return false;
  }
}

function captureException(err, ctx) {
  if (!client) {
    // attempt init on first error
    init();
  }
  if (client) {
    try {
      client.withScope(scope => {
        if (ctx && ctx.user) scope.setUser(ctx.user);
        if (ctx && ctx.extra) scope.setExtras(ctx.extra);
        if (ctx && ctx.tags) scope.setTags(ctx.tags);
        client.captureException(err);
      });
    } catch (e) {
      // best effort
      console.error('Sentry capture failed:', e && e.message ? e.message : e);
    }
  } else {
    // fallback: log to console
    console.error('Error captured (no Sentry):', err && err.stack ? err.stack : err);
  }
}

function captureMessage(msg, level = 'info', ctx) {
  if (!client) init();
  if (client) {
    try {
      client.withScope(scope => {
        if (ctx && ctx.tags) scope.setTags(ctx.tags);
        client.captureMessage(msg, level);
      });
    } catch (e) {
      console.warn('Sentry message failed:', e && e.message ? e.message : e);
    }
  } else {
    console.log('Sentry message (fallback):', level, msg);
  }
}

module.exports = { init, captureException, captureMessage, enabled: () => enabled };
