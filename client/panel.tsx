import { useEffect, useState } from "react";
import { View, Text, Pressable, Image } from "react-native";
import {
  ScrollView,
  Icon,
  Modal,
  copyText,
} from "@getpaseo/plugin/client/react-native";
import {
  useRpc,
  type PluginWorkspacePanelProps,
} from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import {
  dashboard,
  interactiveReport,
  screenshot,
  type PulseTest,
} from "../shared/rpc";
import { Action, Divider, basename, live, tone, statusIcon } from "./ui";
import { AgentSetup } from "./setup";
import { RunSummary } from "./run-summary";
import { TestRow } from "./test-row";

export function PulsePanel({
  theme,
  host,
  workspaceId,
  layout,
}: PluginWorkspacePanelProps) {
  const colors = theme.colors;
  const read = useRpc(dashboard);
  const report = useRpc(interactiveReport);
  const preview = useRpc(screenshot);
  const [selected, setSelected] = useState<string>();
  const [filter, setFilter] = useState<"all" | "failed">("all");
  const [history, setHistory] = useState(false);
  const [setup, setSetup] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [detail, setDetail] = useState<{
    title: string;
    text?: string;
    image?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["cypress-pulse", host.id, workspaceId, selected],
    queryFn: () => read({ workspaceId, runId: selected }),
    refetchInterval: (data) => (data.state.data?.runs.some(live) ? 2000 : 5000),
    staleTime: 1000,
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const data = query.data;
  const run = data?.runs.find((item) => item.id === data.selectedId);
  async function showScreenshot(testId: string, index: number, title: string) {
    if (!run) return;
    setBusy(true);
    try {
      const result = await preview({
        workspaceId,
        runId: run.id,
        testId,
        index,
      });
      setDetail({ title, image: result.dataUri });
    } catch (error) {
      setDetail({ title: "Screenshot unavailable", text: String(error) });
    } finally {
      setBusy(false);
    }
  }
  async function showReport(testId?: string) {
    if (!run) return;
    setBusy(true);
    try {
      const result = await report({ workspaceId, runId: run.id, testId });
      setDetail({
        title: testId ? "Test failure" : "Spec report",
        text: result.text,
      });
    } catch (error) {
      setDetail({ title: "Report unavailable", text: String(error) });
    } finally {
      setBusy(false);
    }
  }
  const failures = run?.tests.filter((test) => test.status === "failed") || [];
  const others = run?.tests.filter((test) => test.status !== "failed") || [];
  const row = (test: PulseTest) => (
    <TestRow
      key={`${run?.id}:${test.id}`}
      test={test}
      colors={colors}
      busy={busy}
      onPreview={(item, index) => {
        void showScreenshot(item.id, index, item.title);
      }}
      onReport={
        run?.source === "interactive"
          ? () => {
              void showReport(test.id);
            }
          : undefined
      }
    />
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface0 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Action
          label="Recent runs"
          icon={history ? "ChevronDown" : "History"}
          colors={colors}
          selected={history}
          disabled={!data?.runs.length}
          onPress={() => setHistory((value) => !value)}
        />
        <View style={{ flex: 1 }} />
        <Action
          label="Agent setup"
          colors={colors}
          selected={setup}
          onPress={() => setSetup((value) => !value)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh runs"
          onPress={() => {
            void query.refetch();
          }}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 6,
            backgroundColor: pressed ? colors.surface2 : "transparent",
          })}
        >
          <Icon name="RefreshCw" size={14} color={colors.foregroundMuted} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: layout.compact ? 12 : 16, gap: 20 }}
      >
        <AgentSetup colors={colors} hostId={host.id} expanded={setup} />
        {history && data ? (
          <View style={{ gap: 4 }}>
            <Text
              style={{
                color: colors.foregroundMuted,
                fontSize: 11,
                marginBottom: 4,
              }}
            >
              RECENT RUNS
            </Text>
            {data.runs.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: item.id === run?.id }}
                onPress={() => {
                  setSelected(item.id);
                  setHistory(false);
                  setFilter("all");
                }}
                style={({ pressed }) => ({
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                  backgroundColor:
                    item.id === run?.id || pressed
                      ? colors.surface1
                      : "transparent",
                })}
              >
                <Icon
                  name={statusIcon(item.status)}
                  size={14}
                  color={tone(item.status, colors)}
                />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.foreground, fontSize: 12 }}
                  >
                    {basename(item.projectRoot)}
                  </Text>
                  <Text style={{ color: colors.foregroundMuted, fontSize: 10 }}>
                    {item.mode} · {item.status}
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.foregroundMuted,
                    fontSize: 10,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {new Date(item.startedAt || item.updatedAt).toLocaleString(
                    undefined,
                    {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </Text>
              </Pressable>
            ))}
            <Divider colors={colors} />
          </View>
        ) : null}
        {query.isLoading ? (
          <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>
            Looking for Cypress runs…
          </Text>
        ) : null}
        {query.error ? (
          <View style={{ gap: 8 }}>
            <Text
              selectable
              style={{ color: colors.statusDanger, fontSize: 12 }}
            >
              {query.error.message}
            </Text>
            <Action
              label="Try again"
              colors={colors}
              onPress={() => {
                void query.refetch();
              }}
            />
          </View>
        ) : null}
        {data?.notices.map((notice) => (
          <Text
            key={notice}
            selectable
            style={{
              color: colors.foregroundMuted,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {notice}
          </Text>
        ))}
        {data && !run ? (
          <View style={{ paddingVertical: 24, gap: 12 }}>
            <Icon
              name="FlaskConical"
              size={24}
              color={colors.foregroundMuted}
            />
            <Text
              style={{
                color: colors.foreground,
                fontSize: 18,
                fontWeight: "600",
              }}
            >
              No test runs yet
            </Text>
            <Text
              style={{
                color: colors.foregroundMuted,
                fontSize: 12,
                lineHeight: 19,
              }}
            >
              Ask your agent to run Cypress with the Cypress Pulse skill. Or
              open Cypress in this project and select a Chromium browser.
            </Text>
            {data.helper ? (
              <View style={{ alignSelf: "flex-start" }}>
                <Action
                  label="Copy launch command"
                  icon="Copy"
                  colors={colors}
                  onPress={() => {
                    void copyText(
                      `node ${JSON.stringify(data.helper)} run --project . --`,
                    );
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}
        {run ? (
          <>
            <RunSummary run={run} colors={colors} now={now} />
            <Divider colors={colors} />
            {run.errors.length ? (
              <View style={{ gap: 8 }}>
                {run.errors.map((error) => (
                  <Text
                    key={error}
                    selectable
                    style={{
                      color: colors.statusDanger,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    {error}
                  </Text>
                ))}
              </View>
            ) : null}
            {run.status === "empty" ? (
              <Text
                style={{
                  color: colors.foregroundMuted,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                No tests passed or failed. Check the selected specs and skipped
                tests.
              </Text>
            ) : null}
            <View style={{ gap: 8 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: colors.foreground,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  Tests{run.totalTests !== null ? ` · ${run.totalTests}` : ""}
                </Text>
                <Action
                  label="All"
                  colors={colors}
                  selected={filter === "all"}
                  onPress={() => setFilter("all")}
                />
                <Action
                  label="Failed"
                  colors={colors}
                  selected={filter === "failed"}
                  onPress={() => setFilter("failed")}
                />
              </View>
              {failures.length ? (
                <View>
                  <Text
                    style={{
                      color: colors.statusDanger,
                      fontSize: 11,
                      fontWeight: "600",
                      paddingVertical: 6,
                    }}
                  >
                    {failures.length}{" "}
                    {failures.length === 1 ? "failure" : "failures"}
                  </Text>
                  {failures.map(row)}
                </View>
              ) : null}
              {filter === "all" ? (
                others.map(row)
              ) : !failures.length ? (
                <Text
                  style={{
                    color: colors.foregroundMuted,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  No failures{live(run) ? " so far" : ""}.
                </Text>
              ) : null}
              {!run.tests.length && filter === "all" ? (
                <Text
                  style={{
                    color: colors.foregroundMuted,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {live(run)
                    ? "Waiting for test results…"
                    : "No test details available."}
                </Text>
              ) : null}
              {run.truncated ? (
                <Text
                  style={{
                    color: colors.foregroundMuted,
                    fontSize: 11,
                    lineHeight: 17,
                  }}
                >
                  Showing up to 300 tests, with failures first. Counts cover the
                  full run.
                </Text>
              ) : null}
            </View>
            {run.artifacts.some((item) => item.kind === "screenshot") ? (
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  Screenshots
                </Text>
                {run.artifacts.map((item, index) =>
                  item.kind === "screenshot" ? (
                    <Pressable
                      key={item.path}
                      accessibilityRole="button"
                      accessibilityLabel={`Preview ${basename(item.path)}`}
                      disabled={busy}
                      onPress={() => {
                        void showScreenshot(
                          "__spec_artifact__",
                          index,
                          item.file,
                        );
                      }}
                      style={({ pressed }) => ({
                        minHeight: 44,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingVertical: 8,
                        opacity: busy ? 0.5 : 1,
                        backgroundColor: pressed
                          ? colors.surface1
                          : "transparent",
                      })}
                    >
                      <Icon
                        name="Image"
                        size={14}
                        color={colors.foregroundMuted}
                      />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 12,
                            lineHeight: 18,
                          }}
                        >
                          {basename(item.path)}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: colors.foregroundMuted,
                            fontSize: 10,
                          }}
                        >
                          {basename(item.file)}
                        </Text>
                      </View>
                      <Icon
                        name="ArrowUpRight"
                        size={14}
                        color={colors.foregroundMuted}
                      />
                    </Pressable>
                  ) : null,
                )}
              </View>
            ) : null}
            {run.source === "interactive" ? (
              <View style={{ alignSelf: "flex-start" }}>
                <Action
                  label="Spec report"
                  icon="FileText"
                  colors={colors}
                  disabled={busy || live(run) || !run.startedAt}
                  onPress={() => {
                    void showReport();
                  }}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <Modal
        title={detail?.title || "Details"}
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <Modal.Content>
          {detail?.image ? (
            <Image
              accessibilityLabel="Cypress failure screenshot"
              source={{ uri: detail.image }}
              resizeMode="contain"
              style={{ width: "100%", height: 440 }}
            />
          ) : (
            <Text
              selectable
              style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}
            >
              {detail?.text}
            </Text>
          )}
        </Modal.Content>
      </Modal>
    </View>
  );
}
