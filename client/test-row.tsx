import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, copyText } from "@getpaseo/plugin/client/react-native";
import type { PulseTest } from "../shared/rpc";
import { Action, duration, StatusIcon, tone, type Colors } from "./ui";

export function TestRow({
  test,
  colors,
  onPreview,
  onReport,
  onInspect,
  busy,
  grouped = false,
}: {
  test: PulseTest;
  colors: Colors;
  onPreview(test: PulseTest, index: number): void;
  onReport?: () => void;
  onInspect(test: PulseTest, view: "details" | "logs"): void;
  busy: boolean;
  grouped?: boolean;
}) {
  const [expanded, setExpanded] = useState(test.status === "failed");
  const [stack, setStack] = useState(false);
  const errorText = test.error?.message || "Test failed";
  const stackText =
    test.error?.stack || errorText.match(/\n\s+at [\s\S]*/)?.[0]?.trim();
  const message = test.error?.stack
    ? errorText
    : errorText.split(/\n\s+at /)[0];
  const suite = test.titlePath.slice(0, -1).join(" › ");
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 4,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${test.title}, ${test.status}. ${expanded ? "Collapse" : "Expand"} details`}
        accessibilityState={{ expanded }}
        onPress={(event) => {
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <StatusIcon
          status={test.status}
          size={14}
          color={tone(test.status, colors)}
        />
        <View style={{ flex: 1, gap: 2, paddingVertical: 6 }}>
          {suite ? (
            <Text
              numberOfLines={1}
              style={{
                color: colors.foregroundMuted,
                fontSize: 10,
                lineHeight: 15,
              }}
            >
              {suite}
            </Text>
          ) : null}
          <Text
            style={{
              color: colors.foreground,
              fontSize: 12,
              lineHeight: 18,
              fontWeight: test.status === "failed" ? "600" : "400",
            }}
          >
            {test.title}
            {test.status === "passed" && test.retry > 0 ? " · flaky" : ""}
          </Text>
        </View>
        <Text
          style={{
            color: colors.foregroundMuted,
            fontSize: 10,
            fontVariant: ["tabular-nums"],
          }}
        >
          {test.status === "running"
            ? "Running"
            : test.status === "pending" ||
                test.status === "skipped" ||
                test.status === "queued"
              ? "—"
              : test.duration >= 1000
                ? duration(test.duration)
                : `${Math.round(test.duration)} ms`}
        </Text>
        <Icon
          name={expanded ? "ChevronDown" : "ChevronRight"}
          size={12}
          color={colors.foregroundMuted}
        />
      </Pressable>
      {expanded ? (
        <View style={{ gap: 8, marginLeft: 22, paddingBottom: 8 }}>
          {grouped && !test.error ? (
            <Text
              selectable
              style={{
                color: colors.foregroundMuted,
                fontSize: 11,
                lineHeight: 17,
              }}
            >
              {test.titlePath.join(" › ") || test.title}
              {"\n"}
              {test.status[0].toUpperCase() + test.status.slice(1)}
              {["passed", "failed"].includes(test.status)
                ? ` · ${Math.round(test.duration).toLocaleString()} ms`
                : ""}
            </Text>
          ) : null}
          {!grouped || test.retry ? (
            <Text
              selectable
              style={{
                color: colors.foregroundMuted,
                fontSize: 11,
                lineHeight: 16,
              }}
            >
              {!grouped ? test.file : ""}
              {test.retry
                ? `${grouped ? "" : " · "}${test.retry} ${test.retry === 1 ? "retry" : "retries"}`
                : ""}
            </Text>
          ) : null}
          {test.error ? (
            <View
              style={{
                gap: 6,
                backgroundColor: colors.surface1,
                borderRadius: 6,
                padding: 10,
              }}
            >
              <Text
                selectable
                style={{
                  color: colors.foreground,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {message}
              </Text>
              {stack && stackText ? (
                <Text
                  selectable
                  style={{
                    color: colors.foregroundMuted,
                    fontSize: 11,
                    lineHeight: 17,
                    fontFamily: "monospace",
                  }}
                >
                  {stackText}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
            <Action
              label="Test details"
              icon="FileCode"
              colors={colors}
              disabled={busy}
              onPress={() => onInspect(test, "details")}
            />
            <Action
              label="Logs"
              icon="Logs"
              colors={colors}
              disabled={busy}
              onPress={() => onInspect(test, "logs")}
            />
            {stackText ? (
              <Action
                label={stack ? "Hide stack" : "Stack trace"}
                colors={colors}
                selected={stack}
                onPress={() => setStack((value) => !value)}
              />
            ) : null}
            {test.error ? (
              <Action
                label="Copy error"
                icon="Copy"
                colors={colors}
                onPress={() => {
                  void copyText(
                    `${test.error?.message || ""}\n${test.error?.stack || ""}`,
                  );
                }}
              />
            ) : null}
            {!test.error && test.status === "failed" && onReport ? (
              <Action
                label="Read failure"
                colors={colors}
                disabled={busy}
                onPress={onReport}
              />
            ) : null}
            {test.attachments.some((item) => item.kind === "screenshot") ? (
              <Action
                label="Screenshots"
                icon="Image"
                colors={colors}
                disabled={busy}
                onPress={() =>
                  onPreview(
                    test,
                    test.attachments.findIndex(
                      (item) => item.kind === "screenshot",
                    ),
                  )
                }
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
