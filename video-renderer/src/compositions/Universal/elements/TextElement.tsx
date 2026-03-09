import React from "react";
import type { TextElement as TextElementType } from "../../types";
import { useElementMotion } from "../animations/useElementMotion";
import { useDynamicFont } from "../fonts/useDynamicFont";

interface TextElementProps {
  element: TextElementType;
  sceneDurationFrames: number;
  globalFont?: string;
}

export const TextElementRenderer: React.FC<TextElementProps> = ({
  element,
  sceneDurationFrames,
  globalFont,
}) => {
  const fontFamily = useDynamicFont(element.font) || globalFont || "sans-serif";

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

  const combinedStyle: React.CSSProperties = {
    ...enterStyle,
    ...(element.animation?.exit ? exitStyle : {}),
  };

  // Merge opacity: multiply enter and exit
  if (
    element.animation?.exit &&
    enterStyle.opacity !== undefined &&
    exitStyle.opacity !== undefined
  ) {
    combinedStyle.opacity =
      (enterStyle.opacity as number) * (exitStyle.opacity as number);
  }

  // Merge transforms
  if (enterStyle.transform && exitStyle.transform) {
    combinedStyle.transform = `${enterStyle.transform} ${exitStyle.transform}`;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: `${element.position.x}%`,
        top: `${element.position.y}%`,
        transform: `translate(-50%, -50%) ${combinedStyle.transform ?? ""}`.trim(),
        width: element.width ? `${element.width}%` : undefined,
        textAlign: element.alignment ?? "center",
        color: element.color ?? "#ffffff",
        fontSize: element.size ?? 48,
        fontWeight: element.weight ?? element.font?.weight ?? 700,
        fontFamily,
        fontStyle: element.font?.style ?? "normal",
        lineHeight: 1.2,
        opacity: combinedStyle.opacity ?? 1,
      }}
    >
      {element.content}
    </div>
  );
};
