import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readPreferences(state) {
  try {
    return JSON.parse(readFileSync(join(state, "capture.json"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error(`Cannot read Pulse capture settings: ${error.message}`);
  }
}
export function captureEnvironment(preferences, env = process.env) {
  if (preferences.error) throw new Error(preferences.error);
  const result = { ...env };
  for (const key of ["screenshotOnRunFailure", "video", "videoCompression"]) {
    const value = preferences[key];
    if (value !== undefined && value !== "project") {
      if (
        ![
          "true",
          "false",
          ...(key === "videoCompression" ? ["32"] : []),
        ].includes(value)
      )
        throw new Error(`Invalid Pulse setting: ${key}`);
      const variable = `CYPRESS_${key}`;
      // Explicit invocation environment and --config arguments take precedence over saved defaults.
      if (
        !Object.keys(result).some(
          (name) => name.toLowerCase() === variable.toLowerCase(),
        )
      )
        result[variable] = value;
    }
  }
  if (
    preferences.screenshotScale &&
    !["1", "2"].includes(preferences.screenshotScale)
  )
    throw new Error("Invalid Pulse screenshot scale");
  return result;
}
