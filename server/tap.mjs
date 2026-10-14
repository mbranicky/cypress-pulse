import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { canonical, resolveCypress } from './environment.mjs';
import { inside } from './store.mjs';
const exec = promisify(execFile);

export function parseTap(stdout) {
  if (/No running Cypress session found/.test(stdout)) return [];
  try { return JSON.parse(stdout); } catch { throw new Error('Cypress Tap returned an unsupported response. Check CLI/session compatibility.'); }
}
export async function callTap(cli, project, args) {
  const { stdout } = await exec(process.execPath, [cli, 'tap', ...args, '--json', '--timeout', '4000'], { cwd: project, timeout: 6000, maxBuffer: 1024 * 1024 });
  return parseTap(stdout);
}
export function tapRun(status) {
  if (!status || typeof status.status !== 'string' || !Number.isInteger(status.pid) || typeof status.projectRoot !== 'string') throw new Error('Cypress Tap status is missing required fields.');
  const stage = { loading: 'starting', running: 'running', passed: 'passed', failed: 'failed', 'spec not selected': 'idle', 'browser not selected': 'idle', 'not connected': 'disconnected' }[status.status];
  if (!stage) throw new Error(`Unsupported Cypress Tap stage: ${status.status}`);
  const results = status.results || {};
  const terminal = ['passed', 'failed'].includes(stage);
  const error = status.error ? (typeof status.error === 'string' ? status.error : status.error.message || JSON.stringify(status.error)) : null;
  return { v: 1, id: `tap-${status.pid}-${status.spec || 'none'}-${status.startedAt || 'idle'}`, source: 'interactive', mode: 'interactive', projectRoot: status.projectRoot, workspaceRoot: status.projectRoot, status: stage === 'passed' && !results.passed ? 'empty' : stage, startedAt: status.startedAt || null, updatedAt: new Date().toISOString(), sessionPid: status.pid, browser: status.browserName || '', testingType: status.testingType || 'e2e', activeSpec: status.spec || '', totalTests: status.totalTests ?? null, totalSpecs: null, completedSpecs: terminal ? 1 : 0, passed: results.passed || 0, failed: results.failed || 0, pending: terminal ? results.pending || 0 : 0, skipped: terminal ? results.skipped || 0 : 0, retries: 0, tests: [], errors: error ? [String(error).slice(0, 12000)] : [] };
}
export function flattenReport(overview, file) {
  const output = [];
  const visit = (suite, parent = []) => {
    const titlePath = suite.title ? [...parent, suite.title] : parent;
    for (const test of suite.tests || []) output.push({ id: test.id, file, title: test.title, titlePath: [...titlePath, test.title], status: test.state, duration: test.duration || 0, retry: test.retries || 0, attachments: [] });
    for (const child of suite.suites || []) visit(child, titlePath);
  };
  visit(overview);
  return output;
}
export class TapCollector {
  constructor({ resolve = resolveCypress, call = callTap } = {}) { this.resolve = resolve; this.call = call; this.cache = new Map(); this.inflight = new Map(); this.details = new Map(); }
  async collect(directory, projectHint = directory) {
    const key = `${directory}\0${projectHint}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < 2000) return cached.value;
    if (this.inflight.has(key)) return this.inflight.get(key);
    const promise = this.load(directory, projectHint).then(value => { this.cache.set(key, { at: Date.now(), value }); return value; }).finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }
  async load(directory, projectHint) {
    let cypress;
    try { cypress = this.resolve(projectHint); } catch { return { runs: [], notice: 'No compatible Cypress installation found for interactive discovery.' }; }
    try {
      const sessions = await this.call(cypress.cli, projectHint, ['sessions']);
      if (!Array.isArray(sessions)) throw new Error('Cypress Tap session discovery did not return a list.');
      const matching = sessions.filter(session => typeof session.projectRoot === 'string' && inside(directory, session.projectRoot)).slice(0, 12);
      const runs = [];
      const errors = [];
      for (const session of matching) {
        try {
          if (!Number.isInteger(session.pid)) throw new Error('Invalid session process ID.');
          const local = this.resolve(session.projectRoot);
          const status = await this.call(local.cli, session.projectRoot, ['status', '--session', String(session.pid)]);
          const run = { ...tapRun(status), cypressVersion: local.version, projectRoot: canonical(status.projectRoot) };
          if (['passed', 'failed'].includes(status.status) && run.startedAt && !status.error) {
            let details = this.details.get(run.id);
            if (!details) {
              const overview = await this.report(run);
              const tests = flattenReport(overview, run.activeSpec);
              const failures = tests.filter(test => test.status === 'failed');
              for (const test of failures.slice(0, 5)) {
                const result = await this.call(local.cli, run.projectRoot, ['reporter', '--session', String(run.sessionPid), '--test-id', test.id]);
                if (result.error) test.error = {message: String(result.error.message || 'Test failed').slice(0, 8000), stack: String(result.error.stack || '').slice(0, 12000)};
              }
              const confirm = await this.call(local.cli, run.projectRoot, ['status', '--session', String(run.sessionPid)]);
              if (tapRun(confirm).id !== run.id) throw new Error('A new interactive run started while collecting failure details.');
              details = { tests, endedAt: new Date(Date.parse(run.startedAt) + (overview.stats?.duration || 0)).toISOString(), retries: tests.filter(test => test.retry > 0).length };
              if (this.details.size >= 100) this.details.delete(this.details.keys().next().value);
              this.details.set(run.id, details);
            }
            Object.assign(run, details);
          }
          runs.push(run);
        } catch (error) { errors.push(`Session ${session.pid}: ${error.message}`); }
      }
      return { runs, notice: errors.join('\n') || null };
    } catch (error) { return { runs: [], notice: `Interactive monitoring unavailable: ${error.message}` }; }
  }
  async report(run, testId) {
    const local = this.resolve(run.projectRoot);
    const status = await this.call(local.cli, run.projectRoot, ['status', '--session', String(run.sessionPid)]);
    if (tapRun(status).id !== run.id) throw new Error('The interactive session has moved to a newer run. Refresh before reading results.');
    if (!['passed', 'failed'].includes(status.status)) throw new Error('Wait for the interactive spec to finish before reading its report.');
    const report = await this.call(local.cli, run.projectRoot, ['reporter', '--session', String(run.sessionPid), ...(testId ? ['--test-id', testId] : [])]);
    const confirm = await this.call(local.cli, run.projectRoot, ['status', '--session', String(run.sessionPid)]);
    if (tapRun(confirm).id !== run.id) throw new Error('A rerun started while the report was being read. Refresh and try again.');
    return report;
  }
  clear() { this.cache.clear(); this.details.clear(); }
}
