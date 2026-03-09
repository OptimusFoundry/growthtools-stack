import React from "react";
import { Audio, Img, Video } from "remotion";
import type { MediaElement as MediaElementType } from "../../types";
import { useElementMotion } from "../animations/useElementMotion";

interface MediaElementProps {
  element: MediaElementType;
  sceneDurationFrames: number;
}

export const MediaElementRenderer: React.FC<MediaElementProps> = ({
  element,
  sceneDurationFrames,
}) => {
  const enterStyle = useElementMotion(
    element.animation?.enter,
    sceneDurationFrames,
    "enter",
  );

  const exitStyle = useElementMotion(
    element.animation?.exit,
    sceneDurationFrames,
    "exit",
  );

  if (element.type === "audio") {
    return <Audio src={element.url} volume={element.volume ?? 1} />;
  }

  const combinedOpacity =
    element.animation?.exit &&
    enterStyle.opacity !== undefined &&
    exitStyle.opacity !== undefined
      ? (enterStyle.opacity as number) * (exitStyle.opacity as number)
      : (enterStyle.opacity ?? 1);

  const combinedTransform = [enterStyle.transform, exitStyle.transform]
    .filter(Boolean)
    .join(" ");

  const positionStyle: React.CSSProperties = {
    position: "absolute",
    left: element.position ? `${element.position.x}%` : "50%",
    top: element.position ? `${element.position.y}%` : "50%",
    transform: `translate(-50%, -50%) ${combinedTransform}`.trim(),
    width: element.size ? `${element.size.width}%` : undefined,
    height: element.size ? `${element.size.height}%` : undefined,
    opacity: combinedOpacity,
  };

  if (element.type === "image") {
    return (
      <div style={positionStyle}>
        <Img
          src={element.url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: element.fit ?? "contain",
          }}
        />
      </div>
    );
  }

  // video element
  return (
    <div style={positionStyle}>
      <Video
        src={element.url}
        volume={element.volume ?? 0}
        style={{
          width: "100%",
          height: "100%",
          objectFit: element.fit ?? "contain",
        }}
      />
    </div>
  );
};
