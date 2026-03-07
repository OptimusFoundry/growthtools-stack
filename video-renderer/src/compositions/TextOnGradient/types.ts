export interface VideoTheme {
  background_colors: string[];
  text_color: string;
  accent_color: string;
  font_family: string;
}

export interface VideoScene {
  id: string;
  duration_frames: number;
  text: string;
  subtext?: string;
  transition: "fade" | "slide" | "none";
  animation: "slide_up" | "fade" | "stagger";
}

export interface VideoConfig {
  template: string;
  theme: VideoTheme;
  scenes: VideoScene[];
  fps: number;
}
