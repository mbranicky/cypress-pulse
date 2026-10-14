import type { PluginClientContext } from "@getpaseo/plugin/client";
import { PulsePanel } from "./client/panel";
import { watchHeaders } from "./client/header";

export default function contribute(client: PluginClientContext) {
  const removePanel = client.addWorkspacePanel({
    id: "pulse",
    title: "Cypress Pulse",
    icon: "Activity",
    context: "workspace",
    locations: ["explorer", "workspace"],
    Component: PulsePanel,
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
    void removeCommand();
    void removePanel();
  };
}
