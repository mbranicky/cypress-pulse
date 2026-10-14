import { open, realpath } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { inside } from "./store.mjs";
import { specKey } from "../shared/specs.mjs";

export async function readSpecSource(run, file, workspaceDirectory) {
  const known = [
    run.activeSpec,
    ...run.tests.map((test) => test.file),
    ...run.artifacts.map((item) => item.file),
  ].filter(Boolean);
  const selected = known.find(
    (item) => specKey(item, run.projectRoot) === file,
  );
  if (!selected) throw new Error("That spec is not part of the selected run.");
  const root = await realpath(run.projectRoot);
  const workspaceRoot = await realpath(workspaceDirectory);
  if (!inside(workspaceRoot, root))
    throw new Error("This Cypress project is outside the workspace.");
  const target = await realpath(resolve(root, file));
  if (!inside(workspaceRoot, target))
    throw new Error("Spec files outside this workspace cannot be previewed.");
  if (
    ![".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"].includes(
      extname(target).toLowerCase(),
    )
  )
    throw new Error("This file is not a supported Cypress source file.");
  const handle = await open(target, "r");
  try {
    if (!(await handle.stat()).isFile())
      throw new Error("This spec is not a regular file.");
    const limit = 1024 * 1024;
    const bytes = Buffer.alloc(limit + 1);
    let length = 0;
    while (length < bytes.length) {
      const result = await handle.read(
        bytes,
        length,
        bytes.length - length,
        null,
      );
      if (!result.bytesRead) break;
      length += result.bytesRead;
    }
    if (length > limit)
      throw new Error("This source file exceeds the 1 MiB preview limit.");
    if (bytes.subarray(0, length).includes(0))
      throw new Error("This source file contains binary data.");
    return { file, text: bytes.subarray(0, length).toString("utf8") };
  } finally {
    await handle.close();
  }
}
