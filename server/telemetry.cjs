const { appendFileSync } = require('node:fs');
let sequence = 0;
exports.emit = function emit(kind, data = {}) {
  if (!process.env.CYPRESS_PULSE_RUN_DIR) return;
  try {
    const path = require('node:path').join(process.env.CYPRESS_PULSE_RUN_DIR, `events-${process.pid}.jsonl`);
    appendFileSync(path, JSON.stringify({ v: 1, kind, data, at: new Date().toISOString(), producer: process.pid, seq: ++sequence }) + '\n', { mode: 0o600 });
  } catch { /* Dashboard errors must not change the test outcome. */ }
};
exports.cleanError = error => error ? { message: String(error.message || error).slice(0, 8000), stack: String(error.stack || '').slice(0, 12000) } : undefined;
