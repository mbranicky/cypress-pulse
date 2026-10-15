import test from "node:test";
import assert from "node:assert/strict";
import { commandLog, describeTest } from "./test-details.mjs";

test("test details retain successful metadata and failure diagnostics", () => {
  const value = {
    titlePath: ["Cart", "restores"],
    file: "cart.cy.js",
    status: "passed",
    retry: 1,
    duration: 12,
  };
  assert.match(
    describeTest(value, { mode: "headless", browser: "chrome" }),
    /passed \(flaky\)/,
  );
  assert.match(
    describeTest(
      { ...value, error: { message: "failure", stack: "trace" } },
      { mode: "headless" },
    ),
    /failure\ntrace/,
  );
});
test("command logs preserve hook attribution, cy.log rows, ordering and limits", () => {
  const report = {
    hooks: [{ hookId: "h1", hookName: "before each" }],
    commands: [
      { hookId: "h1", name: "log", state: "passed", message: "setup" },
      { name: "log", state: "passed", message: "test message" },
    ],
  };
  const result = commandLog(report);
  assert.match(result.text, /before each · log\nsetup/);
  assert.ok(result.text.indexOf("setup") < result.text.indexOf("test message"));
  assert.equal(result.truncated, false);
  assert.deepEqual(commandLog({}), { text: "", truncated: false });
  assert.equal(
    commandLog({ commands: Array(1001).fill(report.commands[0]) }).truncated,
    true,
  );
});
