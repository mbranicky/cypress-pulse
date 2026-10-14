# Cypress Pulse

Cypress Pulse shows Cypress run progress and failures alongside your agents in Paseo. Open its Explorer panel to see active runs, completed specs, test outcomes, retry counts, and failure details. A workspace header indicator keeps progress visible while you work elsewhere.

Batch runs use a companion launch helper that reads your existing Cypress configuration and adds reporting for that invocation. It preserves existing hooks and reporters. It does not add or edit files in the tested project's sources. Interactive Chromium sessions are observed through Cypress Tap.

Requires Paseo app and daemon 0.11.2 on the 0.11.x line, Cypress 16.x, and Node 22.18+ on the 22.x line or Node 24.x for the helper. The Cypress CLI and interactive session must use compatible versions. Press Install skill in the panel to link the supplied instructions into the host’s user-level agent folders. Existing skills belonging to another installation are skipped. New agent sessions can then use the skill to launch monitored runs.

Progress, failure text, and screenshot references stay on the daemon host in a separate Cypress Pulse state directory. No cloud account is needed. The plugin reads local run data and queries local Cypress sessions; it sends this information through Paseo to the connected client. Screenshots inside the Cypress project can be previewed.

Headless or headed batch runs must start through the helper to appear. Interactive monitoring currently covers Chromium-family browsers. Batch progress tracks completed specs because the total number of tests across unevaluated specs is not known in advance. The panel shows up to 300 test details per selected run, with failures first, while counts cover the full run.

The plugin keeps its helper and telemetry outside repositories. Helper versions remain available after a plugin reload or removal so running tests can finish. Tests themselves may still create their normal screenshots, videos, or reports according to the project's existing configuration.
