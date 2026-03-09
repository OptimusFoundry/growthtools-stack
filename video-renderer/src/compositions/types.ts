// --- Background ---

export interface GradientBackground {
  type: "gradient";
  colors: string[];
  angle?: number; // degrees, default 135
}

export interface SolidBackground {
  type: "solid";
  color: string;
}

export interface ImageBackground {
  type: "image";
  url: string;
  fit?: "cover" | "contain" | "fill"; // default "cover"
}

export interface VideoBackground {
  type: "video";
  url: string;
  fit?: "cover" | "contain" | "fill";
}

export type BackgroundConfig =
  | GradientBackground
  | SolidBackground
  | ImageBackground
  | VideoBackground;

// --- Font ---

export interface FontConfig {
  family: string; // Google Font name
  weight?: number;
  style?: "normal" | "italic";
}

// --- Animation ---

export interface SpringAnimation {
  type: "spring";
  mass?: number;
  damping?: number;
  stiffness?: number;
}

export interface EasingAnimation {
  type: "easing";
  function: "linear" | "ease-in" | "ease-out" | "ease-in-out" | "bounce" | "elastic";
}

export type AnimationConfig = SpringAnimation | EasingAnimation;

// --- Motion Effects ---

export interface MotionEffect {
  property: "opacity" | "translateX" | "translateY" | "scale" | "rotate";
  from: number;
  to: number;
  animation?: AnimationConfig; // default: spring
  delay_frames?: number;
}

export interface ElementAnimation {
  enter?: MotionEffect[];
  exit?: MotionEffect[];
}

// --- Elements ---

export interface TextElement {
  type: "text";
  content: string;
  font?: FontConfig;
  color?: string;
  size?: number; // px
  weight?: number;
  alignment?: "left" | "center" | "right";
  position: { x: number; y: number }; // percentage 0-100
  width?: number; // percentage 0-100
  animation?: ElementAnimation;
}

export interface MediaElement {
  type: "image" | "video" | "audio";
  url: string;
  fit?: "cover" | "contain" | "fill";
  size?: { width: number; height: number }; // percentage 0-100
  position?: { x: number; y: number }; // percentage 0-100
  volume?: number; // 0-1, for video/audio
  animation?: ElementAnimation;
}

export type SceneElement = TextElement | MediaElement;

// --- Transitions ---

export interface TransitionTiming {
  type: "linear" | "spring";
  duration_frames?: number; // for linear
  mass?: number; // for spring
  damping?: number;
  stiffness?: number;
}

export interface TransitionConfig {
  type: "fade" | "slide" | "wipe" | "flip";
  direction?: "from-left" | "from-right" | "from-top" | "from-bottom";
  timing?: TransitionTiming;
}

// --- Scene ---

export interface SceneV2 {
  id: string;
  duration_frames: number;
  background: BackgroundConfig;
  elements: SceneElement[];
  transition_in?: TransitionConfig;
}

// --- Global Audio ---

export interface GlobalAudio {
  url: string;
  volume?: number; // 0-1
}

// --- Video Config V2 ---

export interface VideoConfigV2 {
  version: 2;
  template: "universal";
  fps: number;
  global_font?: FontConfig;
  global_audio?: GlobalAudio;
  scenes: SceneV2[];
}
