const { emit } = require("./telemetry.cjs");
const { join, isAbsolute } = require("node:path");
const { withScreenshotScale } = require("./screenshots.cjs");

const lifecycle = new Set([
  "before:run",
  "before:spec",
  "after:spec",
  "after:run",
]);
exports.wrapConfig = function wrapConfig(original) {
  // Cypress's TypeScript loader can expose a module namespace to CommonJS require().
  original = original?.default || original;
  if (!original || typeof original !== "object")
    throw new Error(
      "The original Cypress configuration must export an object.",
    );
  const wrapped = { ...original };
  for (const type of ["e2e", "component"]) {
    if (type === "component" && !original.component) continue;
    wrapped[type] = {
      ...original[type],
      async setupNodeEvents(on, resolved) {
        const callbacks = new Map();
        const scale = process.env.CYPRESS_PULSE_SCREENSHOT_SCALE;
        const capture = (event, handler) => {
          if (
            !lifecycle.has(event) &&
            !(scale && event === "before:browser:launch")
          )
            return on(event, handler);
          callbacks.set(event, [...(callbacks.get(event) || []), handler]);
        };
        // The original callback sees its own config filename rather than our temporary wrapper.
        const input = {
          ...resolved,
          configFile:
            process.env.CYPRESS_PULSE_ORIGINAL_CONFIG || resolved.configFile,
        };
        const originalSetup = original[type]?.setupNodeEvents;
        const returned = originalSetup
          ? await originalSetup(capture, input)
          : undefined;
        const config = returned ? { ...input, ...returned } : input;
        if (scale)
          on("before:browser:launch", async (browser, options) => {
            let result = options;
            for (const callback of callbacks.get("before:browser:launch") || [])
              result = (await callback(browser, result)) || result;
            return withScreenshotScale(browser, result, scale);
          });
        for (const event of lifecycle) {
          on(event, async (...args) => {
            let result;
            for (const callback of callbacks.get(event) || [])
              result = await callback(...args);
            if (event === "before:run")
              emit("run.begin", {
                specs: args[0]?.specs?.map((spec) => spec.relative) || [],
                browser: args[0]?.browser?.name || "",
                testingType: type,
              });
            if (event === "before:spec")
              emit("spec.begin", { file: args[0].relative });
            if (event === "after:spec") {
              const [spec, results] = args;
              emit("spec.end", {
                file: spec.relative,
                stats: results?.stats,
                error: results?.error || null,
                tests: (results?.tests || []).map((test) => ({
                  titlePath: test.title,
                  state: test.state,
                  duration: test.duration,
                  error: test.displayError
                    ? {
                        message: String(test.displayError)
                          .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
                          .slice(0, 12000),
                      }
                    : undefined,
                  attempts: (test.attempts || []).map((attempt) => ({
                    state: attempt.state,
                  })),
                })),
                screenshots: (results?.screenshots || []).map(
                  (image) => image.path,
                ),
                video: results?.video || null,
              });
            }
            if (event === "after:run")
              emit("run.end", {
                totalTests: args[0]?.totalTests,
                failed: args[0]?.totalFailed,
                passed: args[0]?.totalPassed,
                pending: args[0]?.totalPending,
                skipped: args[0]?.totalSkipped,
              });
            return result;
          });
        }
        let originalReporter =
          process.env.CYPRESS_PULSE_REPORTER_OVERRIDE ||
          config.reporter ||
          "spec";
        if (originalReporter.includes("/") || originalReporter.includes("\\"))
          originalReporter = isAbsolute(originalReporter)
            ? originalReporter
            : join(config.projectRoot, originalReporter);
        const originalOptions = process.env.CYPRESS_PULSE_REPORTER_OPTIONS
          ? JSON.parse(process.env.CYPRESS_PULSE_REPORTER_OPTIONS)
          : config.reporterOptions;
        return {
          ...config,
          reporter: join(__dirname, "reporter.cjs"),
          reporterOptions: {
            pulseOriginalReporter: originalReporter,
            pulseOriginalOptions: originalOptions,
            pulseOriginalConfig: process.env.CYPRESS_PULSE_ORIGINAL_CONFIG,
          },
          configFile: resolved.configFile,
        };
      },
    };
  }
  return wrapped;
};
