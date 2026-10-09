import type { BadgeProps } from "@optimusfoundry/quiet";

export type PostStatus =
	| "draft"
	| "scheduled"
	| "publishing"
	| "published"
	| "failed"
	| "partially_published";

/**
 * Display metadata for each PostStatus. `badgeDot: false` keeps the plain pill
 * for the warning variant, whose dot quiet would otherwise add.
 */
export const POST_STATUS_META: Record<
	PostStatus,
	{ label: string; badgeVariant: BadgeProps["variant"]; badgeDot?: boolean }
> = {
	draft: { label: "Draft", badgeVariant: "secondary" },
	scheduled: { label: "Scheduled", badgeVariant: "warning", badgeDot: false },
	publishing: { label: "Publishing", badgeVariant: "default" },
	published: { label: "Published", badgeVariant: "success" },
	failed: { label: "Failed", badgeVariant: "error" },
	partially_published: {
		label: "Partial",
		badgeVariant: "warning",
		badgeDot: false,
	},
};
export type ContentType =
	| "text"
	| "image"
	| "video"
	| "carousel"
	| "thread"
	| "story"
	| "reel";
export type PostSource =
	| "manual"
	| "ai_generated"
	| "github_event"
	| "bulk_import";

export interface Post {
	id: string;
	accountId: string;
	title?: string;
	content: string;
	contentType: ContentType;
	status: PostStatus;
	scheduledAt?: string;
	publishedAt?: string;
	mediaIds: string[];
	tags: string[];
	aiGenerated: boolean;
	baseContent?: string;
	source: PostSource;
	githubEventId?: string;
	platforms: string[];
	createdAt: string;
	updatedAt: string;
}

/**
 * Slim list item — mirrors Post but without `content` and `baseContent`.
 * Returned by the list endpoint; use Post for the single-post endpoint and
 * create/update responses.
 */
export interface PostListItem {
	id: string;
	accountId: string;
	title?: string;
	contentType: ContentType;
	status: PostStatus;
	scheduledAt?: string;
	publishedAt?: string;
	mediaIds: string[];
	tags: string[];
	aiGenerated: boolean;
	source: PostSource;
	githubEventId?: string;
	platforms: string[];
	createdAt: string;
	updatedAt: string;
}

export interface PlatformPost {
	id: string;
	postId: string;
	platform: string;
	platformPostId?: string;
	status: "pending" | "publishing" | "published" | "failed";
	content?: string;
	threadSegments?: { content: string; imageIndex?: number }[];
	publishedAt?: string;
	errorMessage?: string;
	engagement: {
		impressions?: number;
		likes?: number;
		comments?: number;
		shares?: number;
		clicks?: number;
	};
	attemptCount: number;
	maxAttempts: number;
	nextRetryAt?: string;
	lastAttemptAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface PostFilters {
	status?: PostStatus;
	contentType?: ContentType;
	source?: PostSource;
	from?: string; // YYYY-MM-DD — inclusive lower bound
	to?: string; // YYYY-MM-DD — inclusive upper bound (handler treats as end-of-day)
	limit?: number;
	offset?: number;
}

export interface CreatePostRequest {
	title?: string;
	content: string;
	content_type: ContentType;
	status: PostStatus;
	scheduled_at?: string;
	media_ids?: string[];
	tags?: string[];
	platforms?: string[];
}

export interface UpdatePostRequest {
	title?: string;
	content?: string;
	content_type?: ContentType;
	status?: PostStatus;
	scheduled_at?: string;
	media_ids?: string[];
	tags?: string[];
}

export interface PlatformContentInput {
	platform: string;
	content?: string;
	thread_segments?: { content: string; image_index?: number }[];
}

export interface SaveDraftRequest {
	content: string;
	content_type: ContentType;
	tags?: string[];
	media_ids?: string[];
	ai_generated: boolean;
	base_content?: string;
	platforms: PlatformContentInput[];
}
