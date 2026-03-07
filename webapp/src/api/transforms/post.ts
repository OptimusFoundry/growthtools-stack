/**
 * Post Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) post types
 */

import type { PlatformPost, Post } from "@/types/post";
import type { ApiPlatformPost, ApiPost } from "../types/post";

export function toPost(api: ApiPost): Post {
	return {
		id: api.id,
		accountId: api.account_id,
		title: api.title,
		content: api.content,
		contentType: api.content_type,
		status: api.status,
		scheduledAt: api.scheduled_at,
		publishedAt: api.published_at,
		mediaIds: api.media_ids ?? [],
		tags: api.tags ?? [],
		aiGenerated: api.ai_generated,
		baseContent: api.base_content,
		source: api.source,
		githubEventId: api.github_event_id,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
	};
}

export function toPosts(apiPosts: ApiPost[]): Post[] {
	return apiPosts.map(toPost);
}

export function toPlatformPost(api: ApiPlatformPost): PlatformPost {
	return {
		id: api.id,
		postId: api.post_id,
		platform: api.platform,
		platformPostId: api.platform_post_id,
		status: api.status,
		content: api.content,
		threadSegments: api.thread_segments,
		publishedAt: api.published_at,
		errorMessage: api.error_message,
		engagement: api.engagement,
		attemptCount: api.attempt_count,
		maxAttempts: api.max_attempts,
		nextRetryAt: api.next_retry_at,
		lastAttemptAt: api.last_attempt_at,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
	};
}
