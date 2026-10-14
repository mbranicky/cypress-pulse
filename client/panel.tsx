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
  type PulseRun,
  type PulseTest,
} from "../shared/rpc";

type Colors = PluginWorkspacePanelProps["theme"]["colors"];
const live = (run: PulseRun) => ["running", "starting"].includes(run.status);
function projectName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) || path;
}
function duration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function tone(status: string, colors: Colors) {
  return status === "passed"
    ? colors.statusSuccess
    : ["failed", "error"].includes(status)
      ? colors.statusDanger
      : ["running", "starting"].includes(status)
        ? colors.accent
        : colors.foregroundMuted;
}
function Action({
  label,
  onPress,
  colors,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  colors: Colors;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 40,
        justifyContent: "center",
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.surface2,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: colors.foreground, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}
function TestRow({
  test,
  colors,
  onPreview,
  onReport,
}: {
  test: PulseTest;
  colors: Colors;
  onPreview: (test: PulseTest, index: number) => void;
  onReport?: () => void;
}) {
  const [expanded, setExpanded] = useState(test.status === "failed");
  return (
    <View
      style={{
        backgroundColor: colors.surface1,
        borderRadius: 12,
        padding: 12,
        gap: 6,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${test.title}, ${test.status}. ${expanded ? "Collapse" : "Expand"} details`}
        onPress={() => setExpanded((value) => !value)}
        style={{
          minHeight: 40,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon
          name={
            test.status === "passed"
              ? "CircleCheck"
              : test.status === "failed"
                ? "CircleX"
                : test.status === "running"
                  ? "Activity"
                  : "CircleMinus"
          }
          size={16}
          color={tone(test.status, colors)}
        />
        <Text
          style={{
            flex: 1,
            color: colors.foreground,
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {test.title}
        </Text>
        <Text
          style={{
            color: colors.foregroundMuted,
            fontSize: 11,
            fontVariant: ["tabular-nums"],
          }}
        >
          {test.status === "running"
            ? "Running"
            : `${Math.round(test.duration)} ms`}
        </Text>
      </Pressable>
      <Text
        selectable
        style={{ color: colors.foregroundMuted, fontSize: 11, lineHeight: 16 }}
      >
        {test.file}
        {test.retry
          ? ` · ${test.retry} ${test.retry === 1 ? "retry" : "retries"}`
          : ""}
      </Text>
      {expanded && test.error ? (
        <>
          <Text
            selectable
            style={{ color: colors.statusDanger, fontSize: 12, lineHeight: 18 }}
          >
            {test.error.message || "Test failed"}
          </Text>
          {test.error.stack ? (
            <Text
              selectable
              style={{
                color: colors.foregroundMuted,
                fontSize: 11,
                lineHeight: 16,
              }}
            >
              {test.error.stack}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Action
              label="Copy error"
              colors={colors}
              onPress={() => {
                void copyText(
                  `${test.error?.message || ""}\n${test.error?.stack || ""}`,
                );
              }}
            />
            {test.attachments.map((item, index) =>
              item.kind === "screenshot" ? (
                <Action
                  key={item.path}
                  label={`Screenshot${item.attempt ? ` · attempt ${item.attempt}` : ""}`}
                  colors={colors}
                  onPress={() => onPreview(test, index)}
                />
              ) : null,
            )}
          </View>
        </>
      ) : null}
      {expanded && test.status === "failed" && !test.error && onReport ? (
        <Action label="Read failure" colors={colors} onPress={onReport} />
      ) : null}
    </View>
  );
}
export function PulsePanel({
  theme,
  host,
  workspaceId,
  layout,
}: PluginWorkspacePanelProps) {
  const colors = theme.colors;
  const fetchDashboard = useRpc(dashboard);
  const readReport = useRpc(interactiveReport);
  const preview = useRpc(screenshot);
  const [selected, setSelected] = useState<string>();
  const [filter, setFilter] = useState<"all" | "failed">("all");
  const [now, setNow] = useState(Date.now());
  const [detail, setDetail] = useState<{
    title: string;
    text?: string;
    image?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["cypress-pulse", host.id, workspaceId, selected],
    queryFn: () => fetchDashboard({ workspaceId, runId: selected }),
    refetchInterval: (data) => (data.state.data?.runs.some(live) ? 2000 : 5000),
    staleTime: 1000,
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const data = query.data;
  const run = data?.runs.find((run) => run.id === data.selectedId);
  const showScreenshot = async (test: PulseTest, index: number) => {
    if (!run) return;
    setBusy(true);
    try {
      const result = await preview({
        workspaceId,
        runId: run.id,
        testId: test.id,
        index,
      });
      setDetail({ title: test.title, image: result.dataUri });
    } catch (error) {
      setDetail({ title: "Screenshot unavailable", text: String(error) });
    } finally {
      setBusy(false);
    }
  };
  const showReport = async (testId?: string) => {
    if (!run) return;
    setBusy(true);
    try {
      const result = await readReport({ workspaceId, runId: run.id, testId });
      setDetail({
        title: testId ? "Test failure" : "Interactive spec report",
        text: result.text,
      });
    } catch (error) {
      setDetail({ title: "Report unavailable", text: String(error) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface0 }}>
      <ScrollView
        contentContainerStyle={{ padding: layout.compact ? 12 : 16, gap: 16 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="Activity" size={18} color={colors.accent} />
          <Text
            style={{
              flex: 1,
              color: colors.foreground,
              fontSize: 17,
              fontWeight: "600",
            }}
          >
            Cypress Pulse
          </Text>
          <Action
            label="Refresh"
            colors={colors}
            onPress={() => {
              void query.refetch();
            }}
          />
        </View>
        {query.isLoading ? (
          <Text style={{ color: colors.foregroundMuted }}>
            Looking for Cypress runs…
          </Text>
        ) : null}
        {query.error ? (
          <View style={{ gap: 8 }}>
            <Text selectable style={{ color: colors.statusDanger }}>
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
            <Text
              style={{
                color: colors.foreground,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              Ready for your next test run
            </Text>
            <Text style={{ color: colors.foregroundMuted, lineHeight: 20 }}>
              Run Cypress through the Cypress Pulse skill, or open a Chromium
              Cypress session in this project. Progress and failures will appear
              here.
            </Text>
            {data.helper ? (
              <Action
                label="Copy launch command"
                colors={colors}
                onPress={() => {
                  void copyText(
                    `node ${JSON.stringify(data.helper)} run --project . --`,
                  );
                }}
              />
            ) : null}
          </View>
        ) : null}
        {data && run ? (
          <>
            {data.runs.length > 1 ? (
              <View style={{ gap: 6 }}>
                <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>
                  RUNS IN THIS WORKSPACE
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {data.runs.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: item.id === run.id }}
                      onPress={() => setSelected(item.id)}
                      style={{
                        minHeight: 40,
                        paddingHorizontal: 10,
                        justifyContent: "center",
                        borderRadius: 8,
                        backgroundColor:
                          item.id === run.id
                            ? colors.surface2
                            : colors.surface1,
                      }}
                    >
                      <Text
                        style={{
                          color: tone(item.status, colors),
                          fontSize: 12,
                        }}
                      >
                        {projectName(item.projectRoot)} · {item.mode} ·{" "}
                        {item.status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <View
              style={{
                backgroundColor: colors.surface1,
                padding: 16,
                borderRadius: 16,
                gap: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: tone(run.status, colors),
                    fontWeight: "600",
                    fontSize: 15,
                  }}
                >
                  {run.status[0].toUpperCase() + run.status.slice(1)}
                </Text>
                <Text
                  style={{
                    color: colors.foreground,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {run.startedAt
                    ? duration(
                        (run.endedAt ? Date.parse(run.endedAt) : now) -
                          Date.parse(run.startedAt),
                      )
                    : "—"}
                </Text>
              </View>
              <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>
                {projectName(run.projectRoot)} ·{" "}
                {run.browser || "Browser starting"} · {run.mode}
                {run.cypressVersion ? ` · Cypress ${run.cypressVersion}` : ""}
              </Text>
              {run.activeSpec ? (
                <Text
                  selectable
                  style={{
                    color: colors.foreground,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {run.activeSpec}
                </Text>
              ) : null}
              {run.totalSpecs !== null ? (
                <>
                  <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{
                      min: 0,
                      max: run.totalSpecs,
                      now: run.completedSpecs,
                    }}
                    style={{
                      height: 5,
                      backgroundColor: colors.surface2,
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: 5,
                        width: `${Math.min(100, (run.completedSpecs / Math.max(1, run.totalSpecs)) * 100)}%`,
                        backgroundColor: tone(run.status, colors),
                      }}
                    />
                  </View>
                  <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>
                    {run.completedSpecs} / {run.totalSpecs} specs completed
                  </Text>
                </>
              ) : run.totalTests !== null ? (
                <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>
                  {run.passed + run.failed + run.pending + run.skipped} /{" "}
                  {run.totalTests} tests completed
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
                {(
                  [
                    ["Passed", run.passed, colors.statusSuccess],
                    ["Failed", run.failed, colors.statusDanger],
                    ["Pending", run.pending, colors.foregroundMuted],
                    ["Skipped", run.skipped, colors.foregroundMuted],
                  ] as const
                ).map(([label, value, color]) => (
                  <View key={label} style={{ gap: 3 }}>
                    <Text
                      style={{
                        color,
                        fontSize: 22,
                        fontVariant: ["tabular-nums"],
                        fontWeight: "600",
                      }}
                    >
                      {value}
                    </Text>
                    <Text
                      style={{ color: colors.foregroundMuted, fontSize: 10 }}
                    >
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
              {run.retries ? (
                <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>
                  {run.retries} {run.retries === 1 ? "test" : "tests"} retried
                </Text>
              ) : null}
            </View>
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
            {run.artifacts.some((item) => item.kind === "screenshot") ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.foreground, fontWeight: "600" }}>
                  Screenshots
                </Text>
                {run.artifacts.map((item, index) =>
                  item.kind === "screenshot" ? (
                    <Action
                      key={item.path}
                      label={item.path.split(/[\\/]/).at(-1) || item.file}
                      colors={colors}
                      disabled={busy}
                      onPress={() => {
                        void showScreenshot(
                          {
                            id: "__spec_artifact__",
                            title: item.file,
                          } as PulseTest,
                          index,
                        );
                      }}
                    />
                  ) : null,
                )}
              </View>
            ) : null}
            {run.status === "empty" ? (
              <Text style={{ color: colors.foregroundMuted }}>
                No tests passed or failed in this execution. Check the selected
                specs and skipped tests.
              </Text>
            ) : null}
            {run.source === "interactive" ? (
              <Action
                label="Read spec report"
                colors={colors}
                disabled={busy || live(run) || !run.startedAt}
                onPress={() => {
                  void showReport();
                }}
              />
            ) : null}
            {run.tests.length || run.source === "batch" ? (
              <>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text
                    style={{
                      flex: 1,
                      color: colors.foreground,
                      fontWeight: "600",
                    }}
                  >
                    Tests
                  </Text>
                  <Action
                    label={filter === "all" ? "Show failures" : "Show all"}
                    colors={colors}
                    onPress={() =>
                      setFilter(filter === "all" ? "failed" : "all")
                    }
                  />
                </View>
                {run.tests
                  .filter(
                    (test) => filter === "all" || test.status === "failed",
                  )
                  .map((test) => (
                    <TestRow
                      key={`${run.id}:${test.id}`}
                      test={test}
                      colors={colors}
                      onPreview={(test, index) => {
                        void showScreenshot(test, index);
                      }}
                      onReport={
                        run.source === "interactive"
                          ? () => {
                              void showReport(test.id);
                            }
                          : undefined
                      }
                    />
                  ))}
                {!run.tests.length && live(run) ? (
                  <Text style={{ color: colors.foregroundMuted }}>
                    Waiting for the first test…
                  </Text>
                ) : null}
                {run.truncated ? (
                  <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>
                    The first 300 test details are shown, with failures first.
                    Counts cover the full run.
                  </Text>
                ) : null}
              </>
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
