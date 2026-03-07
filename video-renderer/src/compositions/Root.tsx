import React from "react";
import { Composition } from "remotion";
import { TextOnGradient } from "./TextOnGradient";
import type { VideoConfig } from "./TextOnGradient/types";

const defaultConfig: VideoConfig = {
  template: "text_on_gradient",
  theme: {
    background_colors: ["#667eea", "#764ba2"],
    text_color: "#ffffff",
    accent_color: "#ffd700",
    font_family: "Inter",
  },
  scenes: [
    {
      id: "scene_1",
      duration_frames: 90,
      text: "Hello World",
      subtext: "Welcome to Growth Tools Video",
      transition: "fade",
      animation: "slide_up",
    },
  ],
  fps: 30,
};

const getTotalFrames = (config: VideoConfig): number =>
  config.scenes.reduce((sum, s) => sum + s.duration_frames, 0);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TextOnGradient"
        component={TextOnGradient}
        durationInFrames={getTotalFrames(defaultConfig)}
        fps={defaultConfig.fps}
        width={1080}
        height={1920}
        defaultProps={{ config: defaultConfig }}
      />
    </>
  );
};
