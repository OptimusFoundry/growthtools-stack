import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VideoScene, VideoTheme } from "./types";

interface SceneProps {
  scene: VideoScene;
  theme: VideoTheme;
}

export const Scene: React.FC<SceneProps> = ({ scene, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({ frame, fps, config: { damping: 20 } });

  const getTextAnimation = () => {
    switch (scene.animation) {
      case "slide_up":
        return {
          transform: `translateY(${interpolate(enterProgress, [0, 1], [60, 0])}px)`,
          opacity: enterProgress,
        };
      case "fade":
        return { opacity: enterProgress };
      case "stagger":
        return {
          transform: `translateY(${interpolate(enterProgress, [0, 1], [40, 0])}px)`,
          opacity: enterProgress,
        };
      default:
        return { opacity: enterProgress };
    }
  };

  const subtextDelay = scene.animation === "stagger" ? 8 : 0;
  const subtextProgress = spring({
    frame: Math.max(0, frame - subtextDelay),
    fps,
    config: { damping: 20 },
  });

  const gradient = `linear-gradient(135deg, ${theme.background_colors.join(", ")})`;

  return (
    <AbsoluteFill
      style={{
        background: gradient,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
      }}
    >
      <div style={getTextAnimation()}>
        <h1
          style={{
            color: theme.text_color,
            fontSize: 72,
            fontFamily: theme.font_family,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          {scene.text}
        </h1>
      </div>
      {scene.subtext && (
        <div
          style={{
            opacity: subtextProgress,
            transform: `translateY(${interpolate(subtextProgress, [0, 1], [20, 0])}px)`,
            marginTop: 24,
          }}
        >
          <p
            style={{
              color: theme.accent_color,
              fontSize: 36,
              fontFamily: theme.font_family,
              fontWeight: 500,
              textAlign: "center",
              margin: 0,
            }}
          >
            {scene.subtext}
          </p>
        </div>
      )}
    </AbsoluteFill>
  );
};
