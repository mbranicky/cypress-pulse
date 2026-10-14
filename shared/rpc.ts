import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const testSchema = z.object({
  id: z.string(),
  file: z.string(),
  title: z.string(),
  titlePath: z.array(z.string()),
  status: z.string(),
  duration: z.number().default(0),
  retry: z.number().default(0),
  startedAt: z.string().optional(),
  error: z
    .object({
      message: z.string().optional(),
      stack: z.string().optional(),
      name: z.string().optional(),
    })
    .passthrough()
    .optional(),
  attachments: z
    .array(
      z.object({
        kind: z.enum(["screenshot", "video"]),
        path: z.string(),
        attempt: z.number().optional(),
      }),
    )
    .default([]),
});
export const runSchema = z.object({
  id: z.string(),
  source: z.enum(["batch", "interactive"]),
  projectRoot: z.string(),
  workspaceRoot: z.string(),
  status: z.string(),
  mode: z.string(),
  startedAt: z.string().nullable(),
  updatedAt: z.string(),
  endedAt: z.string().optional(),
  browser: z.string(),
  cypressVersion: z.string().optional(),
  testingType: z.string().optional(),
  activeSpec: z.string(),
  totalSpecs: z.number().nullable(),
  completedSpecs: z.number(),
  totalTests: z.number().nullable(),
  passed: z.number(),
  failed: z.number(),
  pending: z.number(),
  skipped: z.number(),
  retries: z.number(),
  sessionPid: z.number().optional(),
  tests: z.array(testSchema),
  errors: z.array(z.string()),
  truncated: z.boolean().optional(),
  artifacts: z
    .array(
      z.object({
        file: z.string(),
        kind: z.enum(["screenshot", "video"]),
        path: z.string(),
      }),
    )
    .default([]),
});
export type PulseRun = z.infer<typeof runSchema>;
export type PulseTest = z.infer<typeof testSchema>;
const workspace = z.object({ workspaceId: z.string().min(1) });
export const dashboard = defineRpc({
  name: "dashboard.read",
  input: workspace.extend({ runId: z.string().optional() }),
  output: z.object({
    runs: z.array(runSchema),
    selectedId: z.string().nullable(),
    notices: z.array(z.string()),
    helper: z.string().nullable(),
  }),
});
export const briefs = defineRpc({
  name: "dashboard.briefs",
  input: z.object({ workspaceIds: z.array(z.string()).max(200) }),
  output: z.object({
    workspaces: z.record(
      z.string(),
      z.object({
        status: z.string(),
        running: z.number(),
        failed: z.number(),
        passed: z.number(),
        completed: z.number(),
        total: z.number().nullable(),
        label: z.string(),
      }),
    ),
  }),
});
export const interactiveReport = defineRpc({
  name: "interactive.report",
  input: workspace.extend({
    runId: z.string().min(1),
    testId: z.string().optional(),
  }),
  output: z.object({ text: z.string() }),
});
export const screenshot = defineRpc({
  name: "attachment.preview",
  input: workspace.extend({
    runId: z.string(),
    testId: z.string(),
    index: z.number().int().min(0),
  }),
  output: z.object({ dataUri: z.string() }),
});

const skillState = z.enum(["missing", "current", "outdated", "foreign"]);
const skillResult = z.object({
  state: skillState,
  targets: z.array(z.object({ path: z.string(), state: skillState })),
});
export const skillStatus = defineRpc({
  name: "skill.status",
  input: z.object({}),
  output: skillResult,
});
export const installSkill = defineRpc({
  name: "skill.install",
  input: z.object({}),
  output: skillResult,
});
