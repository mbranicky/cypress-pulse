import { readTestSource } from "./test-source.mjs";
import { findPluginDirectory } from "./runtime";
import { describeTest, commandLog } from "./test-details.mjs";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { readMedia } from "./media.mjs";
import { canonical } from "./environment.mjs";
import { listBatchRuns } from "./store.mjs";
import { TapCollector, flattenReport } from "./tap.mjs";
import { runSchema, type PulseRun } from "../shared/rpc";

import { matchesTest } from "../shared/search.mjs";
import { specKey } from "../shared/specs.mjs";
import { summarizeSpecs } from "../shared/specs.mjs";
import { readSpecSource } from "./source.mjs";

const tap = new TapCollector();
const cache = new Map<
  string,
  { at: number; runs: PulseRun[]; notices: string[] }
>();
const inflight = new Map<
  string,
  Promise<{ runs: PulseRun[]; notices: string[] }>
>();
export async function workspaceDirectory(paseo: PluginHandlerContext["paseo"], id: string) {
  const workspace = await paseo.workspaces.ref(id).refresh();
  if (!workspace) throw new Error("This workspace is unavailable.");
  return canonical(workspace.workspaceDirectory || workspace.projectRootPath);
}
export async function collect(directory: string) {
  const cached = cache.get(directory);
  if (cached && Date.now() - cached.at < 1500) return cached;
  if (inflight.has(directory)) return inflight.get(directory)!;
  const promise = (async () => {
    const notices: string[] = [];
    const batch = await listBatchRuns(undefined, directory, (notice: string) => notices.push(notice));
    const interactive = await tap.collect(
      directory,
      batch[0]?.projectRoot || directory,
    );
    if (interactive.notice) notices.push(interactive.notice);
    const runs: PulseRun[] = [];
    for (const value of [...batch, ...interactive.runs]) {
      const parsed = runSchema.safeParse(value);
      if (parsed.success) runs.push(parsed.data);
      else
        notices.push("A run contains unsupported telemetry and was omitted.");
    }
    runs.sort(
      (a, b) =>
        Number(["starting", "running"].includes(b.status)) -
          Number(["starting", "running"].includes(a.status)) ||
        (b.startedAt || "").localeCompare(a.startedAt || ""),
    );
    cache.set(directory, { at: Date.now(), runs, notices });
    return { runs, notices };
  })().finally(() => inflight.delete(directory));
  inflight.set(directory, promise);
  return promise;
}
export function trimRuns(
  runs: PulseRun[],
  selectedId: string | null,
  search = "",
  filter = "all",
): PulseRun[] {
  return runs.slice(0, 30).map((run) => {
    const queued =
      run.source === "interactive" &&
      ["starting", "running"].includes(run.status);
    const matching = run.tests.filter((test) =>
      matchesTest(test, search, filter, queued),
    );
    const matchingFiles = new Set(
      matching.map((test) => specKey(test.file, run.projectRoot)),
    );
    const tests =
      run.id === selectedId
        ? [...matching]
            .sort(
              (a, b) =>
                (a.status === "failed" ? 0 : a.status === "running" ? 1 : 2) -
                (b.status === "failed" ? 0 : b.status === "running" ? 1 : 2),
            )
            .slice(0, 300)
        : [];
    return {
      ...run,
      specs:
        run.id === selectedId
          ? summarizeSpecs(run).filter(
              (spec) =>
                (!search && filter === "all") || matchingFiles.has(spec.file),
            )
          : [],
      tests,
      truncated: run.id === selectedId && matching.length > tests.length,
    };
  });
}
export async function report(
  directory: string,
  runId: string,
  testId?: string,
) {
  const { runs } = await collect(directory);
  const run = runs.find((run) => run.id === runId);
  if (!run || run.source !== "interactive")
    throw new Error("That interactive run is unavailable.");
  if (testId && !run.tests.some((test) => test.id === testId))
    throw new Error("That test is not part of the selected run.");
  const data = await tap.report(run, testId);
  const text = testId
    ? `${data.test?.fullTitle || data.test?.title || "Test"}\n\n${data.error?.message || "No failure reported"}\n${data.error?.stack || ""}\n${data.error?.codeFrame?.frame || ""}`
    : `${data.spec || run.activeSpec}\n\nPassed: ${data.stats?.passed || 0} · Failed: ${data.stats?.failed || 0} · Pending: ${data.stats?.pending || 0} · Skipped: ${data.stats?.skipped || 0}\n\n${flattenReport(
        data,
        run.activeSpec,
      )
        .map(
          (test) =>
            `${test.status.toUpperCase()}  ${test.titlePath.join(" › ")}  (${test.duration} ms)`,
        )
        .join("\n")}`;
  return { text: text.slice(0, 100_000) };
}
export async function preview(
  directory: string,
  input: { runId: string; testId: string; index: number },
) {
  const { runs } = await collect(directory);
  const run = runs.find((run) => run.id === input.runId);
  const attachment =
    input.testId === "__spec_artifact__"
      ? run?.artifacts[input.index]
      : run?.tests.find((test) => test.id === input.testId)?.attachments[
          input.index
        ];
  if (!run || !attachment) throw new Error("That media is unavailable.");
  return readMedia(run.projectRoot, attachment);
}
export function cleanup() {
  cache.clear();
  tap.clear();
}

export async function sourcePreview(
  directory: string,
  runId: string,
  file: string,
) {
  const { runs } = await collect(directory);
  const run = runs.find((item) => item.id === runId);
  if (!run) throw new Error("That run is unavailable.");
  return readSpecSource(run, file, directory);
}

export async function inspectTest(
  directory: string,
  input: {
    runId: string;
    testId: string;
    view: "details" | "logs";
    attempt?: number;
  },
) {
  const { runs } = await collect(directory);
  const run = runs.find((item) => item.id === input.runId);
  const test = run?.tests.find((item) => item.id === input.testId);
  if (!run || !test)
    throw new Error("That test is not part of an available run.");
  if (input.attempt && input.attempt > test.retry + 1)
    throw new Error("That test attempt is unavailable.");
  if (input.view === "details") {
    let source, sourceNotice;
    try {
      source = await readTestSource(
        run,
        test.id,
        directory,
        await findPluginDirectory(),
      );
    } catch (error) {
      sourceNotice = `Test source unavailable: ${error instanceof Error ? error.message : String(error)}`;
    }
    const sourceInfo = {
      source,
      sourceNotice,
      sourceFile: specKey(test.file, run.projectRoot),
    };

    if (run.source === "interactive" && test.status === "failed") {
      try {
        return {
          ...sourceInfo,
          text: describeTest(test, run, await tap.report(run, test.id)),
        };
      } catch (error) {
        return {
          ...sourceInfo,
          text: describeTest(test, run),
          notice: `Showing captured metadata. Live failure details are unavailable: ${String(error)}`,
        };
      }
    }
    return { text: describeTest(test, run), ...sourceInfo };
  }
  if (run.source !== "interactive")
    return {
      text: "",
      notice:
        "Command logs were not captured for this batch run. They are available from a running cypress open session through Cypress Tap. Browser console output and process stdout/stderr are not captured as per-test logs.",
    };
  const report = await tap.report(run, test.id, input.attempt);
  const result = commandLog(report);
  return {
    text: result.text,
    notice:
      "Cypress command history, including cy.log() entries and hook commands. This is not a capture of arbitrary browser console output." +
      (result.truncated
        ? " Showing at most 1,000 rows and 100,000 characters."
        : ""),
  };
}
