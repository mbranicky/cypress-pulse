import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { stateRoot } from "./server/environment.mjs";
import { captureSettings } from "./shared/settings";
import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  testInspection,
  dashboard,
  briefs,
  interactiveReport,
  screenshot,
  specSource,
  skillStatus,
  installSkill,
} from "./shared/rpc";
import {
  inspectTest,
  workspaceDirectory,
  collect,
  trimRuns,
  report,
  preview,
  cleanup,
  sourcePreview,
} from "./server/handlers";
import { installHelper, findPluginDirectory } from "./server/runtime";
import {
  skillStatus as readSkillStatus,
  installSkill as linkSkill,
} from "./server/skill.mjs";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(captureSettings);
  const mirror = (state: Awaited<ReturnType<typeof settings.read>>) => {
    const folder = stateRoot();
    mkdirSync(folder, { recursive: true, mode: 0o700 });
    const file = join(folder, "capture.json");
    writeFileSync(
      `${file}.tmp`,
      JSON.stringify(
        state.status === "ready"
          ? state.values
          : {
              error:
                "Capture settings are invalid. Open Cypress Pulse settings to repair them.",
            },
      ),
      { mode: 0o600 },
    );
    renameSync(`${file}.tmp`, file);
  };
  const unsubscribe = settings.subscribe(mirror);
  let helper: string | null = null;
  let helperError: string | null = null;
  void settings
    .read()
    .then(mirror)
    .then(() => installHelper())
    .then((path) => {
      helper = path;
    })
    .catch((error) => {
      helperError = error.message;
      console.error("Cypress Pulse helper:", error.message);
    });
  server.handle(skillStatus, async () =>
    readSkillStatus(await findPluginDirectory()),
  );
  server.handle(installSkill, async () =>
    linkSkill(await findPluginDirectory()),
  );
  server.handle(dashboard, async (input, { paseo }) => {
    const directory = await workspaceDirectory(paseo, input.workspaceId);
    const { runs, notices } = await collect(directory);
    const selectedId =
      runs.find((run) => run.id === input.runId)?.id || runs[0]?.id || null;
    return {
      runs: trimRuns(runs, selectedId, input.search, input.filter),
      selectedId,
      notices: [...notices, ...(helperError ? [helperError] : [])],
      helper,
    };
  });
  server.handle(briefs, async (input, { paseo }) => {
    const workspaces: Record<
      string,
      {
        status: string;
        running: number;
        failed: number;
        passed: number;
        completed: number;
        total: number | null;
        label: string;
      }
    > = {};
    for (const id of input.workspaceIds) {
      try {
        const { runs } = await collect(await workspaceDirectory(paseo, id));
        const active = runs.filter((run) =>
          ["running", "starting"].includes(run.status),
        );
        const run =
          active[0] ||
          runs.find(
            (run) =>
              run.endedAt && Date.now() - Date.parse(run.endedAt) < 120_000,
          );
        if (!run) continue;
        const completed = run.passed + run.failed + run.pending + run.skipped;
        const label =
          active.length > 1
            ? `Cypress · ${active.length} runs`
            : active.length
              ? `Cypress · ${completed}${run.totalTests === null ? "" : `/${run.totalTests}${run.testTotalComplete ? "" : " known"}`}${run.failed ? ` · ${run.failed} failed` : ""}`
              : `Cypress · ${run.status}`;
        workspaces[id] = {
          status: run.status,
          running: active.length,
          failed: run.failed,
          passed: run.passed,
          completed,
          total: run.totalTests,
          label,
        };
      } catch {
        /* A workspace can disappear while the client polls. */
      }
    }
    return { workspaces };
  });
  server.handle(interactiveReport, async (input, { paseo }) =>
    report(
      await workspaceDirectory(paseo, input.workspaceId),
      input.runId,
      input.testId,
    ),
  );
  server.handle(screenshot, async (input, { paseo }) =>
    preview(await workspaceDirectory(paseo, input.workspaceId), input),
  );
  server.handle(testInspection, async (input, { paseo }) =>
    inspectTest(await workspaceDirectory(paseo, input.workspaceId), input),
  );
  server.handle(specSource, async (input, { paseo }) =>
    sourcePreview(
      await workspaceDirectory(paseo, input.workspaceId),
      input.runId,
      input.file,
    ),
  );
  return () => {
    unsubscribe();
    cleanup();
  };
}
