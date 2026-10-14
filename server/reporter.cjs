const { createRequire } = require('node:module');
const { emit, cleanError } = require('./telemetry.cjs');

module.exports = class PulseReporter {
  constructor(runner, options = {}) {
    const pulse = options.reporterOptions || {};
    const reporter = pulse.pulseOriginalReporter || 'spec';
    let Original;
    const mocha = require('mocha');
    Original = mocha.reporters[reporter] || mocha.reporters[reporter[0].toUpperCase() + reporter.slice(1)];
    if (!Original) {
      const projectRequire = createRequire(pulse.pulseOriginalConfig);
      const loaded = projectRequire(reporter);
      Original = loaded.default || loaded;
    }
    this.original = new Original(runner, { ...options, reporterOptions: pulse.pulseOriginalOptions || {} });
    if (typeof this.original.done === 'function') this.done = this.original.done.bind(this.original);
    let file = '';
    let ordinal = 0;
    let active;
    const ids = new WeakMap();
    const identify = test => {
      if (!ids.has(test)) ids.set(test, String(++ordinal));
      const titlePath = typeof test.titlePath === 'function' ? test.titlePath() : [test.title];
      return { id: `${file}:${ids.get(test)}`, file, title: test.title, titlePath, retry: typeof test.currentRetry === 'function' ? test.currentRetry() : 0, duration: test.duration || 0 };
    };
    runner.on('suite', suite => { if (suite.root || suite.file) { if (suite.file) file = suite.file; } });
    runner.on('start', () => emit('reporter.begin', { total: runner.total }));
    runner.on('test', test => { if (!test.pending && test.state !== 'pending') { active = identify(test); emit('test.begin', active); } });
    runner.on('pass', test => emit('test.end', { ...identify(test), state: 'passed' }));
    runner.on('fail', (test, error) => emit('test.end', { ...identify(test), state: 'failed', error: cleanError(error), hook: test.type === 'hook' }));
    runner.on('pending', test => emit('test.end', { ...identify(test), state: 'pending' }));
    // Cypress sends a serialized retry payload without its parent suite/runnable methods.
    runner.on('retry', (_test, error) => { if (active) emit('test.retry', { ...active, error: cleanError(error) }); });
    runner.on('end', () => emit('reporter.end', { file }));
  }
};
