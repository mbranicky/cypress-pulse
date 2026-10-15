import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "@getpaseo/plugin/client/react-native";
import type { PulseSpec, PulseTest } from "../shared/rpc";
import { Action, basename, statusIcon, tone, type Colors } from "./ui";
import { TestRow } from "./test-row";

export function SpecGroup({
  spec,
  tests,
  artifacts,
  colors,
  filter,
  busy,
  truncated,
  onSource,
  onPreview,
  onArtifact,
  onReport,
}: {
  spec: PulseSpec;
  tests: PulseTest[];
  artifacts: { index: number; path: string }[];
  colors: Colors;
  filter: "all" | "failed";
  busy: boolean;
  truncated: boolean;
  onSource(file: string): void;
  onPreview(test: PulseTest, index: number): void;
  onArtifact(index: number): void;
  onReport?: (testId: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const expanded =
    collapsed === null
      ? ["running", "failed", "error"].includes(spec.status) ||
        filter === "failed"
      : !collapsed;
  const visible = tests.filter(
    (test) => filter === "all" || test.status === "failed",
  );
  const folder = spec.file.includes("/")
    ? spec.file.slice(0, spec.file.lastIndexOf("/"))
    : "";
  const color = tone(spec.status, colors);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${basename(spec.file) || "spec"}`}
      accessibilityState={{ expanded }}
      onPress={() => setCollapsed(expanded)}
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: colors.surface1,
      }}
    >
      <View
        style={{
          borderLeftWidth: 3,
          borderLeftColor: color,
          paddingRight: 12,
          paddingVertical: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 31,
              alignItems: "center",
              alignSelf: "flex-start",
              paddingTop: 2,
            }}
          >
            <Icon
              name={expanded ? "ChevronDown" : "ChevronRight"}
              size={14}
              color={colors.foregroundMuted}
            />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Preview source of ${spec.file}`}
              disabled={busy || !spec.file}
              onPress={(event) => {
                event.stopPropagation();
                onSource(spec.file);
              }}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                maxWidth: "100%",
                minHeight: 18,
                justifyContent: "center",
                gap: 3,
                opacity: busy ? 0.5 : pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Text
                  style={{
                    flexShrink: 1,
                    color: colors.foreground,
                    fontSize: 13,
                    fontWeight: "600",
                    lineHeight: 18,
                  }}
                >
                  {basename(spec.file) || "Unreported spec"}
                </Text>
                {spec.file ? (
                  <Icon
                    name="ArrowUpRight"
                    size={12}
                    color={colors.foregroundMuted}
                  />
                ) : null}
              </View>
            </Pressable>
            {folder ? (
              <Text
                numberOfLines={1}
                style={{
                  color: colors.foregroundMuted,
                  fontSize: 10,
                  lineHeight: 15,
                }}
              >
                {folder}
              </Text>
            ) : null}
          </View>
        </View>
        <View
          style={{
            marginLeft: 31,
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            paddingBottom: 0,
          }}
        >
          {spec.status === "running" ? (
            <Text style={{ color: colors.accent, fontSize: 11 }}>Running</Text>
          ) : spec.status === "error" || spec.status === "interrupted" ? (
            <Text style={{ color, fontSize: 11 }}>{spec.status}</Text>
          ) : null}
          {(
            [
              [
                "passed",
                Math.max(0, spec.passed - spec.flaky),
                colors.statusSuccess,
              ],
              ["failed", spec.failed, colors.statusDanger],
              ["pending", spec.pending, colors.foregroundMuted],
              ["skipped", spec.skipped, colors.foregroundMuted],
              ["queued", spec.queued, colors.foregroundMuted],
              ["flaky", spec.flaky, colors.statusWarning],
            ] as const
          )
            .filter(([, count]) => count > 0)
            .map(([label, count, color]) => (
              <Text
                key={label}
                style={{ color, fontSize: 11, fontVariant: ["tabular-nums"] }}
              >
                {count} {label}
              </Text>
            ))}
          {!spec.observed && spec.status !== "running" ? (
            <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>
              No test details
            </Text>
          ) : null}
          {spec.retries > 0 ? (
            <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>
              {spec.retries} retried
            </Text>
          ) : null}
        </View>
      </View>
      {expanded ? (
        <View
          style={{
            paddingHorizontal: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.surface0,
          }}
        >
          {visible.map((test) => (
            <TestRow
              key={test.id}
              test={test}
              colors={colors}
              busy={busy}
              grouped
              onPreview={onPreview}
              onReport={onReport ? () => onReport(test.id) : undefined}
            />
          ))}
          {!visible.length ? (
            <Text
              style={{
                color: colors.foregroundMuted,
                fontSize: 12,
                lineHeight: 18,
                paddingVertical: 14,
              }}
            >
              {truncated && spec.observed > 0
                ? "Test details are outside the 300-test display limit."
                : spec.status === "running"
                  ? "Waiting for test results…"
                  : "No test details available."}
            </Text>
          ) : null}
          {artifacts.length ? (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 4,
                paddingVertical: 4,
              }}
            >
              {artifacts.map((item, index) => (
                <Action
                  key={item.path}
                  label={
                    artifacts.length > 1
                      ? `Screenshot ${index + 1}`
                      : "Screenshot"
                  }
                  icon="Image"
                  colors={colors}
                  disabled={busy}
                  onPress={() => onArtifact(item.index)}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
