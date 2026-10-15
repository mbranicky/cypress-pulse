#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  checkNode,
  resolveConfig,
  resolveCypress,
  canonical,
  worktreeRoot,
  stateRoot,
  moduleType,
  VERSION,
} from "./environment.mjs";

const here = dirname(fileURLToPath(import.meta.url));
export function parseArgs(argv) {
  const command = argv.shift() || "help";
  const options = {};
  const args = [];
  while (argv.length) {
    const flag = argv.shift();
    if (flag === "--") {
      args.push(...argv);
      break;
    }
    if (
      ![
        "--project",
        "--config-file",
        "--cypress-cli",
        "--state-dir",
        "--run-id",
        "--screenshot-scale",
      ].includes(flag)
    )
      throw new Error(
        `Unknown helper option: ${flag}. Put Cypress options after --.`,
      );
    if (!argv.length) throw new Error(`Missing value for ${flag}.`);
    options[flag.slice(2)] = argv.shift();
  }
  return { command, options, args };
}
function takeOption(args, names) {
  let value;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    const flag = names.find(
      (name) => argument === name || argument.startsWith(`${name}=`),
    );
    if (!flag) continue;
    if (argument === flag) {
      if (index + 1 >= args.length)
        throw new Error(`Missing value for ${flag}.`);
      value = args[index + 1];
      args.splice(index, 2);
    } else {
      value = argument.slice(flag.length + 1);
      args.splice(index, 1);
    }
    index--;
  }
  return value;
}
export function writeWrapper(directory, config) {
  const type = moduleType(config);
  const ts = [".ts", ".mts", ".cts"].includes(extname(config));
  const extension = ts
    ? type === "module"
      ? ".mts"
      : ".cts"
    : type === "module"
      ? ".mjs"
      : ".cjs";
  const file = join(directory, `config${extension}`);
  // Cypress forks the config process beside --config-file, not --project.
  // Restore native cwd before importing any project code (including ESM dependencies).
  const prepare = `process.chdir(${JSON.stringify(dirname(config))});\n`;
  const source =
    type === "module"
      ? `import helper from ${JSON.stringify(pathToFileURL(join(here, "config.cjs")).href)};\n${prepare}const original = await import(${JSON.stringify(pathToFileURL(config).href)});\nexport default helper.wrapConfig(original);\n`
      : `${prepare}const original = require(${JSON.stringify(config)});\nmodule.exports = require(${JSON.stringify(join(here, "config.cjs"))}).wrapConfig(original);\n`;
  writeFileSync(file, source, { mode: 0o600 });
  return file;
}
function atomicallyWrite(file, data) {
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  renameSync(temporary, file);
}
export async function main(argv = process.argv.slice(2)) {
  checkNode();
  const { command, options, args } = parseArgs([...argv]);
  if (
    options["screenshot-scale"] &&
    !["1", "2"].includes(options["screenshot-scale"])
  )
    throw new Error(
      "--screenshot-scale must be 1 or 2. Use 2 for higher-resolution Chromium screenshots.",
    );
  if (command === "help" || command === "--help") {
    console.log(
      "Cypress Pulse\n  run --project PATH [--config-file FILE] [--screenshot-scale 2] -- [Cypress run options]\n  doctor --project PATH\n  show --run-id ID [--state-dir PATH]\nScreenshot scaling is optional and requires Chrome, Chromium or Edge.\nNo files are added to the tested project.",
    );
    return 0;
  }
  const state = resolve(options["state-dir"] || stateRoot());
  if (command === "show") {
    if (!/^[a-zA-Z0-9-]+$/.test(options["run-id"] || ""))
      throw new Error("A valid --run-id is required.");
    const directory = join(state, "runs", options["run-id"]);
    const { readBatchRun } = await import("./store.mjs");
    console.log(JSON.stringify(await readBatchRun(directory), null, 2));
    return 0;
  }
  if (!["run", "doctor"].includes(command))
    throw new Error(`Unknown command: ${command}`);
  if (args.includes("run") || args.includes("open"))
    throw new Error(
      "Supply only Cypress run options after --. For interactive sessions use cypress tap.",
    );
  const projectFlag = takeOption(args, ["--project", "-P"]);
  const project = canonical(options.project || projectFlag || process.cwd());
  const configFlag = takeOption(args, ["--config-file", "-C"]);
  const config = resolveConfig(project, options["config-file"] || configFlag);
  const cypress = resolveCypress(
    project,
    options["cypress-cli"] && resolve(options["cypress-cli"]),
  );
  if (command === "doctor") {
    console.log(
      JSON.stringify(
        {
          pulseVersion: VERSION,
          nodeVersion: process.versions.node,
          cypressVersion: cypress.version,
          cli: cypress.cli,
          project,
          config,
          stateDirectory: state,
        },
        null,
        2,
      ),
    );
    return 0;
  }
  const override = takeOption(args, ["--reporter", "-r"]);
  const reporterOptions = takeOption(args, ["--reporter-options", "-o"]);
  // Preserve native reporter option parsing instead of guessing CSV/JSON semantics.
  if (reporterOptions) {
    try {
      JSON.parse(reporterOptions);
    } catch {
      throw new Error(
        "For an explicit --reporter-options override, use a JSON object. Existing configuration options are preserved automatically.",
      );
    }
  }
  const id = randomUUID();
  const directory = join(state, "runs", id);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const wrapper = writeWrapper(directory, config);
  const manifest = {
    v: 1,
    id,
    projectRoot: project,
    workspaceRoot: worktreeRoot(project),
    configFile: config,
    cypressVersion: cypress.version,
    startedAt: new Date().toISOString(),
    ownerPid: process.pid,
    mode: args.includes("--headed") ? "headed" : "headless",
    screenshotScale: options["screenshot-scale"]
      ? Number(options["screenshot-scale"])
      : null,
    status: "starting",
  };
  atomicallyWrite(join(directory, "manifest.json"), manifest);
  console.error(`Cypress Pulse run ${id}`);
  const env = {
    ...process.env,
    CYPRESS_PULSE_RUN_DIR: directory,
    CYPRESS_PULSE_ORIGINAL_CONFIG: config,
    CYPRESS_PULSE_SCREENSHOT_SCALE: options["screenshot-scale"] || "",
    ...(override ? { CYPRESS_PULSE_REPORTER_OVERRIDE: override } : {}),
    ...(reporterOptions
      ? { CYPRESS_PULSE_REPORTER_OPTIONS: reporterOptions }
      : {}),
  };
  const child = spawn(
    process.execPath,
    [
      cypress.cli,
      "run",
      "--project",
      project,
      "--config-file",
      wrapper,
      ...args,
    ],
    { cwd: project, env, stdio: "inherit" },
  );
  const forward = (signal) => {
    if (child.exitCode === null && child.signalCode === null)
      child.kill(signal);
  };
  const interrupt = () => forward("SIGINT");
  const terminate = () => forward("SIGTERM");
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  const outcome = await new Promise((resolve) => {
    child.once("error", (error) => resolve({ code: 1, error: error.message }));
    child.once("exit", (code, signal) => resolve({ code: code ?? 1, signal }));
  });
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", terminate);
  atomicallyWrite(join(directory, "exit.json"), {
    ...outcome,
    endedAt: new Date().toISOString(),
  });
  return outcome.code;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(`Cypress Pulse: ${error.message}`);
      process.exitCode = 1;
    });
