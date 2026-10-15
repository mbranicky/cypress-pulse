import test from "node:test";
import assert from "node:assert/strict";
import { matchesTest } from "../shared/search.mjs";

test("search matches file paths and full suite titles case-insensitively with status filters", () => {
  const value = {
    file: "cypress/e2e/Checkout.cy.ts",
    titlePath: ["Saved cart", "restores an order"],
    status: "passed",
    retry: 1,
  };
  assert.equal(matchesTest(value, "CHECKOUT.cy"), true);
  assert.equal(matchesTest(value, "cart restores"), true);
  assert.equal(matchesTest(value, "saved CART", "flaky"), true);
  assert.equal(matchesTest(value, "saved", "failed"), false);
  assert.equal(matchesTest(value, "does not exist"), false);
  assert.equal(matchesTest(value, ".*"), false);
  assert.equal(
    matchesTest({ ...value, status: "pending" }, "order", "skipped"),
    true,
  );
  assert.equal(
    matchesTest({ ...value, status: "pending" }, "order", "skipped", true),
    false,
  );
  assert.equal(
    matchesTest({ ...value, status: "skipped" }, "order", "skipped", true),
    true,
  );
});
