/**
 * Blog API Types
 *
 * API response types for blog posts (snake_case, matches Go JSON tags)
 */

import type { BlogStatus } from "@/types/blog";

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
}
