# Release procedure

Change the version only after the maintainer explicitly requests it. Preparing or
verifying a release does not publish it. npm publication is a separate action.

## Release scope

The current source targets Cypress end-to-end tests on macOS desktop with
Paseo app and daemon `>=0.11.2 <0.14.0`, Cypress `>=16.0.0 <17.0.0`, and helper
Node `^22.18.0 || ^24.0.0`. Ubuntu CI verifies the batch helper and filesystem
logic on both supported Node lines. Linux desktop, Windows, mobile clients and
component testing remain unverified. Do not describe CI coverage as desktop
verification on those platforms.

Interactive command logs require the original live Chromium-family session;
batch command logs and arbitrary browser-console capture are unavailable.
Screenshots and videos retain the documented preview limits. No stop/rerun
controls are included in this release.

## Before changing the version

1. Require green typechecking, unit tests and package integration checks on both
   CI Node versions. Run locally with Chrome installed:

   ```sh
   npm ci
   npm run check
   npm exec --yes --package=npm@11.5.1 -- npm run test:publishing
   npm run typecheck:paseo-012
   npm run typecheck:paseo-013
   npm run test:package -- --integration --output work/release
   npm audit --omit=dev
   ```

   On Linux, run the package integration check under `xvfb-run --auto-servernum`.
   The package check executes Git's production dependency preparation, packs and
   installs the npm artifact in a temporary directory, verifies the source parser
   and CLI, and runs regressions against installed modules. Integration tests use
   that installed helper against isolated Cypress projects. Tested projects do
   not receive monitoring packages or source/configuration edits.

2. Review the full dependency audit. Production advisories must be resolved or
   explicitly assessed before release. Development-only findings also need review;
   do not force a React Native major upgrade independently of Paseo's host API.

3. Install the packed plugin in a separate test daemon, using the same supported
   Paseo line, and require `running` without load errors. Exercise skill install,
   batch and interactive collection, source snippets, full-file preview, logs,
   screenshot/video preview and saved settings. Verify reload while a helper run
   is active, session reruns and stale-report rejection. Preserve the user's active
   installation and settings. A directory install of an extracted, production-only
   artifact verifies packaging before npm publication; after publishing, verify
   installation of the exact npm version as well.

4. Check README, OVERVIEW, release notes, screenshots, supported-version claims,
   file-access limits and local-data disclosures. Review all packaged files for
   private project data. Confirm a clean checkout can reproduce the artifact.

## Version and artifact

When the maintainer requests the version change, update `package.json`,
`npm-shrinkwrap.json`, `server/environment.mjs`, README and OVERVIEW together, and
add the release entry to RELEASE_NOTES. Finalize README installation/update commands
and the Git release reference for the new version at this point. Use durable wording
such as "Install version X" rather than publication-status labels that would require
an edit after publishing. Keep historical release entries and verification evidence
at their original versions. Repeat the checks above on that revision.

All code and documentation must be complete before opening the release PR. Review
and merge that PR, require both CI Node jobs to pass on the final merged revision,
and verify that the exact tested tarball matches that revision before tagging or
publishing. If review changes any packaged file, repeat package verification and
replace the candidate artifact before proceeding.

Create the release artifact with:

```sh
npm run pack:release
```

It writes `work/release/paseo-cypress-pulse-VERSION.tgz`. To keep the exact tarball that
passed package integration checks, use
`npm run test:package -- --integration --output work/release` instead. This stages the npm manifest
without changing the source checkout: Git retains the locked
`npm ci --omit=dev --ignore-scripts` preparation command; the npm artifact omits
that command because npm already installs production dependencies. Use this
artifact for publication rather than publishing directly from the checkout.
`npm-shrinkwrap.json` is shipped and fixes installed dependency versions and
integrities. Paseo supplies its host libraries; Cypress and webpack are excluded
from production dependencies.

Inspect the artifact and test the intended npm account before publishing. The
package name is `paseo-cypress-pulse`, public, MIT, with repository ownership
`mbranicky/cypress-pulse`. Confirm publish rights and npm's current authentication
requirements. Do not put npm tokens in source or documentation.

## Publish and verify

Tagging and publication are the final release steps, after all code, documentation,
PR review, merge and verification are complete. They require explicit maintainer
authorization. Create the matching version tag on the verified merged revision,
then publish a GitHub Release with short release notes, installation and update
commands, links to verification runs and the merge commit, and the tested tarball
plus `SHA256SUMS`. GitHub provides the source ZIP and tar.gz, making four assets in
the release UI. Save the release as published unless a draft is explicitly requested.

### Manual GitHub Actions publication

The **Publish to npm** workflow (`.github/workflows/publish.yml`) runs only through
**Run workflow**, not on a push, PR, tag or GitHub Release event. It executes trusted
publishing tools from `main` and publishes the existing release asset; it does not
rebuild or run lifecycle scripts from the selected release. Node 24 and npm 11.5.1+
provide OIDC authentication. No `NPM_TOKEN` secret or interactive npm login is needed
inside the workflow.

The verifier also enforces npm 11.5.1+ when invoked directly. npm 10.9.3 was
reproduced executing `prepare` during `npm pack --dry-run --ignore-scripts`;
npm 11.5.1 and the publishing runtime suppress it correctly. Both Node CI jobs
therefore run publication tests using an isolated npm 11.5.1 CLI. The plugin's
minimum Node checks and normal package integrations keep their original runtime.

Configure these once before the first publication:

1. In GitHub **Settings → Environments**, create `npm`. Under **Deployment branches
   and tags**, choose **Selected branches and tags** and add only the branch `main`.
   This restriction is required: the npm trust must not allow a modified workflow
   on an arbitrary feature branch to publish. An additional required reviewer is
   optional; the manual publish selection is already an explicit publishing action.
2. On npmjs.com, open **paseo-cypress-pulse → Settings → Trusted publishing** and add
   a GitHub Actions publisher with these exact values:

   | Field | Value |
   | --- | --- |
   | Organization or user | `mbranicky` |
   | Repository | `cypress-pulse` |
   | Workflow filename | `publish.yml` |
   | Environment name | `npm` |
   | Allowed action | Enable direct `npm publish` |

   Configure trust when ready to publish: npm currently requires the first
   successful publication within two days of creating a trusted publisher.
   See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

After this workflow is merged into `main`:

1. Publish the verified GitHub Release with its package and checksum assets.
2. Open **Actions → Publish to npm → Run workflow**, choose branch `main`, enter
   the plain version (for example `1.2.1`) and leave mode at `dry-run`.
3. Review the successful run summary, which links the release, green main build
   and merge commit and records the artifact checksum.
4. Run it again with the same version and mode `publish` to publish that exact
   package to npmjs.com. Publication runs are serialized and never auto-retried.
5. The workflow waits for npm metadata and verifies registry integrity and the
   downloaded package against the release asset. If npm accepted publication but
   verification reports processing, use mode `verify` later. Do not repeat
   `publish`, rerun a publish job, or submit the package again.

The selected version must have a stable published release, a tag reachable from
`main`, and both required Node jobs green in the latest main Tests run for that
commit. All packaged files must match the tag, with only the documented removal
of Git dependency preparation from the npm manifest. `dry-run` and `publish`
reject versions already on npm and versions that would move `latest` backwards.
`verify` permits checking an existing version even after a newer one is released.
The workflow can select an earlier release such as 1.2.0 if these conditions hold;
the version need not equal the package version on current `main`.

For terminal publication, the same exact-artifact rule applies:

```sh
npm publish work/release/paseo-cypress-pulse-VERSION.tgz --ignore-scripts --access public --registry=https://registry.npmjs.org/
```

After npm publication, install `npm:paseo-cypress-pulse@VERSION` in a test Paseo
daemon and verify its contributions. Record post-publication evidence outside the immutable
artifact, for example in GitHub release notes and local verification records.
Do not follow publication with documentation edits intended for the same version.
Any subsequent code or documentation correction belongs to a new version, with
explicit maintainer authorization; never move a release tag or try to replace a
published npm version.
If verification fails, deprecate the affected npm version with a clear explanation;
fix it in a new version rather than attempting to replace the same version.

The Paseo registry submission is separate. Submit the public package/version via
the [official submission form](https://github.com/getpaseo/plugins/issues/new?template=submit-plugin.yml)
after artifact verification. The registry reviews and pins an approved artifact.
See [Paseo publishing requirements](https://paseo.sh/docs/plugins/publishing.md).

## Data retention and removal

The plugin shows 30 recent runs and scans the 100 most recently modified batch run
directories. These are display/read limits, not automatic deletion. Completed run
journals remain under `~/.local/state/cypress-pulse/runs` (or the configured state
directory); helper versions remain under `~/.local/share/cypress-pulse/runtime`
so an update does not remove code used by active runs. Screenshots and videos
remain in Cypress's configured artifact folders.

For manual cleanup, wait until all helper runs have exited and disable the plugin
before deleting unwanted completed run directories. Keep `capture.json` to retain
settings. Keep runtime versions while any helper may still use them; after all
runs stop, disabling/removing the plugin permits removal of its managed helper
directory. Remove only skill links owned by this plugin, preserving other skills.
Plugin removal does not promise deletion of test artifacts or recorded local data.
