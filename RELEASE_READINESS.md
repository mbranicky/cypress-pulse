# 1.0 release readiness

Preparation performed on 2026-10-16. The plugin remains **0.5.1**; no version tag,
GitHub release or npm publication has been created by this preparation.

## Completed

- Added public npm metadata and a publishable dependency shrinkwrap. Production
  installs contain the plugin and pinned TypeScript parser, without Cypress,
  webpack, React Native or other development dependencies.
- Added locked Git dependency preparation and a staged npm packaging command
  that omits Git's redundant preparation step. Package checks verify declared
  media, local imports, supported host imports, helper/package version agreement,
  source extraction, and both direct and npm-linked CLI startup.
- Extended CI to audit production dependencies and test the production artifact
  on Node 22.18.0 and 24.x. The workflow retains every-push-to-main and manual
  triggers. The new workflow still needs its first remote run after these changes
  are committed and pushed.
- Typechecking and regression tests pass locally. The production artifact passed
  all seven real Cypress integrations on Node 22.18.0 and 24.16.0: CommonJS, ESM,
  TypeScript, webpack/ts-loader, live outcomes and doubled screenshot dimensions.
- The production-only artifact loads with status `running` in a separate Paseo
  0.11.4 daemon. Skill installation, dashboard outcomes, retries, test source,
  full spec source, failure screenshots and generated spec-video RPCs work.
- A packaged helper run completed normally across an isolated plugin reload.
  The production collector was also verified directly against a native macOS
  Chrome open-mode session: retry-attempt logs, hook messages, source extraction,
  fresh reruns and rejection of reports from an older run. This direct collector
  check used Cypress's normal macOS session directory; the separate daemon's
  temporary home does not share that discovery directory.
- Regression coverage includes concurrent journals, interrupted processes,
  stale interactive reports and source/media containment. A new subprocess test
  verifies termination forwarding, child exit and interrupted-run recording.
- The production dependency audit reports zero known vulnerabilities. The full
  development tree reports 21 advisories (16 high, 5 moderate), involving React
  Native tooling and ts-loader's dependency chain. These tools are excluded from
  production installation; do not describe the entire development tree as clean.
  Forced React Native upgrades are deferred because the host API needs matching
  compatibility verification. Treat development tooling as trusted-input-only.
- Documented macOS release scope, Ubuntu batch coverage, unverified platforms,
  interactive log limits, agent-provider data disclosure and manual data cleanup.

## Issues fixed during preparation

- Fresh production installs could not compile a direct type dependency on
  `@getpaseo/client`. The handler now derives its API type through the supported
  plugin host contract.
- CLI startup silently did nothing through symlinked paths, including macOS
  temporary-directory aliases and npm executable links. Entry detection now
  compares the canonical file path, covered by a subprocess regression.
- Structurally malformed telemetry could hide a valid run. Records are checked
  before reduction; invalid records produce a notice while valid results remain
  available. A corrupt-record regression covers this behavior.

## Before the release

1. Commit/push this preparation and require the updated CI to pass on both Node
   versions. Review the final diff and package listing.
2. Confirm the documented supported scope and the treatment of development-only
   advisories. Broader platform or component-test support needs its own testing.
3. Authenticate the intended npm publishing account. `npm whoami` currently
   returns `ENEEDAUTH`; no credentials were added during preparation.
4. On the maintainer's explicit request, bump to 1.0.0, write its release notes,
   and repeat the package/version checks on that revision.
5. Follow [the release procedure](RELEASING.md) to tag and publish the exact checked
   artifact, then verify the exact npm version in Paseo. Registry submission is a
   separate publication step.
