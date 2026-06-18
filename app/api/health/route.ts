import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams;

    // try to read package version
    let version = '0.0.0';
    try {
      // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
      // @ts-ignore
      version = require('../../../package.json').version || version;
    } catch (e) {
      // ignore
    }

    if (params.get('alert') === 'true') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
        // @ts-ignore
        const alerts = require('../../../lib/alerts');
        await alerts.sendAlert({ subject: `Healthcheck alert (v${version})`, text: `Test alert from /api/health at ${new Date().toISOString()}` });
        return NextResponse.json({ status: 'alert_sent' });
      } catch (e) {
        return NextResponse.json({ status: 'alert_failed', error: String(e) }, { status: 500 });
      }
    }

    return NextResponse.json({ status: 'ok', version, time: new Date().toISOString() });
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    try {
      // @ts-ignore
      const Sentry = require('../../../lib/sentry');
      Sentry && Sentry.captureException && Sentry.captureException(err, { extra: { route: '/api/health' } });
    } catch (e) {
      // ignore
    }
    return NextResponse.json({ status: 'error', error: String(err) }, { status: 500 });
  }
}
