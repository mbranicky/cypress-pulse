# 1.0 release readiness

Version **1.0.0** prepared on 2026-10-16 at the maintainer’s request. No version tag,
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
  triggers. Both jobs passed in the [verification run](https://github.com/mbranicky/cypress-pulse/actions/runs/38883186206)
  for implementation commit `9ac0219`.
- Typechecking and all 39 regression tests pass locally. The production artifact passed
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

## Publication status

- [Preparation PR #1](https://github.com/mbranicky/cypress-pulse/pull/1) is merged. Both main-branch jobs passed in the [verification run](https://github.com/mbranicky/cypress-pulse/actions/runs/38885222100).
- npm authentication is confirmed as `mbranicky`. No credentials are included in the source or artifact.
- The package, helper, dependency lock and current-version documentation now identify version 1.0.0. Historical entries keep their original versions.
- Publication, version tagging and a GitHub release remain pending explicit maintainer authorization.

## 1.0.0 artifact verification

- Typechecking and all 39 regression tests passed. Clean production packages passed all seven real Cypress integrations on Node 22.18.0 and 24.16.0.
- The exact retained tarball installed and reloaded with status `running` in an isolated Paseo 0.11.4 daemon. Its installed helper reports version 1.0.0. The temporary daemon was stopped after verification.
- The production dependency audit still reports zero known vulnerabilities.
- Local artifact: `work/release/cypress-pulse-1.0.0.tgz`; checksum and machine-readable evidence are saved alongside it. The tarball is ignored by Git and has not been uploaded to npm.
- SHA-256: `6b0d3c54ae4d8f89e4a52efbdec2474e56d64beaa7cca4867b08bf07f8344fa0`.
- CI for the version preparation is the final verification before merging; publication and tagging remain separate authorized steps.

## Before publication

1. Review and merge the version preparation, require its checks to pass, and inspect the final tarball and checksum. Keep the existing supported scope and documented development-only advisories in view.
2. Follow [the release procedure](RELEASING.md) to tag and publish the exact checked 1.0.0 artifact only after authorization.
3. Verify the exact npm version in a test Paseo daemon, then update the primary installation instructions to the published package.
4. Submit to the Paseo registry separately after published-artifact verification.
