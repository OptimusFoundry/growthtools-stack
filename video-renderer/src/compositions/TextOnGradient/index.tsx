import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Scene } from "./Scene";
import type { VideoConfig } from "./types";

export const TextOnGradient: React.FC<{ config: VideoConfig }> = ({
  config,
}) => {
  let frameOffset = 0;

  return (
    <AbsoluteFill>
      {config.scenes.map((scene) => {
        const from = frameOffset;
        frameOffset += scene.duration_frames;

        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={scene.duration_frames}
          >
            <Scene scene={scene} theme={config.theme} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
