import { Text, View } from "react-native";
import { testProgress } from "../shared/progress.mjs";
import type { PulseRun } from "../shared/rpc";
import { basename, duration, tone, StatusIcon, live, type Colors } from "./ui";

export function RunSummary({
  run,
  colors,
  now,
}: {
  run: PulseRun;
  colors: Colors;
  now: number;
}) {
  const progress = testProgress(run);
  const segmentColor = (status: string) =>
    status === "flaky"
      ? colors.statusWarning
      : status === "pending" || status === "skipped"
        ? colors.foregroundMuted
        : tone(status, colors);
  const status =
    run.status === "empty"
      ? "No executed tests"
      : live(run) && run.failed
        ? `Running · ${run.failed} failed`
        : run.status[0].toUpperCase() + run.status.slice(1);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <StatusIcon
          status={run.status}
          size={16}
          color={tone(run.status, colors)}
        />
        <Text
          style={{
            flex: 1,
            color: run.failed ? colors.statusDanger : tone(run.status, colors),
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          {status}
        </Text>
        <Text
          style={{
            color: colors.foregroundMuted,
            fontSize: 12,
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
      <View style={{ gap: 5 }}>
        <Text
          style={{ color: colors.foreground, fontSize: 18, fontWeight: "600" }}
        >
          {basename(run.projectRoot)}
        </Text>
        <Text
          style={{
            color: colors.foregroundMuted,
            fontSize: 11,
            lineHeight: 17,
          }}
        >
          {run.source === "interactive"
            ? "Interactive"
            : run.mode === "headed"
              ? "Headed run"
              : "Headless run"}{" "}
          · {run.browser || "Browser starting"}
          {run.cypressVersion ? ` · Cypress ${run.cypressVersion}` : ""}
        </Text>
      </View>
      {run.activeSpec ? (
        <View style={{ gap: 3 }}>
          <Text
            selectable
            style={{
              color: colors.foreground,
              fontSize: 12,
              fontWeight: "500",
              lineHeight: 18,
            }}
          >
            {basename(run.activeSpec)}
          </Text>
          {run.activeSpec !== basename(run.activeSpec) ? (
            <Text
              selectable
              style={{
                color: colors.foregroundMuted,
                fontSize: 11,
                lineHeight: 16,
              }}
            >
              {run.activeSpec.replace(/[\\/][^\\/]+$/, "")}
            </Text>
          ) : null}
        </View>
      ) : null}
      {progress.total > 0 ? (
        <View style={{ gap: 7 }}>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: Math.max(1, progress.total),
              now: progress.completed,
              text: `${progress.completed} of ${progress.total} ${progress.known ? "known " : ""}tests completed; ${run.failed} failed; ${run.flaky} flaky`,
            }}
            style={{
              height: 7,
              flexDirection: "row",
              gap: 2,
              backgroundColor: colors.surface2,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            {progress.segments
              .filter((segment) => segment.count > 0)
              .map((segment) => (
                <View
                  key={segment.status}
                  style={{
                    flexGrow: segment.count,
                    flexBasis: 0,
                    height: 7,
                    backgroundColor: segmentColor(segment.status),
                  }}
                />
              ))}
            {progress.total > progress.completed ? (
              <View
                style={{
                  flexGrow: progress.total - progress.completed,
                  flexBasis: 0,
                }}
              />
            ) : null}
          </View>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 12,
              fontVariant: ["tabular-nums"],
            }}
          >
            <Text style={{ fontWeight: "600" }}>{progress.completed}</Text> /{" "}
            {progress.total} {progress.known ? "known " : ""}tests completed
          </Text>
          {progress.known && live(run) ? (
            <Text style={{ color: colors.foregroundMuted, fontSize: 10 }}>
              Total updates as Cypress loads each spec.
            </Text>
          ) : null}
        </View>
      ) : null}
      {run.totalSpecs !== null ? (
        <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>
          {run.completedSpecs} / {run.totalSpecs} specs completed
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {(
          [
            [
              "passed",
              Math.max(0, run.passed - run.flaky),
              colors.statusSuccess,
            ],
            [
              "flaky",
              run.flaky,
              run.flaky ? colors.statusWarning : colors.foregroundMuted,
            ],
            [
              "failed",
              run.failed,
              run.failed ? colors.statusDanger : colors.foregroundMuted,
            ],
            ["pending", run.pending, colors.foregroundMuted],
            ["skipped", run.skipped, colors.foregroundMuted],
          ] as const
        ).map(([label, value, color]) => (
          <Text
            key={label}
            style={{ color, fontSize: 12, fontVariant: ["tabular-nums"] }}
          >
            <Text style={{ fontWeight: "600" }}>{value}</Text> {label}
          </Text>
        ))}
      </View>
      {run.retries > 0 ? (
        <Text style={{ color: colors.foregroundMuted, fontSize: 11 }}>
          {run.retries} {run.retries === 1 ? "test" : "tests"} retried
        </Text>
      ) : null}
    </View>
  );
}
