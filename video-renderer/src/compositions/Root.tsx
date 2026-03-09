import React from "react";
import { Composition, registerRoot } from "remotion";
import { UniversalComposition } from "./Universal";
import type { VideoConfigV2 } from "./types";

const defaultConfig: VideoConfigV2 = {
  version: 2,
  template: "universal",
  fps: 30,
  global_font: { family: "Inter", weight: 700 },
  scenes: [
    {
      id: "scene_1",
      duration_frames: 90,
      background: {
        type: "gradient",
        colors: ["#667eea", "#764ba2"],
      },
      elements: [
        {
          type: "text",
          content: "Hello World",
          color: "#ffffff",
          size: 72,
          weight: 800,
          position: { x: 50, y: 42 },
          width: 80,
          animation: {
            enter: [
              { property: "opacity", from: 0, to: 1 },
              { property: "translateY", from: 60, to: 0 },
            ],
          },
        },
        {
          type: "text",
          content: "Welcome to Growth Tools Video",
          color: "#ffd700",
          size: 36,
          weight: 500,
          position: { x: 50, y: 58 },
          width: 80,
          animation: {
            enter: [
              { property: "opacity", from: 0, to: 1, delay_frames: 8 },
              { property: "translateY", from: 20, to: 0, delay_frames: 8 },
            ],
          },
        },
      ],
    },
  ],
};

const getTotalFrames = (config: VideoConfigV2): number =>
  config.scenes.reduce((sum, s) => sum + s.duration_frames, 0);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Universal"
        component={UniversalComposition}
        durationInFrames={getTotalFrames(defaultConfig)}
        fps={defaultConfig.fps}
        width={1080}
        height={1920}
        defaultProps={{ config: defaultConfig }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
