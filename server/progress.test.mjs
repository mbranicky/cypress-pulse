import test from "node:test";
import assert from "node:assert/strict";
import { testProgress } from "../shared/progress.mjs";

test("progress keeps flaky passes inside the completed total and leaves unfinished tests unfilled", () => {
  const progress = testProgress({
    passed: 5,
    flaky: 2,
    failed: 1,
    pending: 1,
    skipped: 0,
    totalTests: 10,
    testTotalComplete: true,
  });
  assert.equal(progress.completed, 7);
  assert.equal(progress.total, 10);
  assert.equal(progress.known, false);
  assert.equal(
    progress.segments.reduce((sum, segment) => sum + segment.count, 0),
    7,
  );
  assert.deepEqual(
    progress.segments.slice(0, 3).map((s) => s.count),
    [3, 2, 1],
  );
});
test("partial batch discovery is labeled as known tests", () => {
  assert.equal(
    testProgress({
      passed: 1,
      failed: 0,
      pending: 0,
      skipped: 0,
      totalTests: 3,
      testTotalComplete: false,
    }).known,
    true,
  );
});
