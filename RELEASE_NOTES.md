# Release notes

Version history from the repository's implementation commits. These entries describe plugin versions; they do not imply npm publication.

## 1.0.0

First stable release. npm package: `paseo-cypress-pulse`. The Paseo plugin ID, helper command and skill remain `cypress-pulse`.

- Follow Cypress end-to-end runs in Paseo’s Explorer panel and workspace header, with live passed, failed, flaky, pending and skipped outcomes grouped by spec file.
- Filter and search tests, inspect failure details and original-line source snippets, and browse full spec source, screenshots and spec videos.
- Inspect interactive Cypress command logs, hook messages and retry attempts through the original live session.
- Install the agent skill with one click and configure host capture defaults without editing tested project sources or configuration.
- Preserve existing project hooks, reporters and webpack loader resolution through the standalone monitored batch helper.
- Ship locked production dependencies and verify clean package installations, interruptions, stale reports, source/media boundaries and real Cypress runs in CI on both supported Node lines.

Supported scope: macOS desktop, Paseo app/daemon `>=0.11.2 <0.12.0`, Cypress `>=16.0.0 <17.0.0` end-to-end tests, and helper Node `^22.18.0 || ^24.0.0`. Ubuntu CI covers batch operation; Windows, Linux desktop, mobile clients and component testing remain unverified. Interactive logs require the original Chromium-family session; batch command logs, arbitrary browser-console capture, and stop/rerun controls are outside this release.

## 0.5.1

- Added main-branch CI and release package verification, locked production dependency preparation for Git installations, a publishable npm shrinkwrap, and a documented release procedure.
- Fixed helper startup through symlinked paths, production-only Paseo compilation, and malformed telemetry hiding otherwise valid runs.

- Refreshed every documentation screenshot for the current search controls and button icons; added test-source details and interactive command-log examples.

- Added a FileCode icon and a test-source section to Test details, with original line numbers, Copy source, and Open full file. Declaration parsing uses pinned TypeScript and safely reports ambiguous matches.

- Added Test details for all tests and interactive command Logs with search, copy, refresh, hook attribution and retry-attempt selection. Batch log availability and browser-console limitations are stated in the interface.

- Added case-insensitive search across spec paths and full test titles, combined with status filters and applied before the display limit.

- Added **Skipped / Disabled** filtering for Cypress skipped and pending tests, while excluding queued tests in active interactive runs.
- Filter controls move below the heading as one group in narrow panels, keeping all tabs on the same row. Very narrow panels allow horizontal scrolling within that group.

## 0.5.0

- Added a **Flaky** filter for tests that passed after a retry.
- Replaced individual screenshot buttons with a **Screenshots** gallery, with Previous/Next navigation and original-resolution zoom.
- Added **Video** playback for Cypress-generated spec recordings on desktop/web. Cypress records one video per spec in run mode; open mode does not record videos.
- Added host capture settings for automatic failure screenshots, standard/2× resolution, video recording, and compression. Defaults apply to future Pulse helper runs without editing project files; explicit invocation overrides take precedence.
- Refreshed documentation images, including capture settings and the video player. Added this version history.

## 0.4.1

- Balanced suite-card header padding and removed excess space above filenames.
- Aligned filenames, folder paths, and outcome counts with expanded test details.

## 0.4.0

- Show completed test outcomes while a spec is still running, including interactive Tap sessions.
- Distinguish clean passes, flaky passes, failures, pending, and skipped tests in segmented progress; mark incomplete batch totals as known tests.
- Added optional per-run 2× Chromium screenshot capture without changing the configured viewport.
- Added running spinners, wider source/image dialogs, and Fit/100%/200% screenshot zoom.
- Limited source-preview activation to the filename and adjacent arrow; other suite-card clicks expand/collapse.
- Shortened home-directory paths to `~/` in agent setup.

## 0.3.1

- Fixed project compilation failures caused by configuration wrappers running from the Pulse helper directory.
- Restore the original config directory before importing project code, preserving relative reads and named webpack loader resolution.
- Added regression coverage for CommonJS and nested ESM TypeScript configs, webpack preprocessing, and `ts-loader`.

## 0.3.0

- Grouped tests by spec file with per-file outcomes and retry counts.
- Added expandable suite sections, focused failure details, and spec-level screenshot access.
- Added read-only source previews with line numbers and Copy source for known spec files inside the workspace.

## 0.2.0

- Added one-click agent skill installation through the Paseo interface, with ownership checks for existing files and links.
- Added agent setup status and refined the dashboard layout and failure presentation.
- Improved TypeScript compatibility checks and source formatting.

## 0.1.0

- Initial standalone Cypress Pulse plugin for Paseo, with an Explorer dashboard and workspace progress indicator.
- Added an external batch helper that composes existing hooks/reporters and preserves tested project sources and configuration.
- Added interactive monitoring through Cypress Tap, local run history, failure reporting, screenshot previews, and runtime version checks.
