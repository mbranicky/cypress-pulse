import { open, realpath } from "node:fs/promises";
import { extname } from "node:path";
import { inside } from "./store.mjs";

export async function readMedia(projectRoot, attachment) {
  const target = await realpath(attachment.path);
  if (!inside(await realpath(projectRoot), target))
    throw new Error("Media outside this Cypress project is not previewed.");
  const mime =
    attachment.kind === "video"
      ? { ".mp4": "video/mp4" }[extname(target).toLowerCase()]
      : { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" }[
          extname(target).toLowerCase()
        ];
  if (!mime) throw new Error("Unsupported media format.");
  const handle = await open(target, "r");
  try {
    const info = await handle.stat();
    const limit = (attachment.kind === "video" ? 32 : 8) * 1024 * 1024;
    if (!info.isFile() || info.size > limit)
      throw new Error(
        "This media is too large to preview (8 MB images, 32 MB videos).",
      );
    const buffer = Buffer.alloc(info.size);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      const chunk = await handle.read(
        buffer,
        bytesRead,
        buffer.length - bytesRead,
        bytesRead,
      );
      if (!chunk.bytesRead) break;
      bytesRead += chunk.bytesRead;
    }
    return {
      dataUri: `data:${mime};base64,${buffer.subarray(0, bytesRead).toString("base64")}`,
    };
  } finally {
    await handle.close();
  }
}
