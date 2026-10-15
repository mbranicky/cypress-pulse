import { createElement } from "react";
import { Platform, Text } from "react-native";

/** Desktop/web media control; native clients keep a readable fallback without a DOM dependency. */
export function VideoPreview({ uri, color }: { uri: string; color: string }) {
  if (Platform.OS !== "web")
    return createElement(
      Text,
      { style: { color } },
      "Video playback is available in the Paseo desktop or web app.",
    );
  return createElement("video", {
    src: uri,
    controls: true,
    preload: "metadata",
    playsInline: true,
    "aria-label": "Cypress spec video",
    style: {
      width: "100%",
      maxHeight: 560,
      background: "#000",
      borderRadius: 8,
    },
  });
}
