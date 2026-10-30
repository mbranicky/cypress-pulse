import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("./composer-pills.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const settled = () => new Promise((resolve) => setImmediate(resolve));

function harness(agents = [{ id: "a", workspaceId: "w" }]) {
  const state = {
    agents,
    brief: { running: 1, status: "running", label: "Cypress · 1/3" },
    registrations: [],
    rpcCalls: [],
    opened: [],
    pending: null,
  };
  let timer;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: module.exports,
    require: () => ({ briefs: {} }),
    setTimeout: (callback) => { timer = callback; return 1; },
    clearTimeout: () => { timer = undefined; },
  });
  const client = {
    paseo: { agents: { list: async ({ page }) => {
      const offset = page.cursor ? 1 : 0;
      return {
        entries: state.agents.slice(offset, offset + 1).map((agent) => ({ agent })),
        pageInfo: { hasMore: !offset && state.agents.length > 1, nextCursor: "next" },
      };
    } } },
    rpc: async (_, { workspaceIds: [id] }) => {
      state.rpcCalls.push(id);
      if (state.pending) return state.pending;
      return { workspaces: state.brief ? { [id]: state.brief } : {} };
    },
    addComposerPill: (contribution) => {
      const registration = {
        contribution,
        button: { ...contribution.button },
        removed: false,
        update(patch) { Object.assign(this.button, patch); },
        remove() { this.removed = true; },
      };
      state.registrations.push(registration);
      return registration;
    },
    openPanel: (...args) => state.opened.push(args),
    addHeaderButton: () => assert.fail("The toolbar must not receive a run indicator"),
  };
  const stop = module.exports.watchComposerPills(client);
  return { state, stop, poll: async () => { timer(); await settled(); } };
}

test("adds per-agent static pills and updates counts in place without changing order", async () => {
  const { state, stop, poll } = harness([
    { id: "a", workspaceId: "w" }, { id: "b", workspaceId: "w" },
  ]);
  await settled();
  assert.deepEqual(state.rpcCalls, ["w"]);
  assert.equal(state.registrations.length, 2);
  for (const pill of state.registrations) {
    assert.equal(pill.button.icon, "Activity");
    assert.equal(pill.contribution.id, "cypress-run");
    assert.equal(pill.contribution.workspaceId, "w");
  }
  assert.equal(state.registrations[1].contribution.agentId, "b");
  state.brief = { running: 0, status: "failed", label: "Cypress · failed" };
  await poll();
  assert.equal(state.registrations.length, 2, "Updates must not append replacement pills");
  assert.equal(state.registrations[0].button.icon, "CircleX");
  assert.equal(state.registrations[0].button.label, "Cypress · failed");
  state.registrations[0].button.behavior.onPress();
  assert.equal(state.opened[0][0], "pulse");
  assert.equal(state.opened[0][1].workspaceId, "w");
  assert.equal(state.opened[0][1].location, "explorer");
  stop();
  assert.ok(state.registrations.every((pill) => pill.removed));
});

test("removes expired pills and recreates them for an agent's new workspace", async () => {
  const { state, stop, poll } = harness();
  await settled();
  state.agents[0].workspaceId = "other";
  await poll();
  assert.ok(state.registrations[0].removed);
  assert.equal(state.registrations[1].contribution.workspaceId, "other");
  state.brief = null;
  await poll();
  assert.ok(state.registrations[1].removed);
  stop();
});

test("removes pills when their agents disappear", async () => {
  const { state, stop, poll } = harness();
  await settled();
  state.agents = [];
  await poll();
  assert.ok(state.registrations[0].removed);
  stop();
});

test("does not add pills after cleanup while a dashboard request is pending", async () => {
  const { state, stop } = harness();
  let resolve;
  state.pending = new Promise((done) => { resolve = done; });
  await settled();
  stop();
  resolve({ workspaces: { w: state.brief } });
  await settled();
  assert.equal(state.registrations.length, 0);
});
