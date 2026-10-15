export function describeTest(test, run, report) {
  const error = report?.error || test.error;
  return [
    test.titlePath.join(" › "),
    `Spec: ${test.file}`,
    `Status: ${test.status}${test.status === "passed" && test.retry > 0 ? " (flaky)" : ""}`,
    `Duration: ${test.duration} ms`,
    `Retries: ${test.retry}`,
    `Mode: ${run.mode}`,
    `Browser: ${run.browser || "Unknown"}`,
    error
      ? `\n${error.message || ""}\n${error.stack || ""}\n${error.codeFrame?.frame || ""}`
      : test.status === "failed"
        ? "\nFailure details were not captured."
        : "\nNo failure reported.",
  ]
    .join("\n")
    .slice(0, 100_000);
}

export function commandLog(report) {
  const hooks = new Map(
    (report.hooks || []).map((h) => [h.hookId, h.hookName]),
  );
  const commands = report.commands || [];
  const rows = commands
    .slice(0, 1000)
    .map(
      (row) =>
        `[${row.state || "unknown"}] ${hooks.get(row.hookId) || row.hookId || "test"} · ${row.name || "command"}\n${typeof row.message === "string" ? row.message : JSON.stringify(row.message ?? "")}`,
    );
  const text = rows.join("\n\n");
  return {
    text: text.slice(0, 100_000),
    truncated: commands.length > 1000 || text.length > 100_000,
  };
}
