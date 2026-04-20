/**
 * Blog Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) blog types
 */

import type { BlogPost, BlogPostListItem } from "@/types/blog";
import type { ApiBlogPost, ApiBlogPostListItem } from "../types/blog";

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
	};
}

export function toBlogPostListItems(
	apiPosts: ApiBlogPostListItem[],
): BlogPostListItem[] {
	return apiPosts.map(toBlogPostListItem);
}
