import { Text, View } from "react-native";
import { useSettings, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import {
  SettingsCard,
  SettingsSection,
  SettingsSelect,
} from "@getpaseo/plugin/client/ui";
import { captureSettings } from "../shared/settings";

export function CaptureSettings({ theme }: PluginSurfaceProps) {
  const state = useSettings(captureSettings);
  const colors = theme.colors;
  if (state.status !== "ready")
    return (
      <Text style={{ color: colors.foregroundMuted }}>
        {state.status === "loading" ? "Loading settings…" : state.error}
      </Text>
    );
  const options = [
    { label: "Use project settings", value: "project" },
    { label: "Enabled", value: "true" },
    { label: "Disabled", value: "false" },
  ];
  function save(
    key:
      | "video"
      | "videoCompression"
      | "screenshotScale"
      | "screenshotOnRunFailure",
    value: string,
  ) {
    if (state.status === "ready")
      void state.save({ ...state.values, [key]: value }, state.revision);
  }
  return (
    <View style={{ gap: 20 }}>
      <Text
        style={{ color: colors.foregroundMuted, fontSize: 12, lineHeight: 19 }}
      >
        Defaults for future Cypress Pulse batch runs on this host, headed or
        headless. Project files are preserved. Explicit Cypress command options
        take precedence. Running sessions and cypress open are unaffected.
      </Text>
      <SettingsSection title="Screenshots">
        <SettingsCard>
          <SettingsSelect
            label="Capture failures"
            hint="Automatic failure screenshots in cypress run."
            value={state.values.screenshotOnRunFailure}
            options={options}
            disabled={state.saving}
            onValueChange={(v) => save("screenshotOnRunFailure", v)}
          />
          <SettingsSelect
            label="Screenshot resolution"
            hint="2× requires Chrome, Chromium or Edge and changes device pixel ratio. Explicit --screenshot-scale overrides this default."
            value={state.values.screenshotScale}
            options={[
              { label: "Standard", value: "1" },
              { label: "2× resolution", value: "2" },
            ]}
            disabled={state.saving}
            onValueChange={(v) => save("screenshotScale", v)}
          />
        </SettingsCard>
      </SettingsSection>
      <SettingsSection title="Videos">
        <SettingsCard>
          <SettingsSelect
            label="Record spec videos"
            hint="One video per spec file. Cypress does not record videos in open mode."
            value={state.values.video}
            options={options}
            disabled={state.saving}
            onValueChange={(v) => save("video", v)}
          />
          <SettingsSelect
            label="Video compression"
            hint="Balanced compression produces smaller files, with extra processing time. Playback supports MP4 files up to 32 MB."
            value={state.values.videoCompression}
            options={[
              { label: "Use project settings", value: "project" },
              { label: "Uncompressed", value: "false" },
              { label: "Balanced (CRF 32)", value: "32" },
            ]}
            disabled={state.saving}
            onValueChange={(v) => save("videoCompression", v)}
          />
        </SettingsCard>
      </SettingsSection>
      {state.saveError ? (
        <Text selectable style={{ color: colors.statusDanger }}>
          {state.saveError}
        </Text>
      ) : null}
    </View>
  );
}
