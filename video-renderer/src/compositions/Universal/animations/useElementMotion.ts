import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { AnimationConfig, MotionEffect } from "../../types";

function computeValue(
  effect: MotionEffect,
  progress: number,
): number {
  if (effect.keyframes && effect.keyframes.length >= 2) {
    const inputRange = effect.keyframes.map((kf) => kf.progress);
    const outputRange = effect.keyframes.map((kf) => kf.value);
    return interpolate(progress, inputRange, outputRange, {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }
  return interpolate(progress, [0, 1], [effect.from, effect.to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function getProgress(
  frame: number,
  fps: number,
  animation: AnimationConfig | undefined,
  delayFrames: number,
): number {
  const adjustedFrame = Math.max(0, frame - delayFrames);

  if (!animation || animation.type === "spring") {
    const config = animation?.type === "spring"
      ? {
          damping: animation.damping ?? 20,
          mass: animation.mass ?? 1,
          stiffness: animation.stiffness ?? 100,
        }
      : { damping: 20 };

    return spring({ frame: adjustedFrame, fps, config });
  }

  // Easing-based: use 30 frames as default duration
  const duration = 30;
  const t = Math.min(adjustedFrame / duration, 1);

  switch (animation.function) {
    case "linear":
      return t;
    case "ease-in":
      return t * t;
    case "ease-out":
      return 1 - (1 - t) * (1 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    case "bounce": {
      const n1 = 7.5625;
      const d1 = 2.75;
      let x = t;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) { x -= 1.5 / d1; return n1 * x * x + 0.75; }
      if (x < 2.5 / d1) { x -= 2.25 / d1; return n1 * x * x + 0.9375; }
      x -= 2.625 / d1;
      return n1 * x * x + 0.984375;
    }
    case "elastic":
      return t === 0 ? 0 : t === 1 ? 1
        : -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
    default:
      return t;
  }
}

export function useElementMotion(
  effects: MotionEffect[] | undefined,
  sceneDurationFrames: number,
  phase: "enter" | "exit",
): React.CSSProperties {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!effects || effects.length === 0) {
    return phase === "enter" ? { opacity: 1 } : {};
  }

  const style: React.CSSProperties = {};
  const transforms: string[] = [];

  for (const effect of effects) {
    const effectFrame = phase === "exit"
      ? Math.max(0, sceneDurationFrames - frame)
      : frame;

    const progress = getProgress(
      effectFrame,
      fps,
      effect.animation,
      effect.delay_frames ?? 0,
    );

    const value = computeValue(effect, progress);

    switch (effect.property) {
      case "opacity":
        style.opacity = value;
        break;
      case "translateX":
        transforms.push(`translateX(${value}px)`);
        break;
      case "translateY":
        transforms.push(`translateY(${value}px)`);
        break;
      case "scale":
        transforms.push(`scale(${value})`);
        break;
      case "rotate":
        transforms.push(`rotate(${value}deg)`);
        break;
      case "blur":
        style.filter = `blur(${value}px)`;
        break;
      case "skewX":
        transforms.push(`skewX(${value}deg)`);
        break;
      case "skewY":
        transforms.push(`skewY(${value}deg)`);
        break;
    }
  }

  if (transforms.length > 0) {
    style.transform = transforms.join(" ");
  }

  return style;
}
