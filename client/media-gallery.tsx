import { useState } from "react";
import { Text, View } from "react-native";
import { useRpc } from "@getpaseo/plugin/client";
import { useQuery } from "@tanstack/react-query";
import { screenshot } from "../shared/rpc";
import { Action, type Colors } from "./ui";
import { ImagePreview } from "./image-preview";
import { VideoPreview } from "./web";

export function MediaGallery({
  gallery,
  workspaceId,
  runId,
  colors,
}: {
  gallery: { testId: string; indices: number[]; initial: number };
  workspaceId: string;
  runId: string;
  colors: Colors;
}) {
  const [position, setPosition] = useState(gallery.initial);
  const preview = useRpc(screenshot);
  const query = useQuery({
    queryKey: [
      "pulse-media",
      workspaceId,
      runId,
      gallery.testId,
      gallery.indices[position],
    ],
    queryFn: () =>
      preview({
        workspaceId,
        runId,
        testId: gallery.testId,
        index: gallery.indices[position],
      }),
    gcTime: 0,
    retry: false,
  });
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Action
          label="Previous"
          icon="ChevronLeft"
          colors={colors}
          disabled={position === 0}
          onPress={() => setPosition(position - 1)}
        />
        <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>
          {position + 1} of {gallery.indices.length}
        </Text>
        <Action
          label="Next"
          icon="ChevronRight"
          colors={colors}
          disabled={position === gallery.indices.length - 1}
          onPress={() => setPosition(position + 1)}
        />
      </View>
      {query.isPending ? (
        <Text style={{ color: colors.foregroundMuted }}>Loading media…</Text>
      ) : query.error ? (
        <Text selectable style={{ color: colors.statusDanger }}>
          {query.error.message}
        </Text>
      ) : query.data ? (
        query.data.dataUri.startsWith("data:video/") ? (
          <VideoPreview
            key={position}
            uri={query.data.dataUri}
            color={colors.foregroundMuted}
          />
        ) : (
          <ImagePreview
            key={position}
            uri={query.data.dataUri}
            colors={colors}
          />
        )
      ) : null}
    </View>
  );
}
