# Cypress Pulse

A standalone Cypress dashboard for Paseo. It has no dependency on Playwright Pulse and adds no reporting dependencies or configuration files to your tested projects.

## Requirements

| Component | Supported versions |
| --- | --- |
| Paseo app and daemon | `>=0.11.2 <0.12.0` |
| Project Cypress | `>=16.0.0 <17.0.0` |
| Helper Node.js | `^22.18.0 || ^24.0.0` |

## Setup

Install from GitHub:

```sh
paseo plugin install github:mbranicky/cypress-pulse
```

Or install a local development checkout:

```sh
npm ci
npm run check
paseo plugin install /absolute/path/to/cypress-pulse
```

Open **Cypress Pulse** from the Command Center in a workspace. Its panel lives in Explorer; a header indicator appears while runs are active and briefly after completion.

The plugin writes its dependency-free helper to `~/.local/share/cypress-pulse/cli.mjs`. To check a project's compatibility:

```sh
node ~/.local/share/cypress-pulse/cli.mjs doctor --project /absolute/path/to/project
```

Launch a monitored batch run:

```sh
node ~/.local/share/cypress-pulse/cli.mjs run --project /absolute/path/to/project -- --spec cypress/e2e/login.cy.ts --browser chrome
```

Use `--headed` after `--` for a visible browser. All arguments after `--` are Cypress run options, rather than a shell command. Retain the project's usual application startup, environment, and test selection. Supply helper `--config-file` when choosing an alternative Cypress configuration. An explicit reporter override is preserved; explicit reporter options must use a JSON object.

The helper creates an external wrapper that imports the existing configuration, composes its hooks, and delegates to its reporter. Neither project sources nor dependency manifests are edited. Normal test-generated artifacts still follow the existing Cypress configuration. Unsupported configuration behavior is an error rather than grounds to rewrite the project.

For interactive tests, start `cypress open` normally and choose a Chromium-family browser. The plugin uses the project's own `cypress tap` CLI to observe the session. No support-file instrumentation is required. At a monorepo root, interactive discovery requires a reachable Cypress installation or a previously observed batch run identifying the Cypress project.

## Agent skill

The repository includes [`skills/cypress-pulse/SKILL.md`](skills/cypress-pulse/SKILL.md). Install that folder into your agent's user-level skill directory, outside tested projects. The plugin does not silently install agent skills or change agent configuration.

## Behavior and limits

- Runs are independent; concurrent invocations do not replace one another.
- Batch progress counts completed specs. Test totals appear when Cypress provides them.
- Pending/skipped-only runs are displayed as empty, not as a successful verification.
- Failures retain their messages and stack text. Screenshots are associated with their spec, rather than guessed from filenames.
- Interactive reports are checked against session/run identity before and after reading them.
- The first five interactive failure messages are loaded automatically. Other failed tests have a Read failure action.
- An uninstrumented batch run already underway cannot be attached to this dashboard.
- Interactive monitoring currently supports Chromium browsers. There are no stop or rerun controls in this initial version.
- The current panel displays 30 recent runs and up to 300 test details per selected run. Telemetry files have a 32 MiB read limit; an exceeded limit produces a notice.

Local state lives at `~/.local/state/cypress-pulse` by default. `CYPRESS_PULSE_STATE_DIR` or the helper's `--state-dir` can override it; use the same location for daemon and helper. The helper's `show --run-id ID` command returns normalized JSON results for agents. Telemetry includes test titles, failure text, and artifact paths, so treat it with the same care as your test reports. It does not record a copy of project configuration or environment variables.

## Development

```sh
npm ci
npm run check
npm run test:integration
```

Unit tests cover normalization, retries, empty runs, interruption, runtime gates, session targeting, and report freshness. Real Cypress integration tests use isolated temporary projects to check CommonJS, ESM, and TypeScript configs, asynchronous hooks, tasks, reporter preservation, and unchanged source checksums.

Production collectors and launch helper use Node's standard library. Client modules use Paseo's host-provided SDK, React Native, Zod, and TanStack Query. Cypress is a development-only dependency for isolated compatibility tests; monitored projects use their existing installation.

## Verified initial build

The initial build was checked with Paseo 0.11.2 on macOS, Cypress 16.1.1 across CommonJS/ESM/TypeScript configuration formats, and Cypress 16.0.0 for the minimum-version batch path. Live Electron interactive runs, reruns, failure messages, and batch screenshot previews were verified in the Paseo desktop app. Node 22.18.0 and 24.16.0 were used during compatibility investigation.

Windows, Linux, and mobile UI behavior are not yet verified. Component testing is not part of the initial compatibility matrix. Version ranges are enforced, but they are not a claim that every possible project plugin/configuration combination has been tested.

MIT licensed.
