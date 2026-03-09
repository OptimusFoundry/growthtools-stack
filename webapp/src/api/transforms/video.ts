/**
 * Video Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) video types
 */

import type { VideoConfig, VideoConfigData, VideoJob } from "@/types/video";
import type { ApiVideoConfig, ApiVideoJob } from "../types/video";

export function toVideoConfig(api: ApiVideoConfig): VideoConfig {
	return {
		id: api.id,
		accountId: api.account_id,
		title: api.title,
		prompt: api.prompt,
		postId: api.post_id,
		config: api.config as unknown as VideoConfigData,
		template: api.template,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
	};
}

export function toVideoConfigs(apiConfigs: ApiVideoConfig[]): VideoConfig[] {
	return apiConfigs.map(toVideoConfig);
}

export function toVideoJob(api: ApiVideoJob): VideoJob {
	return {
		id: api.id,
		accountId: api.account_id,
		videoConfigId: api.video_config_id,
		status: api.status,
		aspectRatio: api.aspect_ratio,
		mediaId: api.media_id,
		errorMessage: api.error_message,
		startedAt: api.started_at,
		completedAt: api.completed_at,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
	};
}

export function toVideoJobs(apiJobs: ApiVideoJob[]): VideoJob[] {
	return apiJobs.map(toVideoJob);
}
