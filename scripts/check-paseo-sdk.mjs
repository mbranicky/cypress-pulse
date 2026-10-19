import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { exec, npmCommand, root } from "./package.mjs";

const version = "0.12.0";
// Keep dependencies beneath the checkout so host peers (React, Zod, etc.)
// resolve from the locked development tree, without replacing its minimum SDK.
const work = join(root, "work");
await mkdir(work, { recursive: true });
const scratch = await mkdtemp(join(work, "paseo-sdk-check-"));
try {
  await npmCommand([
    "install", "--prefix", scratch, "--no-save", "--package-lock=false",
    "--ignore-scripts", "--legacy-peer-deps", "--no-audit", "--no-fund",
    ...["plugin", "client", "protocol"].map((name) => `@getpaseo/${name}@${version}`),
  ], { timeout: 120_000 });
  const paths = {};
  for (const name of ["plugin", "client", "protocol"]) {
    const pkg = join(scratch, "node_modules", "@getpaseo", name);
    const metadata = JSON.parse(await readFile(join(pkg, "package.json"), "utf8"));
    if (metadata.version !== version) throw new Error(`Unexpected ${name} SDK version.`);
    paths[`@getpaseo/${name}`] = [join(pkg, "dist/index.d.ts")];
    paths[`@getpaseo/${name}/*`] = [join(pkg, "dist/*")];
  }
  const config = join(scratch, "tsconfig.json");
  await writeFile(config, JSON.stringify({
    extends: join(root, "tsconfig.json"), compilerOptions: { paths },
  }));
  await exec(process.execPath, [join(root, "node_modules/typescript/bin/tsc"),
    "--project", config, "--noEmit"], { timeout: 120_000 });
  console.log(`Client, server and shared code typecheck against Paseo ${version}; locked minimum SDK unchanged.`);
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  throw error;
} finally {
  await rm(scratch, { recursive: true, force: true });
}
