export type VideoJobStatus =
	| "pending"
	| "generating_config"
	| "rendering"
	| "uploading"
	| "completed"
	| "failed";

export type VideoAspectRatio = "9:16" | "1:1" | "16:9";

// --- Config Types ---

export interface GradientBackground {
	type: "gradient";
	colors: string[];
	angle?: number;
}

export interface SolidBackground {
	type: "solid";
	color: string;
}

export interface ImageBackground {
	type: "image";
	url: string;
	fit?: "cover" | "contain" | "fill";
}

export interface VideoBackgroundConfig {
	type: "video";
	url: string;
	fit?: "cover" | "contain" | "fill";
}

export type BackgroundConfig =
	| GradientBackground
	| SolidBackground
	| ImageBackground
	| VideoBackgroundConfig;

export interface FontConfig {
	family: string;
	weight?: number;
	style?: "normal" | "italic";
}

export interface SpringAnimationConfig {
	type: "spring";
	mass?: number;
	damping?: number;
	stiffness?: number;
}

export interface EasingAnimationConfig {
	type: "easing";
	function:
		| "linear"
		| "ease-in"
		| "ease-out"
		| "ease-in-out"
		| "bounce"
		| "elastic";
}

export type AnimationConfig = SpringAnimationConfig | EasingAnimationConfig;

export interface MotionEffect {
	property: "opacity" | "translateX" | "translateY" | "scale" | "rotate";
	from: number;
	to: number;
	animation?: AnimationConfig;
	delay_frames?: number;
}

export interface ElementAnimation {
	enter?: MotionEffect[];
	exit?: MotionEffect[];
}

export interface VideoTextElement {
	type: "text";
	content: string;
	font?: FontConfig;
	color?: string;
	size?: number;
	weight?: number;
	alignment?: "left" | "center" | "right";
	position: { x: number; y: number };
	width?: number;
	animation?: ElementAnimation;
}

export interface VideoMediaElement {
	type: "image" | "video" | "audio";
	url: string;
	fit?: "cover" | "contain" | "fill";
	size?: { width: number; height: number };
	position?: { x: number; y: number };
	volume?: number;
	animation?: ElementAnimation;
}

export type SceneElement = VideoTextElement | VideoMediaElement;

export interface TransitionTiming {
	type: "linear" | "spring";
	duration_frames?: number;
	mass?: number;
	damping?: number;
	stiffness?: number;
}

export interface TransitionConfig {
	type: "fade" | "slide" | "wipe" | "flip";
	direction?: "from-left" | "from-right" | "from-top" | "from-bottom";
	timing?: TransitionTiming;
}

export interface VideoScene {
	id: string;
	duration_frames: number;
	background: BackgroundConfig;
	elements: SceneElement[];
	transition_in?: TransitionConfig;
}

export interface GlobalAudio {
	url: string;
	volume?: number;
}

export interface VideoConfigData {
	version: 2;
	template: "universal";
	fps: number;
	global_font?: FontConfig;
	global_audio?: GlobalAudio;
	scenes: VideoScene[];
}

// --- API Models ---

export interface VideoConfig {
	id: string;
	accountId: string;
	title: string;
	prompt?: string;
	postId?: string;
	config: VideoConfigData;
	template: string;
	createdAt: string;
	updatedAt: string;
}

export interface VideoJob {
	id: string;
	accountId: string;
	videoConfigId: string;
	status: VideoJobStatus;
	aspectRatio: VideoAspectRatio;
	mediaId?: string;
	errorMessage?: string;
	startedAt?: string;
	completedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface GenerateVideoConfigRequest {
	title: string;
	prompt: string;
	post_id?: string;
}

export interface CreateRenderJobRequest {
	aspect_ratio: VideoAspectRatio;
}

export interface UpdateVideoConfigRequest {
	title?: string;
	config?: VideoConfigData;
	template?: string;
}
