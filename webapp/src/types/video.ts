export type VideoJobStatus =
	| "pending"
	| "generating_config"
	| "rendering"
	| "uploading"
	| "completed"
	| "failed";

export type VideoAspectRatio = "9:16" | "1:1" | "16:9";

export interface VideoTheme {
	backgroundColors: string[];
	textColor: string;
	accentColor: string;
	fontFamily: string;
}

export interface VideoScene {
	id: string;
	durationFrames: number;
	text: string;
	subtext?: string;
	transition: "fade" | "slide" | "none";
	animation: "slide_up" | "fade" | "stagger";
}

export interface VideoConfigData {
	template: string;
	theme: VideoTheme;
	scenes: VideoScene[];
	fps: number;
}

export interface VideoConfig {
	id: string;
	accountId: string;
	title: string;
	postId?: string;
	config: Record<string, unknown>;
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
	config?: Record<string, unknown>;
	template?: string;
}
