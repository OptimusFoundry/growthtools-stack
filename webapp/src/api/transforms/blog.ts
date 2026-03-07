/**
 * Blog Transformers
 *
 * Transform between API (snake_case) and UI (camelCase) blog types
 */

import type { BlogPost } from "@/types/blog";
import type { ApiBlogPost } from "../types/blog";

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
		publishedAt: api.published_at,
		createdAt: api.created_at,
		updatedAt: api.updated_at,
	};
}

export function toBlogPosts(apiPosts: ApiBlogPost[]): BlogPost[] {
	return apiPosts.map(toBlogPost);
}
