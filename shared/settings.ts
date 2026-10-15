import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const captureSettings = defineSettings({
  id: "capture",
  scope: "host",
  version: 1,
  schema: z.object({
    screenshotOnRunFailure: z
      .enum(["project", "true", "false"])
      .default("project"),
    video: z.enum(["project", "true", "false"]).default("project"),
    videoCompression: z.enum(["project", "false", "32"]).default("project"),
    screenshotScale: z.enum(["1", "2"]).default("1"),
  }),
});
