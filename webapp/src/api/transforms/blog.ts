/**
 * Blog Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) blog types
 */

import type {
	BlogPost,
	BlogPostListItem,
	BlogPublishResult,
	DeleteBlogResult,
} from "@/types/blog";
import type {
	ApiBlogPost,
	ApiBlogPostListItem,
	ApiBlogPublishResponse,
	ApiDeleteBlogResponse,
} from "../types/blog";

// GitHub PR URLs end in /pull/<number>; anything else has no derivable PR number.
function parsePrNumber(prUrl: string | undefined): number | undefined {
	if (!prUrl) return undefined;
	const segment = prUrl.split("/").pop();
	if (!segment) return undefined;
	const parsed = Number.parseInt(segment, 10);
	return Number.isNaN(parsed) ? undefined : parsed;
}

export function toBlogPost(api: ApiBlogPost): BlogPost {
	return {
		id: api.id,
		accountId: api.account_id,
		title: api.title,
		slug: api.slug,
		content: api.content,
		excerpt: api.excerpt,
		status: api.status,
		seoTitle: api.seo_title,
		metaDescription: api.meta_description,
		keywords: api.keywords ?? [],
		ogTitle: api.og_title,
		ogDescription: api.og_description,
		featuredImageId: api.featured_image_id,
		sourceInstruction: api.source_instruction,
		mediaIds: api.media_ids ?? [],
		publishedAt: api.published_at,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
		sitePrUrl: api.site_pr_url,
		sitePrOpenedAt: api.site_pr_opened_at,
		sitePrNumber: parsePrNumber(api.site_pr_url),
	};
}

export function toBlogPublishResult(
	api: ApiBlogPublishResponse,
): BlogPublishResult {
	return {
		post: toBlogPost(api.post),
		sitePublishError: api.site_publish_error,
	};
}

export function toBlogPosts(apiPosts: ApiBlogPost[]): BlogPost[] {
	return apiPosts.map(toBlogPost);
}

export function toBlogPostListItem(api: ApiBlogPostListItem): BlogPostListItem {
	return {
		id: api.id,
		title: api.title,
		status: api.status,
		publishedAt: api.published_at,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
		sitePrUrl: api.site_pr_url,
	};
}

export function toBlogPostListItems(
	apiPosts: ApiBlogPostListItem[],
): BlogPostListItem[] {
	return apiPosts.map(toBlogPostListItem);
}

export function toDeleteBlogResult(
	api: ApiDeleteBlogResponse,
): DeleteBlogResult {
	return { message: api.message, siteDeleteError: api.site_delete_error };
}
