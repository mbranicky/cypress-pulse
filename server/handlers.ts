import type { PaseoApi } from '@getpaseo/client';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { canonical } from './environment.mjs';
import { inside, listBatchRuns } from './store.mjs';
import { TapCollector, flattenReport } from './tap.mjs';
import { runSchema, type PulseRun } from '../shared/rpc';

const tap = new TapCollector();
const cache = new Map<string, { at: number; runs: PulseRun[]; notices: string[] }>();
const inflight = new Map<string, Promise<{runs: PulseRun[]; notices: string[]}>>();
export async function workspaceDirectory(paseo: PaseoApi, id: string) {
  const workspace = await paseo.workspaces.ref(id).refresh();
  if (!workspace) throw new Error('This workspace is unavailable.');
  return canonical(workspace.workspaceDirectory || workspace.projectRootPath);
}
export async function collect(directory: string) {
  const cached = cache.get(directory);
  if (cached && Date.now() - cached.at < 1500) return cached;
  if (inflight.has(directory)) return inflight.get(directory)!;
  const promise = (async () => {
    const batch = await listBatchRuns(undefined, directory);
    const interactive = await tap.collect(directory, batch[0]?.projectRoot || directory);
    const notices = interactive.notice ? [interactive.notice] : [];
    const runs: PulseRun[] = [];
    for (const value of [...batch, ...interactive.runs]) {
      const parsed = runSchema.safeParse(value);
      if (parsed.success) runs.push(parsed.data);
      else notices.push('A run contains unsupported telemetry and was omitted.');
    }
    runs.sort((a, b) => Number(['starting', 'running'].includes(b.status)) - Number(['starting', 'running'].includes(a.status)) || (b.startedAt || '').localeCompare(a.startedAt || ''));
    cache.set(directory, { at: Date.now(), runs, notices });
    return { runs, notices };
  })().finally(() => inflight.delete(directory));
  inflight.set(directory, promise);
  return promise;
}
export function trimRuns(runs: PulseRun[], selectedId: string | null): PulseRun[] {
  return runs.slice(0, 30).map(run => {
    const tests = run.id === selectedId ? [...run.tests].sort((a, b) => Number(b.status === 'failed') - Number(a.status === 'failed')).slice(0, 300) : [];
    return { ...run, tests, truncated: run.id === selectedId && run.tests.length > tests.length };
  });
}
export async function report(directory: string, runId: string, testId?: string) {
  const { runs } = await collect(directory);
  const run = runs.find(run => run.id === runId);
  if (!run || run.source !== 'interactive') throw new Error('That interactive run is unavailable.');
  if (testId && !run.tests.some(test => test.id === testId)) throw new Error('That test is not part of the selected run.');
  const data = await tap.report(run, testId);
  const text = testId ? `${data.test?.fullTitle || data.test?.title || 'Test'}\n\n${data.error?.message || 'No failure reported'}\n${data.error?.stack || ''}\n${data.error?.codeFrame?.frame || ''}` : `${data.spec || run.activeSpec}\n\nPassed: ${data.stats?.passed || 0} · Failed: ${data.stats?.failed || 0} · Pending: ${data.stats?.pending || 0} · Skipped: ${data.stats?.skipped || 0}\n\n${flattenReport(data, run.activeSpec).map(test => `${test.status.toUpperCase()}  ${test.titlePath.join(' › ')}  (${test.duration} ms)`).join('\n')}`;
  return { text: text.slice(0, 100_000) };
}
export async function preview(directory: string, input: {runId: string; testId: string; index: number}) {
  const { runs } = await collect(directory);
  const run = runs.find(run => run.id === input.runId);
  const attachment = input.testId === '__spec_artifact__' ? run?.artifacts[input.index] : run?.tests.find(test => test.id === input.testId)?.attachments[input.index];
  if (!run || !attachment || attachment.kind !== 'screenshot') throw new Error('That screenshot is unavailable.');
  const target = await realpath(attachment.path);
  if (!inside(await realpath(run.projectRoot), target)) throw new Error('Screenshots outside this Cypress project are not previewed.');
  if ((await stat(target)).size > 8 * 1024 * 1024) throw new Error('This screenshot is too large to preview.');
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }[extname(target).toLowerCase()];
  if (!mime) throw new Error('Unsupported screenshot format.');
  return { dataUri: `data:${mime};base64,${(await readFile(target)).toString('base64')}` };
}
export function cleanup() { cache.clear(); tap.clear(); }
