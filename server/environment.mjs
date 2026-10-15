import { createRequire } from "node:module";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, extname } from "node:path";

export const VERSION = "0.4.1";
export const CYPRESS_RANGE = ">=16.0.0 <17.0.0";
export function checkNode(version = process.versions.node) {
  const [major, minor] = version.split(".").map(Number);
  if (!(major === 24 || (major === 22 && minor >= 18)))
    throw new Error(
      `Cypress Pulse requires Node 22.18+ on the 22.x line, or Node 24.x. Found ${version}.`,
    );
}
export function checkCypress(version) {
  if (!/^16\.\d+\.\d+$/.test(version))
    throw new Error(
      `Cypress Pulse requires Cypress ${CYPRESS_RANGE}. Found ${version}.`,
    );
}
export function canonical(path) {
  return realpathSync(resolve(path));
}
export function worktreeRoot(project) {
  let current = canonical(project);
  while (true) {
    if (existsSync(join(current, ".git"))) return current;
    if (dirname(current) === current) return canonical(project);
    current = dirname(current);
  }
}
export function stateRoot() {
  return (
    process.env.CYPRESS_PULSE_STATE_DIR ||
    join(homedir(), ".local", "state", "cypress-pulse")
  );
}
export function resolveCypress(project, explicitCli) {
  const require = createRequire(join(project, "package.json"));
  const packagePath = explicitCli
    ? join(dirname(dirname(explicitCli)), "package.json")
    : require.resolve("cypress/package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
  checkCypress(pkg.version);
  return {
    cli: explicitCli || join(dirname(packagePath), "bin", "cypress"),
    version: pkg.version,
  };
}
export function resolveConfig(project, explicit) {
  if (explicit) {
    const file = canonical(resolve(project, explicit));
    if (![".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"].includes(extname(file)))
      throw new Error("Unsupported Cypress configuration extension.");
    return file;
  }
  const candidates = ["js", "ts", "cjs", "mjs", "cts", "mts"]
    .map((ext) => join(project, `cypress.config.${ext}`))
    .filter(existsSync);
  if (candidates.length !== 1)
    throw new Error(
      "Specify --config-file when there is not exactly one Cypress configuration file.",
    );
  return canonical(candidates[0]);
}
export function moduleType(file) {
  if ([".mjs", ".mts"].includes(extname(file))) return "module";
  if ([".cjs", ".cts"].includes(extname(file))) return "commonjs";
  let current = dirname(file);
  while (true) {
    const pkg = join(current, "package.json");
    if (existsSync(pkg))
      return JSON.parse(readFileSync(pkg, "utf8")).type === "module"
        ? "module"
        : "commonjs";
    if (dirname(current) === current) return "commonjs";
    current = dirname(current);
  }
}
