export function specKey(file, projectRoot = "") {
  const path = file.replace(/\\/g, "/").replace(/^\.\//, "");
  const root = projectRoot.replace(/\\/g, "/").replace(/\/$/, "");
  return root && path.startsWith(`${root}/`)
    ? path.slice(root.length + 1)
    : path;
}

/** @param {import('./rpc').PulseRun} run @returns {import('./rpc').PulseSpec[]} */
export function summarizeSpecs(run) {
  const groups = new Map();
  const active = specKey(run.activeSpec, run.projectRoot);
  const live = ["starting", "running"].includes(run.status);
  const group = (file) => {
    const key = specKey(file, run.projectRoot);
    if (!groups.has(key))
      groups.set(key, {
        file: key,
        status: "empty",
        observed: 0,
        passed: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
        running: 0,
        queued: 0,
        retries: 0,
      });
    return groups.get(key);
  };
  for (const test of run.tests) {
    const item = group(test.file);
    item.observed++;
    const state =
      live && run.source === "interactive" && test.status === "pending"
        ? "queued"
        : test.status;
    if (
      ["passed", "failed", "pending", "skipped", "running", "queued"].includes(
        state,
      )
    )
      item[state]++;
    item.retries += test.retry > 0 ? 1 : 0;
  }
  if (active) group(active);
  for (const artifact of run.artifacts) if (artifact.file) group(artifact.file);
  for (const item of groups.values()) {
    item.status =
      live && (item.file === active || item.running > 0)
        ? "running"
        : item.failed > 0
          ? "failed"
          : item.passed > 0
            ? "passed"
            : "empty";
    if (item.file === active && ["error", "interrupted"].includes(run.status))
      item.status = run.status;
  }
  const rank = (status) =>
    status === "running" ? 0 : ["failed", "error"].includes(status) ? 1 : 2;
  return [...groups.values()].sort(
    (a, b) => rank(a.status) - rank(b.status) || a.file.localeCompare(b.file),
  );
}
