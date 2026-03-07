/**
 * Video API Types
 *
 * API response types for video configs and jobs (snake_case, matches Go JSON tags)
 */

import type { VideoAspectRatio, VideoJobStatus } from "@/types/video";

export interface ApiVideoConfig {
	id: string;
	account_id: string;
	title: string;
	post_id?: string;
	config: Record<string, unknown>;
	template: string;
	created_at: string;
	updated_at: string;
}

export interface ApiVideoJob {
	id: string;
	account_id: string;
	video_config_id: string;
	status: VideoJobStatus;
	aspect_ratio: VideoAspectRatio;
	media_id?: string;
	error_message?: string;
	started_at?: string;
	completed_at?: string;
	created_at: string;
	updated_at: string;
}
