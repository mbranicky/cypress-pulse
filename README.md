# Cypress Pulse

Watch Cypress tests from Paseo’s Explorer panel while your agent works. Follow live spec progress, review failures, and open screenshots without leaving the workspace. A header indicator keeps the run visible when the panel is closed.

Standalone plugin, with no dependency on Playwright Pulse. Your tested projects keep their existing sources, configuration, and dependencies.

<p>
  <img src="assets/running.png" width="360" alt="Cypress Pulse showing a live run with one of two specs completed">
  <img src="assets/failure.png" width="360" alt="Completed demo run with a focused failure message and test results">
</p>

These are real Paseo desktop captures of an isolated example storefront. The final assertion deliberately fails to demonstrate failure reporting; the images are cropped to the plugin panel.

<details>
<summary>Light theme example</summary>

<img src="assets/light.png" width="400" alt="Cypress Pulse failure details in Paseo’s Light theme">

</details>

## Get started

```sh
paseo plugin install github:mbranicky/cypress-pulse
```

1. Open a project workspace in Paseo, then choose **Open Cypress Pulse** in the Command Center. The panel opens in Explorer.
2. Click **Install skill** in the panel. It adds user-level skill links on the daemon host in `~/.agents/skills`, `~/.claude/skills`, and `~/.codex/skills`.
3. Start a new agent session and ask it to use the **cypress-pulse** skill when running your tests.

For example: “Use Cypress Pulse to run the checkout tests, keeping this project’s usual startup and test settings.”

<img src="assets/skill-setup.png" width="400" alt="The Install skill button and the user-level folders it will write to">

The installer runs only when clicked. Existing files or links owned by another installation are skipped. Linked instructions follow plugin updates; if Paseo moves its installed copy, the panel offers **Update skill**. **Agent setup** shows the current status and folders at any time.

## Requirements

| Component            | Supported versions |
| -------------------- | ------------------ | --- | -------- |
| Paseo app and daemon | `>=0.11.2 <0.12.0` |
| Project Cypress      | `>=16.0.0 <17.0.0` |
| Helper Node.js       | `^22.18.0          |     | ^24.0.0` |

## Using the panel

- **Recent runs** switches between independent executions, including concurrent runs in the workspace.
- The summary shows browser, run mode, elapsed time, completed specs, outcomes, and retries. Batch progress counts specs because unevaluated specs do not yet provide a total test count.
- Failures appear first. Expand a test to see its file and failure message; **Stack trace** and **Copy error** provide more detail. Use **Failed** to focus the list.
- **Screenshots** opens Cypress-generated images. Batch screenshots belong to a spec; the plugin does not guess which test owns an image from its filename.
- Interactive runs offer **Spec report** after completion. The first five failure messages load automatically; additional failures have **Read failure**.

Pending/skipped-only executions are marked **No executed tests**, so they cannot be mistaken for a successful verification.

## Running tests yourself

The plugin installs a dependency-free helper at `~/.local/share/cypress-pulse/cli.mjs`. Check a project:

```sh
node ~/.local/share/cypress-pulse/cli.mjs doctor --project /absolute/path/to/project
```

Launch a monitored batch run:

```sh
node ~/.local/share/cypress-pulse/cli.mjs run --project /absolute/path/to/project -- --spec cypress/e2e/checkout.cy.ts --browser chrome
```

Add `--headed` after `--` for a visible browser. Arguments after `--` are Cypress run options. Keep the project’s usual application startup, environment, and test selection. Use helper `--config-file` for an alternative configuration. Reporter overrides are preserved; explicit reporter options must be a JSON object.

The helper imports the project’s existing configuration through a temporary wrapper outside the repository, composes its hooks, and delegates to its reporter. It never edits project configuration or dependency manifests. Tests still generate their normal artifacts according to the existing Cypress configuration.

For interactive tests, start **cypress open** normally and choose a Chromium-family browser. The plugin observes the session through the project’s own **cypress tap** CLI; no support-file instrumentation is needed. At a monorepo root, discovery needs a reachable Cypress installation or a previously observed batch run identifying the Cypress project.

## Limits and local data

An already running, uninstrumented batch invocation cannot be attached. Interactive monitoring currently supports Chromium-family browsers. This version observes tests; it has no stop or rerun controls.

The panel lists 30 recent runs and up to 300 test details for the selected run, with failures first. Counts cover the full run. Telemetry reads have a 32 MiB limit; exceeding it produces a notice. Interactive reports are checked against the session and run identity before and after reading.

Data stays on the daemon host in `~/.local/state/cypress-pulse`. `CYPRESS_PULSE_STATE_DIR` or helper `--state-dir` can override it; the daemon and helper must use the same location. It includes test titles, failure text, and artifact paths, without copying project configuration or environment variables. The helper’s `show --run-id ID` command returns normalized JSON for agents. No cloud account is required.

## Development and verification

```sh
npm ci
npm run check
npm run test:integration
paseo plugin install /absolute/path/to/cypress-pulse
```

After changes, typecheck and run `paseo plugin reload cypress-pulse`.

Unit tests cover reporting, retries, empty runs, interruption, runtime gates, session targeting, report freshness, and skill installation with ownership protection. Integration tests run real Cypress against isolated CommonJS, ESM, and TypeScript configurations, checking asynchronous hooks, tasks, reporter preservation, and unchanged source checksums.

Verified with Paseo 0.11.2 on macOS, Cypress 16.1.1, and Cypress 16.0.0 for the minimum-version batch path. Live interactive Electron sessions, reruns, failure messages, batch screenshot previews, and one-click skill installation, narrow Explorer layouts, and Ghostty/Light themes were checked in the desktop app. Compatibility checks used Node 22.18.0 and 24.16.0.

Windows, Linux, and mobile clients are not yet verified. Component tests are outside the current compatibility matrix. Supported ranges are enforced; unusual project plugins and configurations may need further compatibility testing.

Collectors, installer, and launch helper use Node’s standard library. The client uses Paseo’s host-provided modules. Cypress is a development-only dependency; monitored projects use their existing installation.

[MIT license](LICENSE).
