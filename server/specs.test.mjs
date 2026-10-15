import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizeSpecs, specKey } from "../shared/specs.mjs";

const run = {
  projectRoot: "/project",
  activeSpec: "",
  source: "batch",
  status: "failed",
  artifacts: [],
};
const item = (file, status, retry = 0) => ({ file, status, retry });
test("spec summaries preserve full counts and separate equal filenames in different folders", () => {
  const groups = summarizeSpecs({
    ...run,
    tests: [
      item("cypress/a/Cart.cy.ts", "passed"),
      item("/project/cypress/a/Cart.cy.ts", "failed", 1),
      item("cypress/b/Cart.cy.ts", "passed"),
    ],
  });
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], {
    file: "cypress/a/Cart.cy.ts",
    status: "failed",
    observed: 2,
    passed: 1,
    failed: 1,
    pending: 0,
    skipped: 0,
    running: 0,
    queued: 0,
    retries: 1,
    flaky: 0,
  });
  assert.equal(groups[1].file, "cypress/b/Cart.cy.ts");
  assert.equal(
    specKey("C:\\work\\cypress\\Cart.cy.ts", "C:\\work"),
    "cypress/Cart.cy.ts",
  );
});
test("active specs sort first even before results arrive; Tap waiting tests are queued", () => {
  const groups = summarizeSpecs({
    ...run,
    source: "interactive",
    status: "running",
    activeSpec: "cypress/checkout.cy.ts",
    tests: [
      item("cypress/failed.cy.ts", "failed"),
      item("cypress/checkout.cy.ts", "pending"),
    ],
  });
  assert.equal(groups[0].file, "cypress/checkout.cy.ts");
  assert.equal(groups[0].status, "running");
  assert.equal(groups[0].queued, 1);
  assert.equal(groups[0].pending, 0);
  assert.equal(
    summarizeSpecs({
      ...run,
      status: "running",
      activeSpec: "new.cy.ts",
      tests: [],
    })[0].status,
    "running",
  );
});
test("pending-only specs remain empty and screenshot specs remain identifiable", () => {
  const groups = summarizeSpecs({
    ...run,
    tests: [item("pending.cy.ts", "pending")],
    artifacts: [{ file: "compile.cy.ts" }],
  });
  assert.equal(groups.length, 2);
  assert.ok(groups.every((group) => group.status === "empty"));
});
