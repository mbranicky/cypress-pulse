import test from "node:test";
import assert from "node:assert/strict";
import helper from "./config.cjs";
test("wraps the default export of a transpiled TypeScript module", () => {
  const original = { default: { video: false, e2e: { supportFile: false } } };
  const wrapped = helper.wrapConfig(original);
  assert.equal(wrapped.default, undefined);
  assert.equal(wrapped.video, false);
  assert.equal(typeof wrapped.e2e.setupNodeEvents, "function");
});
