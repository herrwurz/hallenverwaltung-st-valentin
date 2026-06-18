#!/usr/bin/env node
// Lightweight healthcheck runner. Call this from cron or a supervisor.
// Usage: HEALTHCHECK_URL=http://localhost:3000/api/health node scripts/health-check.js

const HEALTHCHECK_URL = process.env.HEALTHCHECK_URL || 'http://localhost:3000/api/health';
const TIMEOUT = Number(process.env.HEALTHCHECK_TIMEOUT || 5000);

async function main() {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(HEALTHCHECK_URL, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) {
      console.error(`Healthcheck failed: HTTP ${res.status}`);
      await triggerAlert(`Healthcheck failed: HTTP ${res.status}`);
      process.exit(2);
    }
    const body = await res.json().catch(() => null);
    if (!body || body.status !== 'ok') {
      console.error('Healthcheck returned non-ok:', body);
      await triggerAlert(`Healthcheck returned non-ok: ${JSON.stringify(body)}`);
      process.exit(3);
    }
    console.log('Healthcheck OK', body);
    process.exit(0);
  } catch (err) {
    clearTimeout(id);
    console.error('Healthcheck error:', String(err));
    await triggerAlert(`Healthcheck error: ${String(err)}`);
    process.exit(4);
  }
}

async function triggerAlert(text) {
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const alerts = require('../lib/alerts');
    await alerts.sendAlert({ subject: 'Healthcheck alert', text });
  } catch (e) {
    console.log('Alerts bridge not available or failed; fallback log:', String(e));
  }
}

if (require.main === module) {
  main();
}
