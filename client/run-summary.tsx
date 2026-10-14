import { Text, View } from "react-native";
import { Icon } from "@getpaseo/plugin/client/react-native";
import type { PulseRun } from "../shared/rpc";
import { basename, duration, tone, statusIcon, live, type Colors } from "./ui";

export function RunSummary({
  run,
  colors,
  now,
}: {
  run: PulseRun;
  colors: Colors;
  now: number;
}) {
  const completed = run.passed + run.failed + run.pending + run.skipped;
  const total = run.totalSpecs ?? run.totalTests;
  const done = run.totalSpecs !== null ? run.completedSpecs : completed;
  const unit = run.totalSpecs !== null ? "specs" : "tests";
  const status =
    run.status === "empty"
      ? "No executed tests"
      : live(run) && run.failed
        ? `Running · ${run.failed} failed`
        : run.status[0].toUpperCase() + run.status.slice(1);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Icon
          name={statusIcon(run.status)}
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
      {total !== null ? (
        <View style={{ gap: 6 }}>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: Math.max(1, total),
              now: Math.min(done, total),
              text: `${done} of ${total} ${unit} completed`,
            }}
            style={{
              height: 5,
              backgroundColor: colors.surface2,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 5,
                width: `${Math.min(100, (done / Math.max(1, total)) * 100)}%`,
                backgroundColor: tone(run.status, colors),
              }}
            />
          </View>
          <Text
            style={{
              color: colors.foregroundMuted,
              fontSize: 11,
              fontVariant: ["tabular-nums"],
            }}
          >
            {done} / {total} {unit} completed
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {(
          [
            ["passed", run.passed, colors.statusSuccess],
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
