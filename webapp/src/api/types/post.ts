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
	source: PostSource;
	github_event_id?: string;
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
	published_at?: string;
	error_message?: string;
	engagement: {
		impressions?: number;
		likes?: number;
		comments?: number;
		shares?: number;
		clicks?: number;
	};
	created_at: string;
	updated_at: string;
}
