import React from "react";
import { AbsoluteFill } from "remotion";
import type { OverlayElement as OverlayElementType } from "../../types";

interface OverlayElementProps {
  element: OverlayElementType;
}

export const OverlayElementRenderer: React.FC<OverlayElementProps> = ({
  element,
}) => {
  switch (element.style) {
    case "vignette":
      return (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.8) 100%)",
            opacity: element.opacity ?? 0.7,
          }}
        />
      );

    case "letterbox": {
      const barHeight = "12%";
      return (
        <AbsoluteFill style={{ opacity: element.opacity ?? 1 }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: barHeight,
              background: "#000",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: barHeight,
              background: "#000",
            }}
          />
        </AbsoluteFill>
      );
    }

    case "color-grade":
      return (
        <AbsoluteFill
          style={{
            backgroundColor: element.color ?? "#FF6B35",
            opacity: element.opacity ?? 0.15,
            mixBlendMode: "multiply",
          }}
        />
      );

    case "film-grain":
      return (
        <AbsoluteFill
          style={{
            opacity: element.opacity ?? 0.08,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />
      );

    default:
      return null;
  }
};
