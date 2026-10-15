import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import {
  ScrollView,
  Icon,
  copyText,
} from "@getpaseo/plugin/client/react-native";
import {
  useRpc,
  type PluginWorkspacePanelProps,
} from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { dashboard, interactiveReport, specSource } from "../shared/rpc";
import { Action, Divider, basename, live, tone, StatusIcon } from "./ui";
import { AgentSetup } from "./setup";
import { RunSummary } from "./run-summary";
import { SpecGroup } from "./spec-group";
import { DetailModal } from "./detail-modal";
import { MediaGallery } from "./media-gallery";
import { SourcePreview } from "./source-preview";
import { specKey } from "../shared/specs.mjs";

export function PulsePanel({
  theme,
  host,
  workspaceId,
  layout,
  onSettings,
}: PluginWorkspacePanelProps & { onSettings(): void }) {
  const colors = theme.colors;
  const read = useRpc(dashboard);
  const report = useRpc(interactiveReport);
  const readSource = useRpc(specSource);
  const [selected, setSelected] = useState<string>();
  const [filter, setFilter] = useState<"all" | "failed" | "flaky">("all");
  const [history, setHistory] = useState(false);
  const [setup, setSetup] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [detail, setDetail] = useState<{
    title: string;
    text?: string;
    gallery?: {
      runId: string;
      testId: string;
      indices: number[];
      initial: number;
    };
    source?: { file: string; text: string };
    wide?: boolean;
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
    const attachments =
      testId === "__spec_artifact__"
        ? run.artifacts
        : run.tests.find((test) => test.id === testId)?.attachments || [];
    const chosen = attachments[index];
    if (!chosen) return;
    const indices = attachments
      .map((item, i) => ({ item, i }))
      .filter(
        ({ item }) =>
          item.kind === chosen.kind &&
          (testId !== "__spec_artifact__" ||
            ("file" in item &&
              specKey(String(item.file), run.projectRoot) ===
                specKey(
                  String((chosen as { file?: string }).file),
                  run.projectRoot,
                ))),
      )
      .map(({ i }) => i);
    setDetail({
      title: `${title} · ${chosen.kind === "video" ? "Video" : "Screenshots"}`,
      gallery: {
        runId: run.id,
        testId,
        indices,
        initial: indices.indexOf(index),
      },
      wide: true,
    });
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
  async function showSource(file: string) {
    if (!run) return;
    setBusy(true);
    setDetail({
      title: basename(file),
      text: "Reading spec source…",
      wide: true,
    });
    try {
      const source = await readSource({ workspaceId, runId: run.id, file });
      setDetail({ title: basename(file), source, wide: true });
    } catch (error) {
      setDetail({ title: "Source unavailable", text: String(error) });
    } finally {
      setBusy(false);
    }
  }
  const groups =
    run?.specs.filter(
      (spec) =>
        filter === "all" ||
        (filter === "flaky" ? spec.flaky > 0 : spec.failed > 0),
    ) || [];
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
          label="Settings"
          icon="Settings"
          colors={colors}
          onPress={onSettings}
        />
        <Action
          label="Agent setup"
          icon="Bot"
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
                <StatusIcon
                  status={item.status}
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
            <View style={{ gap: 10 }}>
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
                  Spec files
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
                <Action
                  label="Flaky"
                  colors={colors}
                  selected={filter === "flaky"}
                  onPress={() => setFilter("flaky")}
                />
              </View>
              {groups.map((spec) => (
                <SpecGroup
                  key={`${run.id}:${spec.file}:${filter}`}
                  spec={spec}
                  colors={colors}
                  filter={filter}
                  busy={busy}
                  truncated={Boolean(run.truncated)}
                  tests={run.tests
                    .filter(
                      (test) =>
                        specKey(test.file, run.projectRoot) === spec.file,
                    )
                    .map((test) =>
                      live(run) &&
                      run.source === "interactive" &&
                      test.status === "pending"
                        ? { ...test, status: "queued" }
                        : test,
                    )}
                  artifacts={run.artifacts
                    .map((item, index) => ({ ...item, index }))
                    .filter(
                      (item) =>
                        specKey(item.file, run.projectRoot) === spec.file,
                    )}
                  onSource={(file) => {
                    void showSource(file);
                  }}
                  onPreview={(test, index) => {
                    void showScreenshot(test.id, index, test.title);
                  }}
                  onArtifact={(index) => {
                    void showScreenshot("__spec_artifact__", index, spec.file);
                  }}
                  onReport={
                    run.source === "interactive"
                      ? (id) => {
                          void showReport(id);
                        }
                      : undefined
                  }
                />
              ))}
              {!groups.length ? (
                <Text
                  style={{
                    color: colors.foregroundMuted,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {filter === "flaky"
                    ? `No flaky tests${live(run) ? " so far" : ""}.`
                    : filter === "failed"
                      ? `No failures${live(run) ? " so far" : ""}.`
                      : live(run)
                        ? "Waiting for the first spec…"
                        : "No spec details available."}
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
                  Showing up to 300 test details, with failures and running
                  tests first. File counts cover the full run.
                </Text>
              ) : null}
            </View>
            {run.source === "interactive" ? (
              <View style={{ alignSelf: "flex-start" }}>
                <Action
                  label="Spec report"
                  icon="FileText"
                  colors={colors}
                  disabled={busy || !run.startedAt}
                  onPress={() => {
                    void showReport();
                  }}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <DetailModal
        title={detail?.title || "Details"}
        open={Boolean(detail)}
        wide={Boolean(detail?.wide)}
        colors={colors}
        close={() => setDetail(null)}
      >
        {detail?.gallery ? (
          <MediaGallery
            key={`${detail.gallery.runId}:${detail.title}`}
            gallery={detail.gallery}
            workspaceId={workspaceId}
            runId={detail.gallery.runId}
            colors={colors}
          />
        ) : detail?.source ? (
          <SourcePreview
            file={detail.source.file}
            text={detail.source.text}
            colors={colors}
          />
        ) : (
          <Text
            selectable
            style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}
          >
            {detail?.text}
          </Text>
        )}
      </DetailModal>
    </View>
  );
}
