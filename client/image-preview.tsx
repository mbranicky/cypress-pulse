import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { ScrollView } from "@getpaseo/plugin/client/react-native";
import { Action, type Colors } from "./ui";

export function ImagePreview({ uri, colors }: { uri: string; colors: Colors }) {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  }>();
  const [available, setAvailable] = useState(1000);
  const [zoom, setZoom] = useState<"fit" | 1 | 2>("fit");
  useEffect(() => {
    let alive = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (alive) setDimensions({ width, height });
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [uri]);
  const scale =
    zoom === "fit"
      ? Math.min(1, available / (dimensions?.width || available))
      : zoom;
  return (
    <View
      style={{ gap: 12 }}
      onLayout={(event) => setAvailable(event.nativeEvent.layout.width)}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        {(
          [
            ["Fit", "fit"],
            ["100%", 1],
            ["200%", 2],
          ] as const
        ).map(([label, value]) => (
          <Action
            key={label}
            label={label}
            selected={zoom === value}
            colors={colors}
            onPress={() => setZoom(value)}
          />
        ))}
        {dimensions ? (
          <Text
            style={{
              color: colors.foregroundMuted,
              fontSize: 11,
              marginLeft: 8,
            }}
          >
            {dimensions.width} × {dimensions.height} px · original image
          </Text>
        ) : null}
      </View>
      <ScrollView horizontal style={{ flexGrow: 0 }}>
        <Image
          accessibilityLabel="Cypress failure screenshot"
          source={{ uri }}
          resizeMode="contain"
          style={{
            width: (dimensions?.width || available) * scale,
            height: dimensions ? dimensions.height * scale : 440,
          }}
        />
      </ScrollView>
    </View>
  );
}
