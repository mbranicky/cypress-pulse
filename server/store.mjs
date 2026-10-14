import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, isAbsolute } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { stateRoot } from './environment.mjs';

const MAX_FILE_BYTES = 32 * 1024 * 1024;
export function inside(root, path) { const delta = relative(root, path); return delta === '' || (!isAbsolute(delta) && delta !== '..' && !delta.startsWith('../') && !delta.startsWith('..\\')); }
async function json(file) { try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; } }
export async function processMatches(pid, startedAt) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); } catch (error) { return error.code === 'EPERM'; }
  if (process.platform === 'win32') return null;
  try {
    const { stdout } = await promisify(execFile)('ps', ['-o', 'lstart=', '-p', String(pid)], { timeout: 2000 });
    const time = Date.parse(stdout.trim());
    return Number.isFinite(time) ? time <= Date.parse(startedAt) : null;
  } catch { return null; }
}
function titleKey(file, titlePath) { return `${file}\0${JSON.stringify(titlePath)}`; }
export function reduceRun(manifest, records, exit, alive = true) {
  const run = { ...manifest, source: 'batch', status: 'starting', browser: '', totalSpecs: null, completedSpecs: 0, totalTests: null, passed: 0, failed: 0, pending: 0, skipped: 0, retries: 0, activeSpec: '', tests: [], artifacts: [], errors: [], updatedAt: manifest.startedAt };
  const tests = new Map();
  const doneSpecs = new Set();
  const totals = new Map();
  let currentFile = '';
  for (const record of records) {
    const data = record.data || {};
    run.updatedAt = record.at || run.updatedAt;
    if (record.kind === 'run.begin') { run.status = 'running'; run.browser = data.browser || ''; run.totalSpecs = data.specs?.length || null; run.testingType = data.testingType || 'e2e'; }
    if (record.kind === 'spec.begin') { currentFile = data.file; run.activeSpec = data.file; run.status = 'running'; }
    if (record.kind === 'reporter.begin') totals.set(currentFile, data.total || 0);
    if (record.kind.startsWith('test.')) {
      const file = data.file || currentFile;
      const titlePath = data.titlePath?.length ? data.titlePath : [data.title || 'Unknown test'];
      const key = titleKey(file, titlePath);
      const prior = tests.get(key) || { id: key, file, title: data.title || titlePath.at(-1), titlePath, status: 'running', duration: 0, retry: 0, attachments: [] };
      if (record.kind === 'test.begin') { prior.status = 'running'; prior.startedAt = record.at; }
      if (record.kind === 'test.retry') { prior.status = 'running'; prior.retry = Math.max(prior.retry + 1, (data.retry || 0) + 1); }
      if (record.kind === 'test.end') { prior.status = data.state; prior.duration = data.duration || 0; prior.retry = Math.max(prior.retry, data.retry || 0); prior.error = data.error || undefined; }
      tests.set(key, prior);
    }
    if (record.kind === 'spec.end') {
      doneSpecs.add(data.file);
      if (run.activeSpec === data.file) run.activeSpec = '';
      const occurrence = new Map();
      for (const [index, test] of (data.tests || []).entries()) {
        const base = titleKey(data.file, test.titlePath);
        const count = occurrence.get(base) || 0;
        occurrence.set(base, count + 1);
        const key = count ? `${base}\0${count}` : base;
        const entry = tests.get(key) || { id: key, file: data.file, titlePath: test.titlePath, title: test.titlePath.at(-1), attachments: [] };
        const attempts = test.attempts || [];
        const last = attempts.at(-1);
        Object.assign(entry, { status: test.state, duration: test.duration ?? entry.duration ?? 0, retry: Math.max(0, attempts.length - 1), error: test.error || entry.error || undefined, attachments: [] });
        tests.set(key, entry);
      }
      if (data.error) run.errors.push(String(data.error));
      run.artifacts.push(...(data.screenshots || []).map(path => ({file: data.file, kind: 'screenshot', path})));
      if (data.video) run.artifacts.push({file: data.file, kind: 'video', path: data.video});
    }
    if (record.kind === 'run.end') {
      run.status = data.failed > 0 ? 'failed' : data.passed > 0 ? 'passed' : 'empty';
      run.totalTests = data.totalTests ?? null;
      run.endedAt = record.at;
      run.finalCounts = { passed: data.passed || 0, failed: data.failed || 0, pending: data.pending || 0, skipped: data.skipped || 0 };
    }
  }
  run.tests = [...tests.values()];
  run.completedSpecs = doneSpecs.size;
  for (const test of run.tests) {
    if (['passed', 'failed', 'pending', 'skipped'].includes(test.status)) run[test.status]++;
    if (test.retry > 0) run.retries++;
  }
  if (run.finalCounts) Object.assign(run, run.finalCounts);
  delete run.finalCounts;
  if (exit) {
    run.endedAt = exit.endedAt;
    run.exitCode = exit.code;
    if (exit.error) run.errors.push(exit.error);
    if (exit.signal) run.status = 'interrupted';
    else if (exit.code !== 0) run.status = run.failed > 0 ? 'failed' : 'error';
    else if (!run.endedAt || ['starting', 'running'].includes(run.status)) { run.status = run.tests.length ? 'passed' : 'empty'; }
  } else if (alive === false && ['starting', 'running'].includes(run.status)) { run.status = 'interrupted'; run.endedAt = run.updatedAt; }
  if (!['starting', 'running'].includes(run.status)) for (const test of run.tests) if (test.status === 'running') test.status = 'interrupted';
  return run;
}
export async function readBatchRun(directory) {
  const manifest = await json(join(directory, 'manifest.json'));
  if (!manifest || manifest.v !== 1 || typeof manifest.id !== 'string' || typeof manifest.projectRoot !== 'string') return null;
  const records = [];
  const warnings = [];
  for (const name of (await readdir(directory)).filter(name => /^events-\d+\.jsonl$/.test(name))) {
    const file = join(directory, name);
    if ((await stat(file)).size > MAX_FILE_BYTES) { warnings.push('Telemetry exceeded the current size limit. Live details are incomplete.'); continue; }
    const content = await readFile(file, 'utf8');
    // Ignore only the final incomplete append; complete malformed records are reported.
    for (const line of content.split('\n').slice(0, -1)) {
      try { const record = JSON.parse(line); if (record.v === 1 && typeof record.kind === 'string' && typeof record.at === 'string') records.push(record); }
      catch { warnings.push('A telemetry record could not be read.'); }
    }
  }
  records.sort((a, b) => a.at.localeCompare(b.at) || a.producer - b.producer || a.seq - b.seq);
  const exit = await json(join(directory, 'exit.json'));
  const alive = exit ? false : await processMatches(manifest.ownerPid, manifest.startedAt);
  const run = reduceRun(manifest, records, exit, alive);
  run.errors.push(...new Set(warnings));
  return run;
}
export async function listBatchRuns(root = stateRoot(), workspaceDirectory) {
  const folder = join(root, 'runs');
  const entries = await readdir(folder).catch(() => []);
  const directories = await Promise.all(entries.filter(name => /^[a-zA-Z0-9-]+$/.test(name)).map(async name => ({ name, time: (await stat(join(folder, name)).catch(() => ({ mtimeMs: 0 }))).mtimeMs })));
  const runs = await Promise.all(directories.sort((a, b) => b.time - a.time).slice(0, 100).map(entry => readBatchRun(join(folder, entry.name)).catch(() => null)));
  return runs.filter(run => run && (!workspaceDirectory || inside(workspaceDirectory, run.projectRoot))).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
