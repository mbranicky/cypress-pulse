# Release verification

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
