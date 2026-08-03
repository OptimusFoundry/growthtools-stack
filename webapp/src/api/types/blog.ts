/**
 * Blog API Types
 *
 * API response types for blog posts (snake_case, matches Go JSON tags)
 */

import type { BlogStatus } from "@/types/blog";
import type { ApiMediaItem } from "./media";

export interface ApiBlogPostWithMedia {
	post: ApiBlogPost;
	media: ApiMediaItem[] | null;
}

export interface ApiBlogPostListItem {
	id: string;
	title: string;
	status: BlogStatus;
	published_at?: string;
	created_at: string;
	updated_at: string;
	site_pr_url?: string;
}

export interface ApiBlogPost {
	id: string;
	account_id: string;
	title: string;
	slug: string;
	content: string;
	excerpt?: string;
	status: BlogStatus;
	seo_title?: string;
	meta_description?: string;
	keywords: string[];
	og_title?: string;
	og_description?: string;
	featured_image_id?: string;
	source_instruction?: string;
	media_ids: string[];
	published_at?: string;
	created_at: string;
	updated_at: string;
	site_pr_url?: string;
	site_pr_opened_at?: string;
}

export interface ApiBlogPublishResponse {
	post: ApiBlogPost;
	site_publish_error?: string;
}

export interface ApiDeleteBlogResponse {
	message: string;
	site_delete_error?: string;
}
