import test from "node:test";
import assert from "node:assert/strict";
import { parseTap, tapRun, TapCollector, flattenReport } from "./tap.mjs";

test("idle discovery accepts Cypress 16 no-session output", () => {
  assert.deepEqual(
    parseTap("No running Cypress session found. Start Cypress in open mode."),
    [],
  );
});
test("interactive reruns have distinct identities and empty is not success", () => {
  const base = {
    pid: 10,
    projectRoot: "/project",
    status: "passed",
    totalTests: 1,
    results: { passed: 0, pending: 1 },
  };
  assert.equal(tapRun(base).status, "empty");
  assert.notEqual(
    tapRun({ ...base, startedAt: "one" }).id,
    tapRun({ ...base, startedAt: "two" }).id,
  );
});
test("unfinished Tap pending counts are not completed pending tests", () => {
  const run = tapRun({
    pid: 10,
    projectRoot: "/project",
    status: "running",
    results: { passed: 0, failed: 0, pending: 2, skipped: 0 },
    totalTests: 2,
  });
  assert.equal(run.pending, 0);
});
test("build failures retain the status diagnostic", () => {
  const run = tapRun({
    pid: 10,
    projectRoot: "/project",
    status: "failed",
    error: { message: "Build failed" },
  });
  assert.match(run.errors[0], /Build failed/);
});
test("Cypress Tap attempt arrays identify flaky passes and retried failures", () => {
  const tests = flattenReport(
    {
      tests: [
        {
          id: "flaky",
          title: "flaky",
          state: "passed",
          attempts: [{ state: "failed" }, { state: "passed" }],
        },
        {
          id: "failed",
          title: "failed",
          state: "failed",
          attempts: [{ state: "failed" }, { state: "failed" }],
        },
      ],
    },
    "a.cy.ts",
  );
  assert.deepEqual(
    tests.map((test) => test.retry),
    [1, 1],
  );
});
test("session versions use each project installation, not discovery CLI", async () => {
  const calls = [];
  const collector = new TapCollector({
    resolve: (root) => ({ cli: `${root}/cli`, version: "16.1.1" }),
    call: async (cli, root, args) => {
      calls.push(cli);
      if (args[0] === "reporter")
        return {
          spec: "a.cy.ts",
          startedAt: "2026-10-14T10:00:00Z",
          tests: [],
          stats: { passed: 1 },
        };
      if (args[0] === "sessions")
        return [
          { pid: 10, projectRoot: "/tmp" },
          { pid: 11, projectRoot: "/outside" },
        ];
      return {
        pid: 10,
        projectRoot: "/tmp",
        status: "running",
        spec: "a.cy.ts",
        startedAt: "2026-10-14T10:00:00Z",
        results: { passed: 1 },
      };
    },
  });
  const result = await collector.collect("/tmp", "/tmp/nested");
  assert.equal(result.runs.length, 1);
  assert.equal(calls[0], "/tmp/nested/cli");
  assert.ok(
    calls
      .slice(1)
      .every((cli) => ["/tmp/cli", "/private/tmp/cli"].includes(cli)),
  );
});
test("rejects a report if a new run starts while reading it", async () => {
  let reads = 0;
  const collector = new TapCollector({
    resolve: () => ({ cli: "/cli", version: "16.1.1" }),
    call: async (_cli, _root, args) => {
      if (args[0] === "reporter")
        return { tests: [], startedAt: "one", spec: "" };
      return {
        pid: 10,
        projectRoot: "/tmp",
        status: "passed",
        startedAt: ++reads === 1 ? "one" : "two",
        results: { passed: 1 },
      };
    },
  });
  await assert.rejects(
    () =>
      collector.report({
        id: "tap-10-none-one",
        sessionPid: 10,
        projectRoot: "/tmp",
        startedAt: "one",
        activeSpec: "",
      }),
    /rerun started/,
  );
});

test("interactive collection exposes finished tests during a spec and refreshes the same run", async () => {
  let passed = 1;
  const startedAt = "2026-10-15T10:00:00Z";
  const collector = new TapCollector({
    resolve: () => ({ cli: "/cli", version: "16.1.1" }),
    call: async (_cli, _root, args) => {
      if (args[0] === "sessions") return [{ pid: 10, projectRoot: "/tmp" }];
      if (args[0] === "reporter")
        return {
          spec: "live.cy.ts",
          startedAt,
          stats: { passed, failed: 1, pending: 2 },
          tests: [
            { id: "p", title: "pass", state: "passed", retries: 1 },
            { id: "f", title: "fail", state: "failed" },
            { id: "q", title: "waiting", state: "pending" },
          ],
        };
      return {
        pid: 10,
        projectRoot: "/tmp",
        status: "running",
        spec: "live.cy.ts",
        startedAt,
        totalTests: 4,
        results: { passed, failed: 1, pending: 2 },
      };
    },
  });
  const first = await collector.collect("/tmp");
  assert.equal(first.runs[0].status, "running");
  assert.deepEqual(
    first.runs[0].tests.map((test) => test.status),
    ["passed", "failed", "queued"],
  );
  assert.equal(first.runs[0].flaky, 1);
  assert.equal(first.runs[0].pending, 0);
  assert.equal(first.runs[0].endedAt, undefined);
  passed = 2;
  collector.cache.clear();
  const second = await collector.collect("/tmp");
  assert.equal(second.runs[0].passed, 2);
  assert.equal(second.runs[0].id, first.runs[0].id);
});
