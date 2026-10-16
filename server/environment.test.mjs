import test from "node:test";
import assert from "node:assert/strict";
import { checkNode, checkCypress } from "./environment.mjs";
import { parseArgs } from "./cli.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
test("helper executes when launched through a symlink", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-cli-link-"));
  try {
    const cli = join(directory, "pulse.mjs");
    await symlink(fileURLToPath(new URL("./cli.mjs", import.meta.url)), cli);
    const {stdout} = await promisify(execFile)(process.execPath, [cli, "--help"]);
    assert.match(stdout, /Cypress Pulse/);
  } finally {
    await rm(directory, {recursive:true, force:true});
  }
});
test("enforces the chosen supported runtime lines", () => {
  checkNode("22.18.0");
  checkNode("24.16.0");
  checkCypress("16.0.0");
  checkCypress("16.1.1");
  for (const version of ["20.0.0", "22.17.0", "23.0.0", "25.0.0"])
    assert.throws(() => checkNode(version));
  for (const version of ["15.21.0", "17.0.0", "16.0.0-beta.1"])
    assert.throws(() => checkCypress(version));
});
test("keeps Cypress options as separate arguments and rejects unknown helper flags", () => {
  assert.deepEqual(
    parseArgs(["run", "--project", "/a path", "--", "--spec", "one.cy.js"])
      .args,
    ["--spec", "one.cy.js"],
  );
  assert.throws(
    () => parseArgs(["run", "--spec", "one"]),
    /Unknown helper option/,
  );
});
