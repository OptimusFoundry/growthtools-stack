import React from "react";
import { AbsoluteFill, Img, Video } from "remotion";
import type { BackgroundConfig } from "../../types";

interface BackgroundProps {
  config: BackgroundConfig;
}

export const Background: React.FC<BackgroundProps> = ({ config }) => {
  switch (config.type) {
    case "gradient": {
      const angle = config.angle ?? 135;
      const gradient = `linear-gradient(${angle}deg, ${config.colors.join(", ")})`;
      return <AbsoluteFill style={{ background: gradient }} />;
    }

    case "solid":
      return <AbsoluteFill style={{ backgroundColor: config.color }} />;

    case "image":
      return (
        <AbsoluteFill>
          <Img
            src={config.url}
            style={{
              width: "100%",
              height: "100%",
              objectFit: config.fit ?? "cover",
            }}
          />
        </AbsoluteFill>
      );

    case "video":
      return (
        <AbsoluteFill>
          <Video
            src={config.url}
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: config.fit ?? "cover",
            }}
          />
        </AbsoluteFill>
      );

    default:
      return <AbsoluteFill style={{ backgroundColor: "#000" }} />;
  }
};
