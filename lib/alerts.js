// Minimal alert bridge: sends email via Nodemailer if SMTP vars are configured.
// Falls nicht vorhanden, fällt es auf console.log zurück.

const pkg = (() => { try { return require('../package.json'); } catch (e) { return {}; } })();

const ALERT_TO = process.env.OBSERVABILITY_ALERT_EMAILS || process.env.ALERT_EMAILS || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM || `no-reply@${process.env.npm_package_name || 'app'}.local`;
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const POSTMARK_API_TOKEN = process.env.POSTMARK_API_TOKEN;
const OBSERVABILITY_WEBHOOK_URL = process.env.OBSERVABILITY_WEBHOOK_URL;

async function sendEmail({ to, subject, text, html }) {
  const recipients = (to || ALERT_TO || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!recipients.length) {
    console.log('Alert recipients not configured, skipping email:', subject);
    return false;
  }

  // 1) SendGrid HTTP API
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

  // 2) Mailgun HTTP API
  if (MAILGUN_API_KEY && MAILGUN_DOMAIN) {
    try {
      const params = new URLSearchParams();
      params.append('from', SENDGRID_FROM);
      recipients.forEach(r => params.append('to', r));
      params.append('subject', subject);
      params.append('text', text);
      const basic = Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64');
      await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      console.log('Alert email sent via Mailgun to', recipients.join(','));
      return true;
    } catch (err) {
      console.error('Failed to send alert via Mailgun:', String(err));
    }
  }

  // 3) Postmark HTTP API
  if (POSTMARK_API_TOKEN) {
    try {
      const payload = {
        From: SENDGRID_FROM,
        To: recipients.join(','),
        Subject: subject,
        TextBody: text,
      };
      await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: { 'X-Postmark-Server-Token': POSTMARK_API_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log('Alert email sent via Postmark to', recipients.join(','));
      return true;
    } catch (err) {
      console.error('Failed to send alert via Postmark:', String(err));
    }
  }

  // 4) Webhook fallback
  if (OBSERVABILITY_WEBHOOK_URL) {
    try {
      await fetch(OBSERVABILITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, text, to: recipients }),
      });
      console.log('Alert sent to webhook', OBSERVABILITY_WEBHOOK_URL);
      return true;
    } catch (err) {
      console.error('Failed to send alert to webhook:', String(err));
    }
  }

  // Final fallback: console
  console.log('No HTTP email provider configured; alert (fallback):', { to: recipients, subject, text });
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
