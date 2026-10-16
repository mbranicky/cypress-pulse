import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  symlink,
  readdir,
  rm,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { listBatchRuns } from "../server/store.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exec = promisify(execFile);
async function sources(directory) {
  const result = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const file = join(directory, entry.name);
    result[entry.name] = entry.isDirectory()
      ? await sources(file)
      : createHash("sha256")
          .update(await readFile(file))
          .digest("hex");
  }
  return result;
}
for (const format of ["cjs", "nested-esm-ts"]) {
  test(
    `webpack named loaders preserve native config context (${format})`,
    { timeout: 120_000 },
    async () => {
      const scratch = await mkdtemp(join(tmpdir(), "pulse-webpack-"));
      try {
        const project = join(scratch, "project");
        const nested = format === "nested-esm-ts";
        const configDirectory = nested ? join(project, "config") : project;
        await mkdir(configDirectory, { recursive: true });
        await mkdir(join(project, "cypress/e2e"), { recursive: true });
        await mkdir(join(project, "cypress/support"), { recursive: true });
        await symlink(
          join(root, "node_modules"),
          join(project, "node_modules"),
          "dir",
        );
        await writeFile(
          join(project, "package.json"),
          JSON.stringify({
            private: true,
            type: nested ? "module" : "commonjs",
          }),
        );
        await writeFile(
          join(configDirectory, "cwd.json"),
          JSON.stringify({ marker: "original config directory" }),
        );
        await writeFile(
          join(project, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              target: "ES2020",
              module: "commonjs",
              types: ["cypress"],
            },
            include: ["cypress/**/*.ts"],
          }),
        );
        await writeFile(
          join(project, "cypress/value.ts"),
          "export const value: number = 42;\n",
        );
        await writeFile(
          join(project, "cypress/support/e2e.ts"),
          "before(() => cy.task('context').should('equal', 'original config directory'));\n",
        );
        await writeFile(
          join(project, "cypress/e2e/loader.cy.ts"),
          "import {value} from '@fixture/value'; const expected: number = 42; it('compiles support, aliases and named TypeScript loader', () => expect(value).to.equal(expected));\n",
        );
        const config = join(
          configDirectory,
          nested ? "cypress.config.ts" : "cypress.config.cjs",
        );
        const imports = nested
          ? "import fs from 'node:fs'; import path from 'node:path'; import webpack from '@cypress/webpack-preprocessor';"
          : "const fs=require('node:fs'), path=require('node:path'), webpack=require('@cypress/webpack-preprocessor');";
        const body = `function context() {return JSON.parse(fs.readFileSync('cwd.json', 'utf8')).marker;} if(context() !== 'original config directory') throw Error('config import context changed'); const options={video:false,e2e:{setupNodeEvents(on,config){if(context() !== 'original config directory') throw Error('setup context changed'); on('task',{context}); on('after:spec',()=>{if(context() !== 'original config directory') throw Error('hook context changed');}); on('file:preprocessor',webpack({webpackOptions:{resolve:{extensions:['.ts','.js'],alias:{'@fixture':path.join(config.projectRoot,'cypress')}},module:{rules:[{test:/\\.ts$/,loader:'ts-loader',options:{transpileOnly:true,configFile:path.join(config.projectRoot,'tsconfig.json')}}]}}}));}}};`;
        await writeFile(
          config,
          `${imports}\n${body}\n${nested ? "export default options;" : "module.exports=options;"}`,
        );
        const before = await sources(project);
        const cli =
          process.env.CYPRESS_PULSE_TEST_CLI ||
          join(root, "node_modules/cypress/bin/cypress");
        const browser = process.env.CYPRESS_PULSE_TEST_BROWSER || "electron";
        const cypressArgs = [
          "--browser",
          browser,
          ...(process.env.CYPRESS_PULSE_TEST_HEADED ? ["--headed"] : []),
        ];
        const native = await exec(
          process.execPath,
          [
            cli,
            "run",
            "--project",
            project,
            "--config-file",
            config,
            ...cypressArgs,
          ],
          { cwd: project, timeout: 50_000, maxBuffer: 4 * 1024 * 1024 },
        );
        assert.match(native.stdout, /1 passing/);
        const state = join(scratch, "state");
        try {
          await exec(
            process.execPath,
            [
              (process.env.CYPRESS_PULSE_TEST_HELPER || join(root, "server/cli.mjs")),
              "run",
              "--project",
              project,
              "--config-file",
              config,
              "--state-dir",
              state,
              "--cypress-cli",
              cli,
              "--",
              ...cypressArgs,
            ],
            { cwd: project, timeout: 50_000, maxBuffer: 4 * 1024 * 1024 },
          );
        } catch (error) {
          throw new Error(
            `Pulse failed after native Cypress passed:\n${error.stdout}\n${error.stderr}`,
          );
        }
        const [run] = await listBatchRuns(state, await realpath(project));
        assert.equal(run.status, "passed");
        assert.deepEqual([run.passed, run.failed, run.tests.length], [1, 0, 1]);
        assert.deepEqual(
          await sources(project),
          before,
          "native and monitored invocations must preserve project files",
        );
      } finally {
        await rm(scratch, { recursive: true, force: true });
      }
    },
  );
}
