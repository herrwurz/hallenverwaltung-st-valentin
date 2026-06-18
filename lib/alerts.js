// Minimal alert bridge: sends email via Nodemailer if SMTP vars are configured.
// Falls nicht vorhanden, fällt es auf console.log zurück.

const pkg = (() => { try { return require('../package.json'); } catch (e) { return {}; } })();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? SMTP_USER : `no-reply@${process.env.npm_package_name || 'app'}.local`);
const ALERT_TO = process.env.OBSERVABILITY_ALERT_EMAILS || process.env.ALERT_EMAILS || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM || SMTP_FROM;

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
  const recipients = (to || ALERT_TO || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!recipients.length) {
    console.log('Alert recipients not configured, skipping email:', subject);
    return false;
  }

  // 1) SMTP via nodemailer (if available and configured)
  const t = initTransporter();
  if (t) {
    try {
      await t.sendMail({ from: SMTP_FROM, to: recipients.join(','), subject, text, html });
      console.log('Alert email sent via SMTP to', recipients.join(','));
      return true;
    } catch (err) {
      console.error('Failed to send alert email via SMTP:', String(err));
      // fall through to try HTTP providers
    }
  }

  // 2) SendGrid HTTP API (no extra package required)
  if (SENDGRID_API_KEY) {
    try {
      const payload = {
        personalizations: [
          { to: recipients.map(r => ({ email: r })) },
        ],
        from: { email: SENDGRID_FROM },
        subject,
        content: [{ type: 'text/plain', value: text }],
      };
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('Alert email sent via SendGrid to', recipients.join(','));
      return true;
    } catch (err) {
      console.error('Failed to send alert via SendGrid:', String(err));
      // fall through
    }
  }

  // 3) Fallback: log to console
  console.log('No email transport available; alert (fallback):', { to: recipients, subject, text });
  return false;
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
