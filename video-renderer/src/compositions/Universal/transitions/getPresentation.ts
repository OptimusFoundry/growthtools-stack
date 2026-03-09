import {
  linearTiming,
  springTiming,
  type TransitionPresentation,
  type TransitionTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { flip } from "@remotion/transitions/flip";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import type { TransitionConfig } from "../../types";

const DEFAULT_TRANSITION_FRAMES = 15;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPresentation = TransitionPresentation<Record<string, any>>;

export function getPresentation(config: TransitionConfig): {
  presentation: AnyPresentation;
  timing: TransitionTiming;
} {
  const direction = config.direction ?? "from-left";

  let presentation: AnyPresentation;
  switch (config.type) {
    case "fade":
      presentation = fade() as AnyPresentation;
      break;
    case "slide":
      presentation = slide({ direction }) as AnyPresentation;
      break;
    case "wipe":
      presentation = wipe({ direction }) as AnyPresentation;
      break;
    case "flip":
      presentation = flip({ direction }) as AnyPresentation;
      break;
    default:
      presentation = fade() as AnyPresentation;
  }

  let timing: TransitionTiming;
  if (config.timing?.type === "spring") {
    timing = springTiming({
      config: {
        mass: config.timing.mass ?? 1,
        damping: config.timing.damping ?? 20,
        stiffness: config.timing.stiffness ?? 100,
      },
    });
  } else {
    timing = linearTiming({
      durationInFrames: config.timing?.duration_frames ?? DEFAULT_TRANSITION_FRAMES,
    });
  }

  return { presentation, timing };
}
