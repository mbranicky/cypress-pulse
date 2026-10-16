# Release procedure

Change the version only after the maintainer explicitly requests it. Preparing or
verifying a release does not publish it. npm publication is a separate action.

## Release scope

The first stable release targets Cypress end-to-end tests on macOS desktop with
Paseo app and daemon `>=0.11.2 <0.12.0`, Cypress `>=16.0.0 <17.0.0`, and helper
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
   npm run test:package -- --integration
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
add the release entry to RELEASE_NOTES. Repeat the checks above on that revision.

Create the release artifact with:

```sh
npm run pack:release
```

It writes `work/release/cypress-pulse-VERSION.tgz`. This stages the npm manifest
without changing the source checkout: Git retains the locked
`npm ci --omit=dev --ignore-scripts` preparation command; the npm artifact omits
that command because npm already installs production dependencies. Use this
artifact for publication rather than publishing directly from the checkout.
`npm-shrinkwrap.json` is shipped and fixes installed dependency versions and
integrities. Paseo supplies its host libraries; Cypress and webpack are excluded
from production dependencies.

Inspect the artifact and test the intended npm account before publishing. The
package name is `cypress-pulse`, public, MIT, with repository ownership
`mbranicky/cypress-pulse`. Confirm publish rights and npm's current authentication
requirements. Do not put npm tokens in source or documentation.

## Publish and verify

After explicit publication authorization, commit the tested revision and create a
matching version tag and GitHub release. Publish the checked tarball:

```sh
npm publish work/release/cypress-pulse-VERSION.tgz --access public
```

Install `npm:cypress-pulse@VERSION` in a test Paseo daemon, verify its contributions,
then update README's primary installation command to the published version/source.
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
