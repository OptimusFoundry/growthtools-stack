export type BlogStatus = "draft" | "published" | "archived";

export interface BlogPost {
	id: string;
	accountId: string;
	title: string;
	slug: string;
	content: string;
	excerpt?: string;
	status: BlogStatus;
	seoTitle?: string;
	metaDescription?: string;
	keywords: string[];
	ogTitle?: string;
	ogDescription?: string;
	featuredImageId?: string;
	sourceInstruction?: string;
	mediaIds: string[];
	publishedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface BlogPostListItem {
	id: string;
	title: string;
	status: BlogStatus;
	publishedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface SEOMetadata {
	seoTitle?: string;
	metaDescription?: string;
	keywords: string[];
	ogTitle?: string;
	ogDescription?: string;
}

export interface CreateBlogPostRequest {
	title: string;
	slug: string;
	content: string;
	excerpt?: string;
	status: BlogStatus;
	seo_title?: string;
	meta_description?: string;
	keywords?: string[];
	og_title?: string;
	og_description?: string;
	featured_image_id?: string;
	source_instruction?: string;
	media_ids?: string[];
}

export interface UpdateBlogPostRequest {
	title?: string;
	slug?: string;
	content?: string;
	excerpt?: string;
	status?: BlogStatus;
	seo_title?: string;
	meta_description?: string;
	keywords?: string[];
	og_title?: string;
	og_description?: string;
	featured_image_id?: string;
	source_instruction?: string;
	media_ids?: string[];
}

export interface GenerateBlogRequest {
	instruction: string;
	keywords?: string[];
	media_ids?: string[];
}
