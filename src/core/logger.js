/**
 * Tiny structured logger. Keeps a ring buffer so the admin dashboard can show
 * server logs without tailing a file.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;
const RING_SIZE = 300;
const ring = [];
const listeners = new Set();

function write(level, scope, message, meta) {
  const entry = { ts: new Date().toISOString(), level, scope, message: String(message) };
  if (meta !== undefined) entry.meta = meta;
  ring.push(entry);
  if (ring.length > RING_SIZE) ring.shift();
  for (const fn of listeners) {
    try {
      fn(entry);
    } catch (_) {}
  }
  if (LEVELS[level] < minLevel || process.env.LOG_SILENT === '1') return;
  const line = `[${entry.ts.slice(11, 19)}] ${level.toUpperCase().padEnd(5)} ${scope ? `(${scope}) ` : ''}${entry.message}`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  meta !== undefined ? out(line, meta) : out(line);
}

function child(scope) {
  return {
    debug: (m, meta) => write('debug', scope, m, meta),
    info: (m, meta) => write('info', scope, m, meta),
    warn: (m, meta) => write('warn', scope, m, meta),
    error: (m, meta) => write('error', scope, m, meta)
  };
}

module.exports = {
  child,
  ...child(''),
  recent: (limit = 100) => ring.slice(-limit),
  subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};
