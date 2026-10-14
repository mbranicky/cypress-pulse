---
name: cypress-pulse
description: Launch monitored Cypress 16 batch runs for the Cypress Pulse Paseo dashboard, or inspect an interactive Cypress session. Use when running E2E tests during feature development or debugging with Cypress Pulse; preserve the tested project's sources and configuration.
---

# Cypress Pulse

Use the dependency-free helper installed by the local Paseo plugin:

```sh
node ~/.local/share/cypress-pulse/cli.mjs doctor --project /absolute/project/path
node ~/.local/share/cypress-pulse/cli.mjs run --project /absolute/project/path -- --spec cypress/e2e/example.cy.ts --browser chrome
```

The helper prints a run ID on stderr and preserves Cypress's exit code. Pass only Cypress run options after `--`. Add `--headed` there for a visible browser. Use helper `--config-file` for an alternative configuration. Existing configuration hooks and reporters are composed for this invocation through files outside the project.

Retain the project's established application startup, required environment, and spec selection. Inspect its scripts to determine those prerequisites; do not blindly replace a script that also starts services. If an invocation depends on behavior the helper cannot preserve, report that incompatibility rather than changing the project.

Do not add a reporter dependency, alter Cypress configuration/support files, rewrite package scripts, install dependencies in the tested project, or copy its test sources elsewhere for monitoring. If the helper is missing, explain that the Paseo Cypress Pulse plugin needs to be running. The plugin project itself is separate from the tested project.

For machine-readable results:

```sh
node ~/.local/share/cypress-pulse/cli.mjs show --run-id RUN_ID
```

Read result counts and failure details. A run with no passed or failed tests is empty verification, even if Cypress exits successfully. Attribute each result to its run ID; concurrent runs are separate. After fixing a failure, rerun the relevant spec and check the new result, within the user's requested verification scope.

For an existing interactive Chromium session, use the project's own `cypress tap` CLI. Query sessions, select the intended PID, and prefer `--json`. Capture the previous `startedAt` before requesting a rerun and wait for a new run identity before trusting its verdict. Bound polling: compilation failure can remain in `loading`. Read a completed spec's reporter view for failures. Monitoring alone does not authorize starting a spec or changing a live session's selected run.

The initial plugin supports Paseo 0.11.2 on the 0.11.x line, Cypress 16.x, and helper Node 22.18+ on the 22.x line or Node 24.x. An already-running uninstrumented batch invocation cannot be monitored through Tap. If a compatibility check fails, report the exact limitation and preserve project sources.
