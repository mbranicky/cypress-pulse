---
name: cypress-pulse
description: Run Cypress 16 tests with the Cypress Pulse Paseo dashboard, using interactive open mode or monitored batch mode as requested; preserve the tested project's sources and configuration.
---

# Cypress Pulse

Choose the mode from the user's request before launching tests:

- **UI mode, interactive, or Cypress open:** use the project's own `cypress open` with its original configuration and a Chromium-family browser. Follow the interactive workflow below.
- **Batch or headless:** use the Pulse helper below. For an explicitly requested **headed batch**, add `--headed`. A visible batch browser still uses run-mode behavior, retries, and lifecycle; do not substitute it for a request for interactive UI mode.

Retain the project's established application startup, required environment, and spec selection. Inspect its scripts to determine those prerequisites; do not blindly replace a script that also starts services. Resolve the project's installed Cypress CLI, without downloading a different version. If an invocation depends on behavior the helper cannot preserve, report that incompatibility rather than changing the project.

Do not add a reporter dependency, alter Cypress configuration/support files, rewrite package scripts, install dependencies in the tested project, or copy its test sources elsewhere for monitoring. The plugin project itself is separate from the tested project.

## Interactive UI

Query sessions through the project's own `cypress tap` CLI. Reuse an appropriate session or, when the user requests running tests and none is suitable, start the project's normal `cypress open` command. For example, from a project with a local Cypress binary:

```sh
./node_modules/.bin/cypress open --e2e --browser chrome
```

Preserve any required script, environment, testing type, or alternative configuration. Keep the session alive while using Tap from another terminal. Use `tap specs` to find valid spec paths, then `tap run` to run the requested specs, selecting the intended session PID explicitly. Consult that installed CLI's `--help` for options and prefer `--json` results. Run multiple selected specs sequentially and collect each result before starting the next one; the panel observes the session's current execution.

Capture the previous `startedAt` before requesting a rerun and wait for a new run identity before trusting its verdict. Bound polling: compilation failure can remain in `loading`. Read a completed spec's reporter view for failures. Monitoring alone does not authorize starting a spec or changing a live session's selected run.

## Monitored batch

Use the dependency-free helper installed by the local Paseo plugin:

```sh
node ~/.local/share/cypress-pulse/cli.mjs doctor --project /absolute/project/path
node ~/.local/share/cypress-pulse/cli.mjs run --project /absolute/project/path -- --spec cypress/e2e/example.cy.ts --browser chrome
```

The helper prints a run ID on stderr and preserves Cypress's exit code. Pass only Cypress run options after `--`. Use helper `--config-file` for an alternative configuration. Existing configuration hooks and reporters are composed for this invocation through files outside the project. The configuration process keeps the original config directory as its working directory, including during imports and preprocessing. If the helper is missing, explain that the Paseo Cypress Pulse plugin needs to be running.

When the user requests higher-resolution failure screenshots, add helper `--screenshot-scale 2` **before** `--`, and use Chrome, Chromium, or Edge. It changes device pixel ratio for that invocation and preserves the configured Cypress viewport. Leave it off for ordinary runs to use the saved host default; use `--screenshot-scale 1` to explicitly request standard resolution. Pixel ratio can affect visual assertions. It does not change screenshots from an already-open interactive session. Never edit support/config files to enable it.

The plugin's **Capture settings** apply defaults for future helper runs: failure screenshots, screenshot scale, video recording, and compression. Explicit invocation environment and Cypress `--config` overrides take precedence. For requested video capture, use `--config video=true` after `--` (merge it with existing config overrides), optionally `videoCompression=32` for smaller files. Cypress records one MP4 per spec file in run mode, including headed runs; it does not record in open mode. Explain that limitation without substituting batch for a request for interactive UI mode. Never edit project files to enable capture.

For machine-readable results:

```sh
node ~/.local/share/cypress-pulse/cli.mjs show --run-id RUN_ID
```

Read result counts and failure details. A run with no passed or failed tests is empty verification, even if Cypress exits successfully. Attribute each result to its run ID; concurrent runs are separate. After fixing a failure, rerun the relevant spec and check the new result, within the user's requested verification scope. A compilation error means tests did not execute; report it separately from assertion failures. Do not install loaders or rewrite project configuration to work around a monitoring failure.

The plugin supports Paseo `>=0.11.2 <0.14.0` (0.11.2+, 0.12.x and 0.13.x), Cypress 16.x, and helper Node 22.18+ on the 22.x line or Node 24.x. An already-running uninstrumented batch invocation cannot be monitored through Tap. If a compatibility check fails, report the exact limitation and preserve project sources.
