import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, symlink, rm, truncate } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readMedia } from "./media.mjs";

test("media previews bound size, format and project containment, including symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "pulse-media-"));
  const outside = await mkdtemp(join(tmpdir(), "pulse-outside-"));
  try {
    await writeFile(join(root, "spec.mp4"), "video");
    assert.equal(
      (await readMedia(root, { path: join(root, "spec.mp4"), kind: "video" }))
        .dataUri,
      "data:video/mp4;base64,dmlkZW8=",
    );
    await assert.rejects(
      readMedia(root, { path: join(root, "spec.mp4"), kind: "screenshot" }),
      /format/,
    );
    await writeFile(join(outside, "secret.mp4"), "private");
    await symlink(join(outside, "secret.mp4"), join(root, "linked.mp4"));
    await assert.rejects(
      readMedia(root, { path: join(root, "linked.mp4"), kind: "video" }),
      /outside/,
    );
    await truncate(join(root, "spec.mp4"), 33 * 1024 * 1024);
    await assert.rejects(
      readMedia(root, { path: join(root, "spec.mp4"), kind: "video" }),
      /too large/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
