exports.withScreenshotScale = function withScreenshotScale(
  browser,
  options,
  scale,
) {
  if (!scale) return options;
  if (browser.family !== "chromium" || browser.name === "electron")
    throw new Error(
      "Cypress Pulse --screenshot-scale requires Chrome, Chromium or Edge. Omit this option for other browsers.",
    );
  return {
    ...options,
    args: [
      ...(options.args || []).filter(
        (arg) => !arg.startsWith("--force-device-scale-factor="),
      ),
      `--force-device-scale-factor=${scale}`,
    ],
  };
};
