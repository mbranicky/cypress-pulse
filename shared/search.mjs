/** Match Unit Test Pulse's literal, case-insensitive file and full-title search. */
export function matchesTest(test, search = "", filter = "all", queued = false) {
  const status = queued && test.status === "pending" ? "queued" : test.status;
  return (
    (filter === "all" ||
      (filter === "failed"
        ? status === "failed"
        : filter === "flaky"
          ? status === "passed" && test.retry > 0
          : ["skipped", "pending"].includes(status))) &&
    `${test.file} ${test.titlePath.join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
}
