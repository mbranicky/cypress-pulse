import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon, copyText } from "@getpaseo/plugin/client/react-native";
import type { PulseTest } from "../shared/rpc";
import { Action, duration, statusIcon, tone, type Colors } from "./ui";

export function TestRow({
  test,
  colors,
  onPreview,
  onReport,
  busy,
}: {
  test: PulseTest;
  colors: Colors;
  onPreview(test: PulseTest, index: number): void;
  onReport?: () => void;
  busy: boolean;
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
        onPress={() => setExpanded((value) => !value)}
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon
          name={statusIcon(test.status)}
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
            style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}
          >
            {test.title}
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
            : test.status === "pending" || test.status === "skipped"
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
          <Text
            selectable
            style={{
              color: colors.foregroundMuted,
              fontSize: 11,
              lineHeight: 16,
            }}
          >
            {test.file}
            {test.retry
              ? ` · ${test.retry} ${test.retry === 1 ? "retry" : "retries"}`
              : ""}
          </Text>
          {test.error ? (
            <View
              style={{
                gap: 6,
                borderLeftWidth: 2,
                borderLeftColor: colors.statusDanger,
                paddingLeft: 10,
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
            {test.attachments.map((item, index) =>
              item.kind === "screenshot" ? (
                <Action
                  key={item.path}
                  label={`Screenshot${item.attempt ? ` · attempt ${item.attempt}` : ""}`}
                  icon="Image"
                  colors={colors}
                  disabled={busy}
                  onPress={() => onPreview(test, index)}
                />
              ) : null,
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}
