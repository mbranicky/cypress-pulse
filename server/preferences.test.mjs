import test from "node:test";
import assert from "node:assert/strict";
import { captureEnvironment } from "./preferences.mjs";

test("capture defaults preserve project choices and explicit invocation environment", () => {
  assert.deepEqual(captureEnvironment({ video: "project" }, {}), {});
  assert.deepEqual(
    captureEnvironment(
      {
        video: "true",
        screenshotOnRunFailure: "false",
        videoCompression: "32",
      },
      { CYPRESS_VIDEO: "false" },
    ),
    {
      CYPRESS_VIDEO: "false",
      CYPRESS_screenshotOnRunFailure: "false",
      CYPRESS_videoCompression: "32",
    },
  );
  assert.throws(() => captureEnvironment({ video: "maybe" }, {}), /Invalid/);
});
