import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { listBatchRuns } from "./store.mjs";

test("helper forwards termination and records interruption without orphaning its child", {timeout:10_000}, async () => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-interrupt-"));
  let child;
  try {
    const project = join(directory, "project");
    const cypress = join(project, "node_modules/cypress");
    await mkdir(join(cypress, "bin"), {recursive:true});
    await writeFile(join(project, "package.json"), '{"type":"commonjs"}');
    await writeFile(join(project, "cypress.config.cjs"), "module.exports = {};");
    await writeFile(join(cypress, "package.json"), '{"name":"cypress","version":"16.1.1"}');
    const ready = join(directory, "ready");
    await writeFile(join(cypress, "bin/cypress"), `require('node:fs').writeFileSync(${JSON.stringify(ready)}, String(process.pid)); setInterval(() => {}, 1000);`);
    const state = join(directory, "state");
    child = spawn(process.execPath, [fileURLToPath(new URL("./cli.mjs", import.meta.url)), "run", "--project", project, "--state-dir", state], {stdio:"ignore"});
    const exited = once(child, "exit");
    let childPid;
    for (let i=0; i<100; i++) {
      childPid = await readFile(ready, "utf8").catch(() => null);
      if (childPid) break;
      await delay(20);
    }
    assert.ok(childPid, "Cypress child did not start");
    child.kill("SIGTERM");
    const [code] = await exited;
    assert.equal(code, 1);
    assert.throws(() => process.kill(Number(childPid), 0), {code:"ESRCH"});
    const [run] = await listBatchRuns(state);
    assert.equal(run.status, "interrupted");
    assert.equal(run.exitCode, 1);
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await rm(directory, {recursive:true, force:true});
  }
});
