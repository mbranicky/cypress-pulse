/** Flaky passes are a subset of passed tests, never additional completed tests. */
export function testProgress(run) {
  const completed = run.passed + run.failed + run.pending + run.skipped;
  const flaky = Math.min(run.passed, run.flaky || 0);
  const total = Math.max(completed, run.totalTests || 0);
  return {
    completed,
    total,
    known: !run.testTotalComplete,
    segments: [
      { status: "passed", count: run.passed - flaky },
      { status: "flaky", count: flaky },
      { status: "failed", count: run.failed },
      { status: "pending", count: run.pending },
      { status: "skipped", count: run.skipped },
    ],
  };
}
