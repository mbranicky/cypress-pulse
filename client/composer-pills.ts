import type {
  PluginClientContext,
  PluginButtonRegistration,
} from "@getpaseo/plugin/client";
import { briefs } from "../shared/rpc";

export function watchComposerPills(client: PluginClientContext) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const pills = new Map<
    string,
    { workspaceId: string; registration: PluginButtonRegistration }
  >();
  const tick = async () => {
    try {
      const agents = new Map<string, string[]>();
      const agentWorkspaces = new Map<string, string>();
      let cursor: string | undefined;
      do {
        const page = await client.paseo.agents.list({
          filter: { includeArchived: false },
          page: { limit: 100, ...(cursor ? { cursor } : {}) },
        });
        if (stopped) return;
        for (const { agent } of page.entries) {
          if (!agent.workspaceId) continue;
          agentWorkspaces.set(agent.id, agent.workspaceId);
          const ids = agents.get(agent.workspaceId) || [];
          ids.push(agent.id);
          agents.set(agent.workspaceId, ids);
        }
        cursor = page.pageInfo.hasMore
          ? page.pageInfo.nextCursor || undefined
          : undefined;
      } while (cursor && !stopped);
      // Remove only this plugin's stale registrations. Updates retain insertion
      // order so other plugins' pills keep their placement as counts change.
      for (const [agentId, pill] of pills) {
        if (agentWorkspaces.get(agentId) !== pill.workspaceId) {
          pill.registration.remove();
          pills.delete(agentId);
        }
      }
      const workspaceIds = [...agents.keys()];
      for (
        let offset = 0;
        offset < workspaceIds.length && !stopped;
        offset += 4
      ) {
        await Promise.allSettled(
          workspaceIds.slice(offset, offset + 4).map(async (id) => {
            const result = await client.rpc(briefs, { workspaceIds: [id] });
            if (stopped) return;
            const brief = result.workspaces[id];
            if (brief) {
              const icon = brief.running
                ? "Activity"
                : ["failed", "error"].includes(brief.status)
                  ? "CircleX"
                  : brief.status === "passed"
                    ? "CircleCheck"
                    : "CircleMinus";
              for (const agentId of agents.get(id) || []) {
                const previous = pills.get(agentId);
                if (previous) {
                  previous.registration.update({
                    visible: true,
                    label: brief.label,
                    icon,
                  });
                  continue;
                }
                pills.set(agentId, {
                  workspaceId: id,
                  registration: client.addComposerPill({
                    id: "cypress-run",
                    workspaceId: id,
                    agentId,
                    button: {
                      title: "Open Cypress Pulse",
                      icon,
                      label: brief.label,
                      behavior: {
                        kind: "action",
                        onPress: () =>
                          client.openPanel("pulse", {
                            workspaceId: id,
                            location: "explorer",
                          }),
                      },
                    },
                  }),
                });
              }
            } else {
              for (const agentId of agents.get(id) || []) {
                pills.get(agentId)?.registration.remove();
                pills.delete(agentId);
              }
            }
          }),
        );
      }
    } catch {
      /* Host reconnects are retried by the next poll. */
    }
    if (!stopped)
      timer = setTimeout(() => {
        void tick();
      }, 5000);
  };
  void tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    for (const pill of pills.values()) pill.registration.remove();
    pills.clear();
  };
}
