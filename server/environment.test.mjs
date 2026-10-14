import test from "node:test";
import assert from "node:assert/strict";
import { checkNode, checkCypress } from "./environment.mjs";
import { parseArgs } from "./cli.mjs";
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
