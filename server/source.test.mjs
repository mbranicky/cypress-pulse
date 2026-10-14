import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSpecSource } from "./source.mjs";

test("source previews read only known spec files within the workspace, including shared monorepo specs", async () => {
  const directory = await mkdtemp(join(tmpdir(), "pulse-source-"));
  try {
    const root = join(directory, "project");
    await mkdir(root);
    await writeFile(join(root, "Cart.cy.ts"), 'it("cart", () => {});\n');
    await writeFile(join(directory, "outside.cy.ts"), "private");
    await symlink(join(directory, "outside.cy.ts"), join(root, "escape.cy.ts"));
    const run = {
      projectRoot: root,
      activeSpec: "",
      artifacts: [],
      tests: [
        { file: "Cart.cy.ts" },
        { file: "escape.cy.ts" },
        { file: "../outside.cy.ts" },
      ],
    };
    assert.equal(
      (await readSpecSource(run, "Cart.cy.ts", root)).text,
      'it("cart", () => {});\n',
    );
    assert.equal(
      (await readSpecSource(run, "../outside.cy.ts", directory)).text,
      "private",
    );
    await assert.rejects(readSpecSource(run, ".env", root), /not part/);
    await assert.rejects(readSpecSource(run, "escape.cy.ts", root), /outside/);
    await assert.rejects(
      readSpecSource(run, "../outside.cy.ts", root),
      /outside/,
    );
    await assert.rejects(
      readSpecSource(run, "Cart.cy.ts", join(directory, "unavailable")),
      /ENOENT/,
    );
    await writeFile(
      join(root, "Cart.cy.ts"),
      Buffer.alloc(1024 * 1024 + 1, 65),
    );
    await assert.rejects(readSpecSource(run, "Cart.cy.ts", root), /1 MiB/);
    await writeFile(join(root, "Cart.cy.ts"), Buffer.from([65, 0]));
    await assert.rejects(readSpecSource(run, "Cart.cy.ts", root), /binary/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
