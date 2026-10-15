import type { PluginClientContext } from "@getpaseo/plugin/client";
import { CaptureSettings } from "./client/settings";
import { PulsePanel } from "./client/panel";
import { watchHeaders } from "./client/header";

export default function contribute(client: PluginClientContext) {
  const removeSettings = client.addSettingsScreen({
    id: "capture",
    title: "Capture settings",
    icon: "SlidersHorizontal",
    Component: CaptureSettings,
  });
  const removePanel = client.addWorkspacePanel({
    id: "pulse",
    title: "Cypress Pulse",
    icon: "Activity",
    context: "workspace",
    locations: ["explorer", "workspace"],
    Component: (props) => (
      <PulsePanel
        {...props}
        onSettings={() => client.openSettings("capture")}
      />
    ),
  });
  const removeCommand = client.addCommandCenterItem({
    id: "open-cypress-pulse",
    title: "Open Cypress Pulse",
    icon: "Activity",
    keywords: ["cypress", "tests", "e2e"],
    context: "workspace",
    onSelect({ openPanel }) {
      openPanel("pulse", { location: "explorer" });
    },
  });
  const stopHeaders = watchHeaders(client);
  return () => {
    stopHeaders();
    void removeSettings();
    void removeCommand();
    void removePanel();
  };
}
