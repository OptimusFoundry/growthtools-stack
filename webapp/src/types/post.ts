export type PostStatus =
	| "draft"
	| "scheduled"
	| "publishing"
	| "published"
	| "failed";
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
	source: PostSource;
	githubEventId?: string;
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
	publishedAt?: string;
	errorMessage?: string;
	engagement: {
		impressions?: number;
		likes?: number;
		comments?: number;
		shares?: number;
		clicks?: number;
	};
	createdAt: string;
	updatedAt: string;
}

export interface PostFilters {
	status?: PostStatus;
	contentType?: ContentType;
	source?: PostSource;
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
