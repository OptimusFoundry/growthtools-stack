import React from "react";
import { AbsoluteFill } from "remotion";
import type { SceneV2 } from "../types";
import { Background } from "./backgrounds/Background";
import { MediaElementRenderer } from "./elements/MediaElement";
import { OverlayElementRenderer } from "./elements/OverlayElement";
import { TextElementRenderer } from "./elements/TextElement";

interface SceneRendererProps {
  scene: SceneV2;
  globalFont?: string;
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({
  scene,
  globalFont,
}) => {
  return (
    <AbsoluteFill>
      <Background config={scene.background} />
      {scene.elements.map((element, index) => {
        if (element.type === "text") {
          return (
            <TextElementRenderer
              key={`${scene.id}-el-${index}`}
              element={element}
              sceneDurationFrames={scene.duration_frames}
              globalFont={globalFont}
            />
          );
        }
        if (element.type === "overlay") {
          return (
            <OverlayElementRenderer
              key={`${scene.id}-el-${index}`}
              element={element}
            />
          );
        }
        return (
          <MediaElementRenderer
            key={`${scene.id}-el-${index}`}
            element={element}
            sceneDurationFrames={scene.duration_frames}
          />
        );
      })}
    </AbsoluteFill>
  );
};
