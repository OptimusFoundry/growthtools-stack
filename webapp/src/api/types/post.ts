/**
 * Post API Types
 *
 * API response types for posts (snake_case, matches Go JSON tags)
 */

import type { ContentType, PostSource, PostStatus } from "@/types/post";

export interface ApiPost {
	id: string;
	account_id: string;
	title?: string;
	content: string;
	content_type: ContentType;
	status: PostStatus;
	scheduled_at?: string;
	published_at?: string;
	media_ids: string[];
	tags: string[];
	ai_generated: boolean;
	base_content?: string;
	source: PostSource;
	github_event_id?: string;
	platforms: string[];
	created_at: string;
	updated_at: string;
}

/**
 * Slim list item returned by GET /api/protected/posts.
 * Omits `content`, `base_content`, and `deleted_at` — use ApiPost for the
 * single-post endpoint and create/update responses.
 */
export interface ApiPostListItem {
	id: string;
	account_id: string;
	title?: string;
	content_type: ContentType;
	status: PostStatus;
	scheduled_at?: string;
	published_at?: string;
	media_ids: string[];
	tags: string[];
	ai_generated: boolean;
	source: PostSource;
	github_event_id?: string;
	platforms: string[];
	created_at: string;
	updated_at: string;
}

export interface ApiPlatformPost {
	id: string;
	post_id: string;
	platform: string;
	platform_post_id?: string;
	status: "pending" | "publishing" | "published" | "failed";
	content?: string;
	thread_segments?: { content: string; image_index?: number }[];
	published_at?: string;
	error_message?: string;
	engagement: {
		impressions?: number;
		likes?: number;
		comments?: number;
		shares?: number;
		clicks?: number;
	};
	attempt_count: number;
	max_attempts: number;
	next_retry_at?: string;
	last_attempt_at?: string;
	created_at: string;
	updated_at: string;
}
