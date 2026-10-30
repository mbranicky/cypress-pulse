# Release verification

## 1.3.0

Paseo 0.14 compatibility release. The manifest now accepts `>=0.11.2 <0.15.0`;
Cypress 16, helper Node requirements, production dependencies and dashboard behavior
are unchanged. Version, installation examples and current compatibility claims are
synchronized. Historical release evidence below remains unchanged.

### Compatibility evidence

- Verified the installed macOS app and connected daemon are both Paseo 0.14.0.
- Confirmed the released 1.2.1 manifest is rejected on 0.14. A temporary range-only
  copy passed activation, helper setup, owned skill installation, reload and history
  RPC checks in a private 0.14 daemon. No runtime API adaptation was required.
- Typechecked unchanged source against the exact 0.14.0 plugin/client/protocol SDKs.
  Final checks passed for locked minimum 0.11.2 and isolated 0.12.0, 0.13.0 and
  0.14.0 SDKs. Both existing required CI Node jobs now include the new SDK check.

### Completed candidate checks

- Both workflows passed actionlint 1.7.12 validation.
- Typechecking and all 44 regression tests passed on Node 22.18.0 and 24.16.0.
- All 14 publication-gate tests passed on both Node lines using npm 11.13.0.
- Production-only package checks and all seven real Cypress integrations passed
  on both Node lines. The packaged helper preserves project sources/configuration.
- The exact tarball loaded and reloaded in an isolated Paseo 0.14 daemon; helper
  doctor reported 1.3.0. Batch progress, intentional failure/retry outcomes, reload
  during a run, settings persistence, source snippets/full source, screenshot and
  video RPCs passed. Two interactive Cypress runs had distinct fresh run identities;
  retry-attempt and hook command logs were attributed correctly.
- Verified the actual macOS Paseo 0.14 client: workspace panel, Explorer command,
  capture settings, numbered test source, full-file source and screenshot gallery.
  Local evidence is in `work/release-1.3.0/ui/`. Existing packaged screenshots remain
  applicable because no plugin GUI code changed.
- The already-enabled local directory installation was reloaded successfully,
  recovering its prior compatibility failure. Its installation path and enabled
  state, existing capture settings and unrelated workspaces were preserved. The
  previous foreground workspace was restored; the verification workspace remains
  available for maintainer testing. Only the isolated test daemon/browser were stopped.
- Production dependency audit: zero advisories. Full audit: three development-only
  findings (`fast-uri` and `qs`, moderate; `systeminformation`, high). The high finding
  concerns Windows `services()` command injection; this verification used macOS and
  does not exercise that API. None of these packages ships in the production artifact.
  Development dependency upgrades are outside this compatibility change.

### Exact candidate

- Package: `paseo-cypress-pulse-1.3.0.tgz`, 3,566,493 bytes, 56 files.
- SHA-256: `d41c5b9190b4a0c91eab2fcc2f338719f90431c2c9a40a6c081d4e68fc1fdee0`.
- Node 22, Node 24 and a fresh repack produced byte-identical tarballs.
- Package, checksum and runtime evidence: `work/release-1.3.0/`.

The PR and its GitHub checks are the next gate. Merge, green main checks, tagging,
GitHub Release creation and npm publication require the maintainer's next instruction.
No release tag or publication was created during preparation.

## 1.2.1

Release-infrastructure update: a manual **Publish to npm** workflow, with version
and installation references synchronized for 1.2.1. Dashboard behavior, collector
behavior, production dependencies and supported Paseo/Cypress/Node ranges are
unchanged from 1.2.0.

### Completed local checks

- Both workflows passed actionlint 1.7.12 syntax/expression validation.
- All 14 publication-gate tests passed on Node 22.18.0 and Node 24.16.0. Tests cover
  modified/missing/extra package files, unsafe archives, version/input validation,
  failed or incomplete main checks, unpublished releases, duplicate npm versions,
  latest downgrades, registry integrity and accepted-but-not-visible publications.
- Reproduced npm 10.9.3 executing a prepare script despite the ignore-scripts
  dry-run flag. The verifier now rejects npm below 11.5.1 before reading release
  source; both CI Node jobs use isolated npm 11.5.1 for these tests.
- Read-only preflight passed against the real published 1.2.0 GitHub Release,
  checking its main build, tag, source contents, release assets and checksum.
- Post-publication verification passed against the existing npm 1.1.1 package:
  metadata, SHA-1/SHA-512 integrity and byte-identical downloaded tarball. No new
  npm version was published by these checks.
- All 44 plugin regressions and the minimum-SDK check passed on both Node lines.
  Exact Paseo 0.12.0 and 0.13.0 SDK checks also passed.
- Production-only packages passed all 44 installed-module regressions and seven
  real Cypress integrations on both Node lines. The resulting tarballs are
  byte-identical and match all 56 packaged source files, accounting for the
  documented npm-manifest transformation.
- The exact 1.2.1 tarball loaded and reloaded in isolated Paseo 0.13.0; helper
  doctor reported 1.2.1. Owned skill setup, dashboard/history filtering and useful
  missing-project errors passed. The private daemon was stopped; the user's
  active plugin was not changed.
- GitHub environment `npm` was configured with a single allowed deployment branch,
  `main`, and verified through the API. No secrets were added.
- Local Markdown links and whitespace checks passed.

### Artifact and remaining gates

- Package: `paseo-cypress-pulse-1.2.1.tgz`, 3,566,410 bytes, 56 files.
- SHA-256: `fa233fc7898d66975f1cf04e927aae544eda26e67b26d3f1fdf353917ca724b1`.
- Verified package, checksum and local evidence: `work/release-1.2.1/`.

PR review, merge and both required main checks precede any 1.2.1 tag or release.
The manual workflow becomes available on GitHub after merging it into main.
Before actual publication, configure npm's trusted publisher for
`mbranicky/cypress-pulse`, workflow `publish.yml`, environment `npm`, allowing direct
`npm publish`. OIDC authentication and real publication cannot be verified until
that external trust is configured and publication is explicitly requested.
The workflow is not dispatched and no npm publication occurs during PR preparation.

## 1.2.0

Paseo 0.13 compatibility release. The supported app and daemon range is
`>=0.11.2 <0.14.0`; Cypress 16 end-to-end and helper Node 22.18+/24 requirements
remain unchanged. The locked minimum SDK stays at 0.11.2. Historical verification
records below describe their original versions.

### Compatibility and source checks

- The released 1.1.1 artifact was rejected by an isolated Paseo 0.13.0 daemon
  because its manifest required `<0.13.0`.
- The unchanged client/server/shared implementation typechecked against exact
  Paseo 0.13.0. Widening only the manifest in a temporary copy allowed activation,
  reload, helper installation and dashboard RPCs on 0.13.0.
- The final source typechecks against locked Paseo 0.11.2, exact 0.12.0 and exact
  0.13.0. Both required CI Node jobs include the two isolated SDK checks.
- All 44 regression tests passed locally on Node 22.18.0 and Node 24.16.0.
- A clean production-only package passed installed-module regressions, CLI,
  source parsing and synchronized release-documentation checks.
- Production audit: zero advisories. The unchanged development dependency tree
  currently reports one moderate advisory in transitive `fast-uri`, used by
  development tooling and excluded from the production artifact.

### Final package and live verification

- The exact production package passed all 44 installed-module regressions and
  seven real Cypress integrations on Node 22.18.0 and Node 24.16.0. The tarballs
  are byte-identical. All 56 packaged files match the finalized source (with the
  documented removal of Git-only dependency preparation from the npm manifest).
- Integration checks preserved CJS, ESM and TypeScript project sources, hooks,
  tasks and reporters, including named webpack loader resolution. Live partial
  results and retries passed; optional 2× screenshots increased failure PNGs
  from 1280×633 to 2560×1266.
- The exact tarball loaded/reloaded in isolated Paseo 0.13.0. Helper doctor
  reported 1.2.0. Skill installation, settings persistence, batch collection,
  reload during an active helper, source snippets/full source, screenshot/video
  RPC previews, interactive retry/hook command logs and fresh rerun identities
  passed. The private daemon and test browser were stopped afterwards.
- The installed Paseo 0.13 desktop rendered the Explorer panel with saved runs,
  grouped specs, filters, search, failure details and button icons. Its capture
  settings screen was accessible. The user's original disabled plugin state was
  restored; existing project sources and settings were preserved.
- Package verification rejected a deliberately stale Paseo range in the bundled
  skill. Local Markdown links resolve and the diff passes whitespace checks.
- Artifact: `paseo-cypress-pulse-1.2.0.tgz`, 3,563,947 bytes, 56 files.
- SHA-256: `dc8ce42a6dc3fe96da4c37be59bb15594eb87296638067378f2a887601021c71`.
- Exact package, checksum, publication preview and live verification records are
  under `work/release-1.2.0/` (ignored by Git).

### Distribution sequence

Finalize all local verification and the exact package before opening the PR.
After review and merge, require both Node jobs on `main` and verify the merged
source matches the candidate before creating `paseo-cypress-pulse-v1.2.0`.
The GitHub release and npm publication must use the tested package and checksum.
Prepare npm publication without executing it until the maintainer authorizes it.
Post-publication verification belongs in GitHub release notes/local records;
corrections to the package require a new version.

## 1.1.1

Documentation hotfix for the README bundled in the npm artifact. No dashboard,
collector, Cypress configuration, dependency or compatibility changes are included.
The supported scope below remains unchanged. See [release notes](RELEASE_NOTES.md#111).

Package, shrinkwrap and helper versions, README/OVERVIEW version markers, install
and update commands, Git release reference and release notes are finalized for
1.1.1 before tagging or publishing. Historical 1.1.0 evidence below is retained
as historical evidence, not presented as verification of a new artifact.

### Completed checks

- Both Paseo SDK typechecks passed (locked 0.11.2 and exact 0.12.0).
- All 44 regression tests passed locally on Node 22.18.0 and Node 24.16.0.
- Production-only package installation passed all 44 installed-module regressions
  and seven real Cypress integrations, including live partial outcomes, preserved
  webpack loader resolution and 2× screenshot dimensions.
- A deliberate stale README installation command was rejected by the new package
  check. Current install/update commands, Git reference, version markers and first
  release-note entry match 1.1.1 in the actual tarball.
- The exact tarball loaded and reloaded in an isolated Paseo 0.12.0 daemon. Helper
  doctor reported 1.1.1; owned skill installation, workspace history filtering,
  direct access errors and preservation of saved journals passed. The test daemon
  was stopped; the user's active Paseo installation was not changed.
- Repacking produced identical bytes. The file list and screenshots match 1.1.0;
  only the README, overview, release notes, release procedure, package/shrinkwrap
  versions and helper version differ. No dependency versions changed.
- Production audit: zero advisories. The unchanged development tree has 21
  advisories (16 high, 5 moderate), as documented for 1.1.0 below.
- Local Markdown file links resolve, and the final diff passes whitespace checks.

### Verified artifact

- File: `paseo-cypress-pulse-1.1.1.tgz` — 3,563,717 bytes, 56 files.
- SHA-256: `01352650849a73c02b8174a318d5897bf4cca04b145b4853a9a71e6f34c7adb5`.
- Exact tested artifact, checksum and verification records:
  `work/release-1.1.1/` (ignored by Git).

### Remaining distribution steps

The final merged revision must pass both required Node CI jobs and match this
artifact before tagging or publication. Tagging, npm publication and the GitHub
release require maintainer authorization. No release tag or npm publication is
created by release preparation. Update the separate Paseo catalog listing to
1.1.1 after publication; the dated 1.1.0 distribution record below is historical.
Post-publication evidence belongs in release notes on GitHub or local verification
records, without changing the tagged source or publishing over the same version.

## 1.1.0 — published 2026-10-19

**[paseo-cypress-pulse@1.1.0](https://www.npmjs.com/package/paseo-cypress-pulse/v/1.1.0)** was published on npmjs.com.
The [GitHub Release](https://github.com/mbranicky/cypress-pulse/releases/tag/paseo-cypress-pulse-v1.1.0)
uses tag `paseo-cypress-pulse-v1.1.0` at merged commit `fb1580162407ade0154b56c2dbb08f011c7c0941`.
Its assets include the verified npm tarball and `SHA256SUMS`.

The unpublished 1.0.1 work and the superseded 1.2.0 candidate were incorporated
into 1.1.0. Neither candidate was published to npm or given a release tag.
See [release notes](RELEASE_NOTES.md#110) for the changes.

### Supported scope

- Paseo app and daemon `>=0.11.2 <0.13.0`, including Paseo 0.12.0.
- Cypress `>=16.0.0 <17.0.0` end-to-end tests.
- Helper Node `^22.18.0 || ^24.0.0`.
- macOS desktop verification; Ubuntu CI verifies batch operation on both Node lines.
  Windows, Linux desktop, mobile clients and component testing remain unverified.
- Interactive command logs require the original Chromium-family Cypress session.
  Batch per-test command logs and arbitrary browser-console capture are unavailable.

### Completed checks

- Client, server and shared code typechecked against the locked Paseo 0.11.2 SDK
  and the exact Paseo 0.12.0 plugin/client/protocol SDKs.
- All **44 regression tests** and **seven real Cypress integrations** passed,
  including CommonJS/ESM/TypeScript configuration preservation, named webpack
  loaders, live partial outcomes and optional doubled screenshot dimensions.
- Both required CI jobs, Node 22.18.0 and Node 24.x, passed for the
  [release candidate](https://github.com/mbranicky/cypress-pulse/actions/runs/39262730114)
  and the [merged release source](https://github.com/mbranicky/cypress-pulse/actions/runs/39263340795).
- Production-only installation, imports, declared media, source parsing,
  executable links and package/helper/shrinkwrap version agreement were verified.
  The package contains only the plugin and pinned TypeScript runtime dependency;
  Cypress, webpack and host development libraries are excluded from production dependencies.
- Repeated packing produced byte-identical tarballs. Every packaged file matched
  the merged source, except the documented removal of Git's preparation command
  from the npm manifest.
- The exact 1.1.0 artifact loaded and reloaded in an isolated Paseo 0.12.0 daemon.
  Helper doctor reported 1.1.0, and dashboard/history RPCs verified unavailable-project
  exclusions, useful direct-access errors and retained saved journals.
- The feature-equivalent candidate before the numbering correction passed real
  batch collection, settings persistence, owned skill installation, reload during
  an active helper run, test/full-file source, screenshot and video RPC checks.
  Its packed interactive collector passed retry/hook logs, source snippets,
  fresh reruns and stale-report rejection. Artifact comparison confirmed that only
  version and release files changed for the numbering correction.
- After publication, a **fresh `npm:paseo-cypress-pulse@1.1.0` installation** through
  Paseo succeeded in an isolated 0.12.0 daemon. Activation, helper version, skill
  installation and reload passed. Temporary test daemons and sessions were stopped.
- The registry download's SHA-256, SHA-1 and npm integrity matched the tested
  tarball. Production audit at publication: **zero advisories**. The development
  tree retained **21 advisories (16 high, 5 moderate)** in React Native tooling
  and ts-loader's dependency chain. These development tools are excluded from
  production installation; the full development tree is not described as clean.

### Published artifact

- File: `paseo-cypress-pulse-1.1.0.tgz` — 3,562,865 bytes, 56 files.
- SHA-256: `50239be269b9b94903c73aacec1227822d453780da5f4fd5d115178ced78ae1a`.
- SHA-1: `a1b2645e6b47710c5ead84dcdf29bcbf2a75fe3b`.
- The tarball and checksum are attached to the GitHub Release. Local verification
  evidence is retained under `work/release-1.1.0/`, which is ignored by Git.

### Distribution follow-up

npm publication and the GitHub Release are complete. The original
[Paseo catalog submission #556](https://github.com/getpaseo/plugins/pull/556) was
merged on 2026-10-16. As checked on 2026-10-19, the
[catalog record](https://github.com/getpaseo/plugins/blob/main/plugins/mbranicky/cypress-pulse.json)
still pins **1.0.0**; updating that separate listing to **1.1.0** remains necessary
for catalog users to receive Paseo 0.12 support. Direct npm installation already
provides 1.1.0.

## Earlier stable release

[Version 1.0.0](https://github.com/mbranicky/cypress-pulse/releases/tag/paseo-cypress-pulse-v1.0.0)
was published on 2026-10-16, with 39 regression tests, seven Cypress integrations
and isolated Paseo 0.11.4 installation checks. Its historical compatibility range
was `>=0.11.2 <0.12.0`; it does not support Paseo 0.12. The obsolete `v1.0.0` tag
was deleted at the maintainer's request; the package-prefixed release tag remains.

Future releases follow [the release procedure](RELEASING.md). Version changes and
publication require explicit maintainer authorization; routine documentation
updates keep the current package version.
