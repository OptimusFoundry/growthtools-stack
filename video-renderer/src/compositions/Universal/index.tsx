import React from "react";
import { AbsoluteFill, Audio } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import type { VideoConfigV2 } from "../types";
import { useDynamicFont } from "./fonts/useDynamicFont";
import { SceneRenderer } from "./SceneRenderer";
import { getPresentation } from "./transitions/getPresentation";

export const UniversalComposition: React.FC<{ config: VideoConfigV2 }> = ({
  config,
}) => {
  const globalFont = useDynamicFont(config.global_font);

  return (
    <AbsoluteFill>
      {config.global_audio && (
        <Audio src={config.global_audio.url} volume={config.global_audio.volume ?? 0.5} />
      )}

      <TransitionSeries>
        {config.scenes.map((scene, index) => {
          if (index > 0 && scene.transition_in) {
            const { presentation, timing } = getPresentation(scene.transition_in);
            return (
              <React.Fragment key={scene.id}>
                <TransitionSeries.Transition
                  presentation={presentation}
                  timing={timing}
                />
                <TransitionSeries.Sequence durationInFrames={scene.duration_frames}>
                  <SceneRenderer scene={scene} globalFont={globalFont} />
                </TransitionSeries.Sequence>
              </React.Fragment>
            );
          }

          return (
            <TransitionSeries.Sequence
              key={scene.id}
              durationInFrames={scene.duration_frames}
            >
              <SceneRenderer scene={scene} globalFont={globalFont} />
            </TransitionSeries.Sequence>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
