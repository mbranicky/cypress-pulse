import type { PluginServerContext } from '@getpaseo/plugin/server';
import { dashboard, briefs, interactiveReport, screenshot } from './shared/rpc';
import { workspaceDirectory, collect, trimRuns, report, preview, cleanup } from './server/handlers';
import { installHelper } from './server/runtime';

export default function contribute(server: PluginServerContext) {
  let helper: string | null = null;
  let helperError: string | null = null;
  void installHelper().then(path => { helper = path; }).catch(error => { helperError = error.message; console.error('Cypress Pulse helper:', error.message); });
  server.handle(dashboard, async (input, { paseo }) => {
    const directory = await workspaceDirectory(paseo, input.workspaceId);
    const { runs, notices } = await collect(directory);
    const selectedId = runs.find(run => run.id === input.runId)?.id || runs[0]?.id || null;
    return { runs: trimRuns(runs, selectedId), selectedId, notices: [...notices, ...(helperError ? [helperError] : [])], helper };
  });
  server.handle(briefs, async (input, { paseo }) => {
    const workspaces: Record<string, {status: string; running: number; failed: number; passed: number; completed: number; total: number | null; label: string}> = {};
    for (const id of input.workspaceIds) {
      try {
        const { runs } = await collect(await workspaceDirectory(paseo, id));
        const active = runs.filter(run => ['running', 'starting'].includes(run.status));
        const run = active[0] || runs.find(run => run.endedAt && Date.now() - Date.parse(run.endedAt) < 120_000);
        if (!run) continue;
        const completed = run.passed + run.failed + run.pending + run.skipped;
        const label = active.length > 1 ? `Cypress · ${active.length} runs` : active.length ? `Cypress · ${completed}${run.totalTests === null ? '' : `/${run.totalTests}`}${run.failed ? ` · ${run.failed} failed` : ''}` : `Cypress · ${run.status}`;
        workspaces[id] = { status: run.status, running: active.length, failed: run.failed, passed: run.passed, completed, total: run.totalTests, label };
      } catch { /* A workspace can disappear while the client polls. */ }
    }
    return { workspaces };
  });
  server.handle(interactiveReport, async (input, { paseo }) => report(await workspaceDirectory(paseo, input.workspaceId), input.runId, input.testId));
  server.handle(screenshot, async (input, { paseo }) => preview(await workspaceDirectory(paseo, input.workspaceId), input));
  return cleanup;
}
