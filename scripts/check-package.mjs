import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { exec, npmCommand, packRelease, root } from "./package.mjs";

const scratch = await mkdtemp(join(tmpdir(), "pulse-package-check-"));
try {
  const expected = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const artifact = await packRelease(scratch);
  const files = new Set(artifact.files.map((file) => file.path));
  for (const required of ["npm-shrinkwrap.json", "paseo-plugin.json", "index.server.ts", "index.client.tsx", "skills/cypress-pulse/SKILL.md"])
    assert.ok(files.has(required), `Missing packaged file: ${required}`);
  assert.ok(![...files].some((path) => /(^|\/)(work|tests|node_modules)\//.test(path) || /\.test\.mjs$/.test(path)));
  const gitSource = join(scratch, "git-source");
  await mkdir(gitSource);
  for (const name of ["package.json", "npm-shrinkwrap.json", "paseo-plugin.json"])
    await cp(join(root, name), join(gitSource, name));
  const gitManifest = JSON.parse(await readFile(join(gitSource, "paseo-plugin.json"), "utf8"));
  assert.deepEqual(gitManifest.build, [["npm", "ci", "--omit=dev", "--ignore-scripts"]]);
  await npmCommand(gitManifest.build[0].slice(1), {cwd:gitSource});
  assert.equal(JSON.parse(await readFile(join(gitSource, "node_modules/typescript/package.json"), "utf8")).version, "5.9.3");
  assert.ok(!(await readdir(join(gitSource, "node_modules"))).includes("cypress"));
  await npmCommand(["install", join(scratch, artifact.filename), "--prefix", scratch,
    "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false"]);
  const installed = join(scratch, "node_modules", expected.name);
  const pkg = JSON.parse(await readFile(join(installed, "package.json"), "utf8"));
  const manifest = JSON.parse(await readFile(join(installed, "paseo-plugin.json"), "utf8"));
  const lock = JSON.parse(await readFile(join(installed, "npm-shrinkwrap.json"), "utf8"));
  assert.equal(pkg.name, expected.name);
  assert.equal(pkg.name, lock.name);
  assert.equal(pkg.name, lock.packages[""].name);
  assert.equal(manifest.id, "cypress-pulse", "npm naming must preserve the Paseo plugin ID");
  assert.equal(pkg.bin["cypress-pulse"], "server/cli.mjs", "npm naming must preserve the helper command");
  assert.equal(pkg.version, lock.version);
  assert.equal(pkg.private, undefined);
  assert.equal(manifest.build, undefined, "npm artifact must not reinstall dependencies");
  assert.equal(pkg.repository.url, "git+https://github.com/mbranicky/cypress-pulse.git");
  const ts = createRequire(join(installed, "package.json"))("typescript");
  const hostModules = ["@getpaseo/plugin", "react", "react-native", "@tanstack/react-query", "zod"];
  for (const file of [...files].filter((name) => /\.(ts|tsx|mjs|cjs)$/.test(name))) {
    const source = await readFile(join(installed, file), "utf8");
    for (const dependency of ts.preProcessFile(source, true, true).importedFiles) {
      const name = dependency.fileName;
      if (name.startsWith(".")) {
        const target = relative(installed, resolve(installed, dirname(file), name)).replaceAll("\\", "/");
        assert.ok([target, ...[".ts", ".tsx", ".mjs", ".cjs", "/index.ts"].map((extension) => target + extension)].some((path) => files.has(path)), `Missing import ${name} in ${file}`);
      } else if (!name.startsWith("node:") && /\.tsx?$/.test(file)) {
        assert.ok(hostModules.some((host) => name === host || name.startsWith(host + "/")), `Unsupported host import ${name} in ${file}`);
      }
    }
  }
  for (const media of manifest.media) assert.ok(files.has(media), `Missing media: ${media}`);
  const { VERSION } = await import(pathToFileURL(join(installed, "server/environment.mjs")));
  assert.equal(VERSION, pkg.version, "Package and helper versions differ");
  for (const name of ["README.md", "OVERVIEW.md"])
    assert.ok((await readFile(join(installed, name), "utf8")).includes(pkg.version), `${name} lacks current version`);
  assert.deepEqual((await readdir(join(scratch, "node_modules"))).filter((name) => !name.startsWith("." )).sort(), [expected.name, "typescript"].sort());
  const { extractTestSource } = await import(pathToFileURL(join(installed, "server/test-source.mjs")));
  assert.equal(extractTestSource("sample.cy.ts", "it('works', () => {});", {titlePath:["works"]}).startLine, 1);
  const help = await exec(process.execPath, [join(installed, "server/cli.mjs"), "--help"]);
  assert.match(help.stdout, /Cypress Pulse/);
  const binHelp = await exec(process.execPath, [join(scratch, "node_modules/.bin/cypress-pulse"), "--help"]);
  assert.match(binHelp.stdout, /Cypress Pulse/);
  // Run regression checks against installed modules, never the checkout's modules.
  const tests = (await readdir(join(root, "server"))).filter((name) => name.endsWith(".test.mjs"));
  for (const name of tests) await cp(join(root, "server", name), join(installed, "server", name));
  const unit = await exec(process.execPath, ["--test", ...tests.map((name) => join(installed, "server", name))], {maxBuffer:8*1024*1024});
  process.stdout.write(unit.stdout);
  if (process.argv.includes("--integration")) {
    const integration = (await readdir(join(root, "tests"))).filter((name) => name.endsWith(".test.mjs"));
    const result = await exec(process.execPath, ["--test", "--test-concurrency=1", ...integration.map((name) => join(root, "tests", name))], {
      cwd: root, env: {...process.env, CYPRESS_PULSE_TEST_HELPER: join(installed, "server/cli.mjs")},
      timeout: 600_000, maxBuffer: 8*1024*1024,
    });
    process.stdout.write(result.stdout);
  }
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex !== -1) {
    const output = process.argv[outputIndex + 1];
    assert.ok(output && !output.startsWith("--"), "--output requires a directory");
    const destination = resolve(output);
    await mkdir(destination, { recursive: true });
    await cp(join(scratch, artifact.filename), join(destination, artifact.filename));
    console.log(`Saved verified package: ${join(destination, artifact.filename)}`);
  }
  console.log(`Verified production-only ${pkg.name}@${pkg.version}: ${artifact.entryCount} packaged files, source parser, CLI and installed-module regression tests.`);
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  await rm(scratch, { recursive: true, force: true });
}
