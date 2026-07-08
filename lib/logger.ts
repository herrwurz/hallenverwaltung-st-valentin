// Simple structured JSON logger wrapper. Avoids external deps; can be swapped for pino/winston later.
const serviceName = process.env.npm_package_name || "hallenverwaltung";

type LogMeta = Record<string, unknown>;

function format(level: string, msg: string, meta?: LogMeta) {
  const out: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    service: serviceName,
    pid: process.pid,
    msg,
  };
  if (meta) out.meta = meta;
  return JSON.stringify(out);
}

export function info(msg: string, meta?: LogMeta) {
  console.log(format("info", msg, meta));
}

export function warn(msg: string, meta?: LogMeta) {
  console.warn(format("warn", msg, meta));
}

export function error(msg: string, meta?: LogMeta) {
  console.error(format("error", msg, meta));
}

export function debug(msg: string, meta?: LogMeta) {
  console.log(format("debug", msg, meta));
}
