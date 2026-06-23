// Minimal, safe Sentry initializer with graceful fallback.

const pkg = (() => {
  try { return require('../package.json'); } catch (e) { return {}; }
})();

const SENTRY_DSN = process.env.SENTRY_DSN;
let client = null;
let enabled = false;

function optionalRequire(moduleName) {
  try {
    const runtimeRequire = eval('require');
    return runtimeRequire(moduleName);
  } catch (e) {
    return null;
  }
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : error;
}

function init() {
  if (!SENTRY_DSN) return false;
  if (client) return true;
  try {
    const Sentry = optionalRequire('@sentry/node');
    if (!Sentry) return false;
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || pkg.version,
      serverName: process.env.SENTRY_SERVER_NAME || require('os').hostname(),
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.0),
    });
    client = Sentry;
    enabled = true;
    console.log('Sentry initialized.');
    return true;
  } catch (e) {
    console.warn('Sentry not available or failed to initialize:', getErrorMessage(e));
    return false;
  }
}

function captureException(err, ctx) {
  if (!client) init();
  if (client) {
    try {
      client.withScope(scope => {
        if (ctx && ctx.user) scope.setUser(ctx.user);
        if (ctx && ctx.extra) scope.setExtras(ctx.extra);
        if (ctx && ctx.tags) scope.setTags(ctx.tags);
        client.captureException(err);
      });
    } catch (e) {
      console.error('Sentry capture failed:', getErrorMessage(e));
    }
  } else {
    console.error('Error captured without Sentry:', err && err.stack ? err.stack : err);
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
      console.warn('Sentry message failed:', getErrorMessage(e));
    }
  } else {
    console.log('Sentry message fallback:', level, msg);
  }
}

module.exports = { init, captureException, captureMessage, enabled: () => enabled };
