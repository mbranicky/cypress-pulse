import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  symlink,
  rm,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { listBatchRuns } from "../server/store.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exec = promisify(execFile);
test(
  "live batch outcomes precede spec completion and optional screenshot scale doubles PNG pixels",
  { timeout: 100_000 },
  async () => {
    const scratch = await mkdtemp(join(tmpdir(), "pulse-live-"));
    try {
      const project = join(scratch, "project");
      await mkdir(join(project, "cypress/e2e"), { recursive: true });
      await symlink(
        join(root, "node_modules"),
        join(project, "node_modules"),
        "dir",
      );
      await writeFile(join(project, "package.json"), '{"private":true}');
      const config = join(project, "cypress.config.cjs");
      const source = `module.exports={video:false,viewportWidth:800,viewportHeight:600,screenshotsFolder:${JSON.stringify(join(scratch, "images"))},e2e:{supportFile:false,setupNodeEvents(on){on('task',{hold:()=>new Promise(resolve=>setTimeout(()=>resolve(null),12000))});on('before:browser:launch',async(_browser,options)=>({...options,args:[...options.args,'--disable-dev-shm-usage']}));}}};`;
      await writeFile(config, source);
      const spec = join(project, "cypress/e2e/live.cy.js");
      const specSource = `describe('Live outcomes',()=>{it('preserves viewport',()=>expect(Cypress.config('viewportWidth')).to.equal(800));it('captures failure',()=>expect('actual').to.equal('expected'));it('recovers on retry',{retries:1},()=>expect(Cypress.currentRetry).to.equal(1));it('keeps spec running',()=>cy.task('hold'));});`;
      await writeFile(spec, specSource);
      const dimensions = [];
      for (const scale of [1, 2]) {
        const state = join(scratch, `state-${scale}`);
        const execution = exec(
          process.execPath,
          [
            join(root, "server/cli.mjs"),
            "run",
            "--project",
            project,
            "--state-dir",
            state,
            "--screenshot-scale",
            String(scale),
            "--",
            "--browser",
            "chrome",
          ],
          { cwd: project, timeout: 40_000, maxBuffer: 4 * 1024 * 1024 },
        ).then(
          () => ({ code: 0 }),
          (error) => ({
            code: error.code,
            stdout: error.stdout,
            stderr: error.stderr,
          }),
        );
        let live;
        for (let attempt = 0; attempt < 60; attempt++) {
          const runs = await listBatchRuns(
            state,
            await realpath(project),
          ).catch(() => []);
          live = runs[0];
          if (
            live?.status === "running" &&
            live.passed === 2 &&
            live.failed === 1 &&
            live.flaky === 1
          )
            break;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        const outcome = await execution;
        assert.equal(outcome.code, 1, `${outcome.stdout}\n${outcome.stderr}`);
        assert.equal(
          live?.status,
          "running",
          "outcomes must be visible before the spec completes",
        );
        assert.deepEqual(
          [
            live.passed,
            live.failed,
            live.flaky,
            live.completedSpecs,
            live.totalTests,
          ],
          [2, 1, 1, 0, 4],
        );
        const [finished] = await listBatchRuns(state, await realpath(project));
        assert.deepEqual(
          [finished.passed, finished.failed, finished.flaky],
          [3, 1, 1],
        );
        const image = finished.artifacts.find(
          (item) => item.kind === "screenshot",
        );
        assert.ok(image, "Cypress must generate a failure PNG");
        const png = await readFile(image.path);
        dimensions.push({
          width: png.readUInt32BE(16),
          height: png.readUInt32BE(20),
        });
        assert.equal(await readFile(config, "utf8"), source);
        assert.equal(await readFile(spec, "utf8"), specSource);
      }
      assert.equal(dimensions[1].width, dimensions[0].width * 2);
      assert.equal(dimensions[1].height, dimensions[0].height * 2);
      console.log(
        `Failure PNG: ${dimensions[0].width}×${dimensions[0].height} → ${dimensions[1].width}×${dimensions[1].height}`,
      );
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  },
);
