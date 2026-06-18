// Minimal alert bridge: sends email via Nodemailer if SMTP vars are configured.
// Falls nicht vorhanden, fällt es auf console.log zurück.

const pkg = (() => { try { return require('../package.json'); } catch (e) { return {}; } })();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? SMTP_USER : `no-reply@${process.env.npm_package_name || 'app'}.local`);
const ALERT_TO = process.env.OBSERVABILITY_ALERT_EMAILS || process.env.ALERT_EMAILS || '';

let transporter = null;
function initTransporter() {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_PORT) return null;
  try {
    // Lazy require so dependency is optional
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: String(SMTP_PORT) === '465',
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    return transporter;
  } catch (e) {
    console.warn('nodemailer not available or failed to init:', e && e.message ? e.message : e);
    return null;
  }
}

async function sendEmail({ to, subject, text, html }) {
  const t = initTransporter();
  const recipients = (to || ALERT_TO || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!recipients.length) {
    console.log('Alert recipients not configured, skipping email:', subject);
    return false;
  }
  if (!t) {
    console.log('SMTP not configured; alert (fallback):', { to: recipients, subject, text });
    return false;
  }
  try {
    await t.sendMail({ from: SMTP_FROM, to: recipients.join(','), subject, text, html });
    console.log('Alert email sent to', recipients.join(','));
    return true;
  } catch (err) {
    console.error('Failed to send alert email:', String(err));
    return false;
  }
}

async function sendAlert({ subject, text, to } = {}) {
  const msg = subject || `Alert from ${pkg.name || 'app'}`;
  const body = text || `Alert triggered at ${new Date().toISOString()}`;
  // Try Sentry message as well (best-effort)
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const Sentry = require('./sentry');
    Sentry && Sentry.captureMessage && Sentry.captureMessage(msg, 'error');
  } catch (e) {
    // ignore
  }
  return sendEmail({ to, subject: msg, text: body });
}

module.exports = { sendAlert, sendEmail };
