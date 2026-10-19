import test from "node:test";
import assert from "node:assert/strict";
import { reduceRun, inside, listBatchRuns, readBatchRun } from "./store.mjs";
import { mkdtemp, mkdir, writeFile, rm, symlink, readFile, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const manifest = {
  v: 1,
  id: "one",
  projectRoot: "/project",
  workspaceRoot: "/project",
  startedAt: "2026-10-14T10:00:00.000Z",
  mode: "headless",
};
const record = (kind, data, n = 0) => ({
  v: 1,
  producer: process.pid,
  seq: n,
  kind,
  data,
  at: `2026-10-14T10:00:0${n}.000Z`,
});
test("Cypress 16 final results retain duration, errors and spec artifacts", () => {
  const run = reduceRun(
    manifest,
    [
      record("spec.begin", { file: "a.cy.js" }),
      record("test.end", {
        file: "a.cy.js",
        titlePath: ["Suite", "fails"],
        title: "fails",
        state: "failed",
        duration: 30,
        error: { message: "live error" },
      }),
      record("spec.end", {
        file: "a.cy.js",
        tests: [
          {
            titlePath: ["Suite", "fails"],
            state: "failed",
            duration: 42,
            error: { message: "final error" },
            attempts: [{ state: "failed" }],
          },
        ],
        screenshots: ["/project/failure.png"],
      }),
    ],
    null,
  );
  assert.equal(run.tests[0].duration, 42);
  assert.equal(run.tests[0].error.message, "final error");
  assert.equal(run.artifacts[0].path, "/project/failure.png");
});
test("pending-only completion is empty rather than passed", () => {
  const run = reduceRun(
    manifest,
    [
      record("run.end", {
        totalTests: 1,
        passed: 0,
        failed: 0,
        pending: 1,
        skipped: 0,
      }),
    ],
    { code: 0, endedAt: "2026-10-14T10:00:10.000Z" },
  );
  assert.equal(run.status, "empty");
});
test("spec completion does not finish a batch, retries do not increase completed tests", () => {
  const run = reduceRun(
    manifest,
    [
      record("run.begin", { specs: ["a", "b"] }),
      record("spec.begin", { file: "a" }),
      record("test.begin", { file: "a", title: "one", titlePath: ["one"] }),
      record("test.retry", { file: "a", title: "one", titlePath: ["one"] }),
      record("test.end", {
        file: "a",
        title: "one",
        titlePath: ["one"],
        state: "passed",
        retry: 1,
      }),
      record("spec.end", {
        file: "a",
        tests: [
          {
            titlePath: ["one"],
            state: "passed",
            attempts: [{ state: "failed" }, { state: "passed" }],
          },
        ],
      }),
    ],
    null,
  );
  assert.equal(run.status, "running");
  assert.equal(run.passed, 1);
  assert.equal(run.retries, 1);
  assert.equal(run.completedSpecs, 1);
});
test("process disappearance marks live tests interrupted", () => {
  const run = reduceRun(
    manifest,
    [record("test.begin", { file: "a", title: "one", titlePath: ["one"] })],
    null,
    false,
  );
  assert.equal(run.status, "interrupted");
  assert.equal(run.tests[0].status, "interrupted");
});
test("batch progress includes completed tests before a spec ends without counting retries twice", () => {
  const run = reduceRun(
    manifest,
    [
      record("run.begin", { specs: ["a", "b"] }),
      record("spec.begin", { file: "a" }),
      record("reporter.begin", { total: 4 }),
      record("test.end", {
        file: "a",
        titlePath: ["flaky"],
        state: "passed",
        retry: 1,
      }),
      record("test.end", {
        file: "a",
        titlePath: ["failed"],
        state: "failed",
        retry: 2,
      }),
      record("test.begin", { file: "a", titlePath: ["slow"] }),
    ],
    null,
  );
  assert.equal(run.status, "running");
  assert.equal(run.completedSpecs, 0);
  assert.equal(run.totalTests, 4);
  assert.equal(run.testTotalComplete, false);
  assert.deepEqual(
    [run.passed, run.failed, run.flaky, run.retries],
    [1, 1, 1, 2],
  );
  assert.equal(run.tests.length, 3);
});
test("workspace containment rejects siblings and traversal", () => {
  assert.equal(inside("/repo", "/repo/package"), true);
  assert.equal(inside("/repo", "/repo-other"), false);
  assert.equal(inside("/repo", "/outside"), false);
});
test("concurrent run journals remain independent and a forged workspace root is rejected", async () => {
  const state = await mkdtemp(join(tmpdir(), "pulse-store-"));
  try {
    const project = join(state, "project");
    const outside = join(state, "outside");
    await mkdir(project);
    await mkdir(outside);
    await Promise.all(
      ["one", "two", "outside"].map(async (id, index) => {
        const directory = join(state, "runs", id);
        await mkdir(directory, { recursive: true });
        await writeFile(
          join(directory, "manifest.json"),
          JSON.stringify({
            ...manifest,
            id,
            projectRoot: id === "outside" ? outside : project,
            ownerPid: process.pid,
          }),
        );
        await writeFile(
          join(directory, `events-${process.pid}.jsonl`),
          JSON.stringify(
            record("run.end", {
              totalTests: index + 1,
              passed: index + 1,
              failed: 0,
            }),
          ) + "\n",
        );
        await writeFile(
          join(directory, "exit.json"),
          JSON.stringify({ code: 0, endedAt: "2026-10-14T10:00:10Z" }),
        );
      }),
    );
    const runs = await listBatchRuns(state, project);
    assert.equal(runs.length, 2);
    assert.deepEqual(
      new Set(runs.map((run) => run.id)),
      new Set(["one", "two"]),
    );
    assert.deepEqual(runs.map((run) => run.passed).sort(), [1, 2]);
  } finally {
    await rm(state, { recursive: true, force: true });
  }
});

test("corrupt and structurally invalid records do not hide a valid run", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-corrupt-"));
  try {
    await writeFile(join(directory, "manifest.json"), JSON.stringify({...manifest, id:directory.split("/").at(-1), projectRoot: directory}));
    await writeFile(join(directory, "events-1.jsonl"), [
      JSON.stringify(record("run.begin", {specs:["a.cy.js"]})),
      "{broken}",
      JSON.stringify(record("spec.end", {file:"a.cy.js", tests:[null]})),
      JSON.stringify(record("run.begin", {specs:"invalid"})),
      JSON.stringify(record("run.end", {passed:1, failed:0, totalTests:1})),
      '{"partial":',
    ].join("\n"));
    await writeFile(join(directory, "exit.json"), JSON.stringify({code:0, endedAt:manifest.startedAt}));
    const run = await readBatchRun(directory);
    assert.equal(run.status, "passed");
    assert.equal(run.passed, 1);
    assert.ok(run.errors.some((message) => /telemetry record/i.test(message)));
  } finally {
    await rm(directory, {recursive:true, force:true});
  }
});

async function historyFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "pulse-history-"));
  t.after(() => rm(root, {recursive:true, force:true}));
  const workspace = join(root, "workspace");
  await mkdir(workspace);
  const save = async (id, projectRoot = workspace) => {
    const directory = join(root, "runs", id);
    await mkdir(directory, {recursive:true});
    await writeFile(join(directory, "manifest.json"), JSON.stringify({...manifest, id, projectRoot}));
    await writeFile(join(directory, "exit.json"), JSON.stringify({code:0, endedAt:manifest.startedAt}));
    return directory;
  };
  await save("valid");
  return {root, workspace, save};
}
test("history omits removed projects and worktrees without deleting saved journals", async (t) => {
  const f = await historyFixture(t);
  const nested = join(f.workspace, "package");
  const worktree = join(f.root, "worktree");
  await mkdir(nested); await mkdir(join(worktree, "package"), {recursive:true});
  const saved = await f.save("removed", nested);
  await f.save("worktree", join(worktree, "package"));
  await rm(nested, {recursive:true}); await rm(worktree, {recursive:true});
  const notices = [];
  assert.deepEqual((await listBatchRuns(f.root, f.workspace, n=>notices.push(n))).map(r=>r.id), ["valid"]);
  assert.deepEqual(notices, []);
  assert.equal(JSON.parse(await readFile(join(saved, "manifest.json"), "utf8")).id, "removed");
  await assert.rejects(readBatchRun(saved, f.workspace, "removed"), {code:"RUN_PROJECT_MISSING"});
});
test("history omits project directories replaced by files and incomplete snapshots", async (t) => {
  const f = await historyFixture(t);
  const parent = join(f.workspace, "parent");
  await mkdir(join(parent, "package"), {recursive:true});
  const saved = await f.save("replaced", join(parent, "package"));
  await rm(parent, {recursive:true}); await writeFile(parent, "file");
  await mkdir(join(f.root, "runs", "creating"));
  const vanished = await f.save("vanished");
  await symlink(join(f.root, "missing-events"), join(vanished, "events-1.jsonl"));
  const notices = [];
  assert.deepEqual((await listBatchRuns(f.root, f.workspace, n=>notices.push(n))).map(r=>r.id), ["valid"]);
  assert.deepEqual(notices, []);
  await assert.rejects(readBatchRun(saved), {code:"RUN_PROJECT_MISSING"});
});
test("history reports corruption, identity mismatches and unexpected filesystem errors", async (t) => {
  const f = await historyFixture(t);
  const corrupt = await f.save("corrupt");
  await writeFile(join(corrupt, "manifest.json"), "{broken");
  const mismatch = await f.save("mismatch");
  await writeFile(join(mismatch, "manifest.json"), JSON.stringify({...manifest, projectRoot:f.workspace}));
  const loop = join(f.root, "loop"); await symlink(loop, loop);
  await f.save("loop", loop);
  const badExit = await f.save("bad-exit"); await writeFile(join(badExit, "exit.json"), "{broken");
  const notices = [];
  assert.deepEqual((await listBatchRuns(f.root, f.workspace, n=>notices.push(n))).map(r=>r.id), ["valid"]);
  assert.equal(notices.length, 4);
  assert.ok(notices.some(n=>/identity/.test(n)));
  assert.ok(notices.some(n=>/ELOOP/.test(n)));
  await assert.rejects(readBatchRun(corrupt), SyntaxError);
  await assert.rejects(listBatchRuns(loop, f.workspace), {code:"ELOOP"});
});
test("history follows workspace aliases, rejects symlink escapes and validates selected workspace", async (t) => {
  const f = await historyFixture(t);
  const alias = join(f.root, "alias"); await symlink(f.workspace, alias, "dir");
  const outside = join(f.root, "outside"); await mkdir(outside);
  const escape = join(f.workspace, "escape"); await symlink(outside, escape, "dir");
  const saved = await f.save("escape", escape);
  const notices = [];
  assert.deepEqual((await listBatchRuns(f.root, alias, n=>notices.push(n))).map(r=>r.id), ["valid"]);
  assert.deepEqual(notices, []);
  await assert.rejects(readBatchRun(saved, f.workspace, "escape"), {code:"RUN_WORKSPACE_MISMATCH"});
  await assert.rejects(listBatchRuns(f.root, join(f.root, "missing")), {code:"ENOENT"});
});

test("history reports permission failures instead of treating them as removed projects", async (t) => {
  if (process.platform === "win32" || process.getuid?.() === 0) return t.skip("POSIX permissions require a non-root user");
  const f = await historyFixture(t);
  const saved = await f.save("unreadable");
  const file = join(saved, "manifest.json");
  await chmod(file, 0);
  try {
    const notices = [];
    assert.deepEqual((await listBatchRuns(f.root, f.workspace, n=>notices.push(n))).map(r=>r.id), ["valid"]);
    assert.equal(notices.length, 1);
    assert.match(notices[0], /EACCES/);
    await assert.rejects(readBatchRun(saved), {code:"EACCES"});
  } finally {
    await chmod(file, 0o600);
  }
});
