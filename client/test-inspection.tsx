import { useState } from "react";
import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRpc } from "@getpaseo/plugin/client";
import { TextInput, copyText } from "@getpaseo/plugin/client/react-native";
import { testInspection, type PulseTest } from "../shared/rpc";
import { Action, type Colors } from "./ui";

export function TestInspection({
  workspaceId,
  runId,
  test,
  view,
  live,
  colors,
}: {
  workspaceId: string;
  runId: string;
  test: PulseTest;
  view: "details" | "logs";
  live: boolean;
  colors: Colors;
}) {
  const read = useRpc(testInspection);
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState<number>();
  const query = useQuery({
    queryKey: ["pulse-inspect", workspaceId, runId, test.id, view, attempt],
    queryFn: () => read({ workspaceId, runId, testId: test.id, view, attempt }),
    refetchInterval: live ? 2000 : false,
    retry: false,
  });
  const text = query.data?.text || "";
  const shown = search
    ? text
        .split("\n\n")
        .filter((row) => row.toLowerCase().includes(search.toLowerCase()))
        .join("\n\n")
    : text;
  return (
    <View style={{ gap: 12 }}>
      {view === "logs" ? (
        <>
          <TextInput
            accessibilityLabel="Search command logs"
            placeholder="Search command logs"
            placeholderTextColor={colors.foregroundMuted}
            value={search}
            onChangeText={setSearch}
            style={{
              minHeight: 40,
              paddingHorizontal: 10,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
              color: colors.foreground,
              backgroundColor: colors.surface1,
            }}
          />
          {test.retry > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
              <Action
                label="Latest attempt"
                selected={!attempt}
                colors={colors}
                onPress={() => setAttempt(undefined)}
              />
              <Action
                label="Previous attempt"
                disabled={(attempt || test.retry + 1) <= 1}
                colors={colors}
                onPress={() => setAttempt((attempt || test.retry + 1) - 1)}
              />
              <Action
                label="Next attempt"
                disabled={!attempt || attempt >= test.retry + 1}
                colors={colors}
                onPress={() => setAttempt((attempt || test.retry + 1) + 1)}
              />
              <Text
                style={{ color: colors.foregroundMuted, alignSelf: "center" }}
              >
                Attempt {attempt || test.retry + 1}
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
      <View style={{ flexDirection: "row", gap: 4 }}>
        <Action
          label="Refresh"
          icon="RefreshCw"
          colors={colors}
          disabled={query.isFetching}
          onPress={() => {
            void query.refetch();
          }}
        />
        <Action
          label="Copy"
          icon="Copy"
          colors={colors}
          disabled={!shown}
          onPress={() => {
            void copyText(shown);
          }}
        />
      </View>
      {query.data?.notice ? (
        <Text
          style={{
            color: colors.foregroundMuted,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {query.data.notice}
        </Text>
      ) : null}
      <Text
        selectable
        style={{
          color: query.error ? colors.statusDanger : colors.foreground,
          fontFamily: "monospace",
          fontSize: 12,
          lineHeight: 19,
        }}
      >
        {query.isPending
          ? "Loading test information…"
          : query.error
            ? query.error.message
            : shown ||
              (search
                ? "No matching command logs."
                : query.data?.notice
                  ? "No command logs available."
                  : "No commands reported for this test attempt.")}
      </Text>
    </View>
  );
}
