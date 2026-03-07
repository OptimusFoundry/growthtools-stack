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
}
