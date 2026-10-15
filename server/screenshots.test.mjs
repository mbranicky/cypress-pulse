import test from "node:test";
import assert from "node:assert/strict";
import helper from "./screenshots.cjs";
import configHelper from "./config.cjs";

test("optional screenshot scaling preserves project launch options and replaces an existing scale", () => {
  const original = {
    args: ["--custom", "--force-device-scale-factor=1"],
    preferences: { custom: true },
  };
  const options = helper.withScreenshotScale(
    { name: "chrome", family: "chromium" },
    original,
    "2",
  );
  assert.deepEqual(options.args, ["--custom", "--force-device-scale-factor=2"]);
  assert.deepEqual(original.args, [
    "--custom",
    "--force-device-scale-factor=1",
  ]);
  assert.equal(options.preferences, original.preferences);
  assert.equal(
    helper.withScreenshotScale({ name: "firefox" }, original, ""),
    original,
  );
  assert.throws(
    () =>
      helper.withScreenshotScale(
        { name: "electron", family: "chromium" },
        original,
        "2",
      ),
    /requires Chrome/,
  );
});
test("screenshot scaling composes asynchronous project browser hooks", async () => {
  const previous = process.env.CYPRESS_PULSE_SCREENSHOT_SCALE;
  process.env.CYPRESS_PULSE_SCREENSHOT_SCALE = "2";
  try {
    const wrapped = configHelper.wrapConfig({
      e2e: {
        setupNodeEvents(on) {
          on("before:browser:launch", async (_browser, options) => ({
            ...options,
            args: [...options.args, "--project-hook"],
          }));
        },
      },
    });
    const handlers = new Map();
    await wrapped.e2e.setupNodeEvents((name, fn) => handlers.set(name, fn), {
      projectRoot: "/tmp",
    });
    const result = await handlers.get("before:browser:launch")(
      { name: "chrome", family: "chromium" },
      { args: ["--existing"] },
    );
    assert.deepEqual(result.args, [
      "--existing",
      "--project-hook",
      "--force-device-scale-factor=2",
    ]);
  } finally {
    if (previous === undefined)
      delete process.env.CYPRESS_PULSE_SCREENSHOT_SCALE;
    else process.env.CYPRESS_PULSE_SCREENSHOT_SCALE = previous;
  }
});
