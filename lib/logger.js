// Simple structured JSON logger wrapper. Avoids external deps; can be swapped for pino/winston later.
const serviceName = process.env.npm_package_name || 'hallenverwaltung';
function format(level, msg, meta) {
  const out = {
    timestamp: new Date().toISOString(),
    level,
    service: serviceName,
    pid: process.pid,
    msg,
  };
  if (meta) out.meta = meta;
  return JSON.stringify(out);
}

function info(msg, meta) { console.log(format('info', msg, meta)); }
function warn(msg, meta) { console.warn(format('warn', msg, meta)); }
function error(msg, meta) { console.error(format('error', msg, meta)); }
function debug(msg, meta) { console.log(format('debug', msg, meta)); }

module.exports = { info, warn, error, debug };
