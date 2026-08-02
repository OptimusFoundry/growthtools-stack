/**
 * Blog API handlers
 *
 * Canonical surface: `blogEndpoints` — one `setupEndpoint(...)` per route.
 * `blogHandlers` is the default 2xx happy-path array, built from the `[200]()`
 * factory of each endpoint. `blogScenarios` only retains semantic variants
 * that can't be expressed as a numeric status (empty list, filtered list,
 * publish envelope variants, retry variants).
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import { blogPosts } from "../mocks/data";

const now = new Date().toISOString();

const createdBlog = {
	id: "blog_new",
	account_id: "acc_123",
	title: "",
	slug: "",
	content: "",
	excerpt: "",
	status: "draft",
	keywords: [],
	created_at: now,
	updated_at: now,
};

const updatedBlog = blogPosts[0];

const publishedBlog = {
	...blogPosts[0],
	status: "published",
	published_at: now,
};

const generatedBlog = {
	id: "blog_generated",
	account_id: "acc_123",
	title: "AI-Generated Post",
	slug: "ai-generated-post",
	content: "Generated content.",
	status: "draft",
	keywords: [],
	created_at: now,
	updated_at: now,
};

// ── Full-shape blog post fixtures (ApiBlogPost / ApiBlogPostWithMedia) ──────
// Reuse blogPosts[0]'s id/title/status but build the full detail shape
// required by GET /blog/:id and the publish/retry envelopes.

/** Full-detail post, no site publish PR yet. */
export const fullBlogPost = {
	id: blogPosts[0].id,
	account_id: "acc_123",
	title: blogPosts[0].title,
	slug: "getting-started-with-growth-tools",
	content: "# Getting Started\n\nWelcome to Growth Tools.",
	excerpt: "Welcome to Growth Tools.",
	status: blogPosts[0].status,
	seo_title: blogPosts[0].title,
	meta_description: "Learn how to get started with Growth Tools.",
	keywords: ["growth", "tools", "getting-started"],
	og_title: blogPosts[0].title,
	og_description: "Learn how to get started with Growth Tools.",
	featured_image_id: undefined,
	source_instruction: "Write an intro post for Growth Tools.",
	media_ids: [],
	published_at: blogPosts[0].published_at,
	created_at: blogPosts[0].created_at,
	updated_at: blogPosts[0].updated_at,
};

/** Full-detail post with a site publish PR already opened. */
export const publishedBlogWithPr = {
	...fullBlogPost,
	status: "published",
	published_at: now,
	site_pr_url: "https://github.com/shubhanshu-dev/site/pull/42",
	site_pr_opened_at: now,
};

/** Full-detail published post, PR not opened (used for the site-error scenario). */
const publishedBlogNoPr = {
	...fullBlogPost,
	status: "published",
	published_at: now,
};

export const blogEndpoints = {
	list: setupEndpoint("GET", "*/api/protected/blogs", blogPosts),
	get: setupEndpoint(
		"GET",
		"*/api/protected/blog/:id",
		{ post: fullBlogPost, media: [] },
		{
			overrides: {
				404: { error: "Blog post not found", code: "NOT_FOUND" },
			},
		},
	),
	create: setupEndpoint("POST", "*/api/protected/blog", createdBlog, {
		overrides: {
			409: {
				error: "A blog post with this slug already exists",
				code: "CONFLICT",
			},
		},
	}),
	update: setupEndpoint("PUT", "*/api/protected/blog/:id", updatedBlog, {
		overrides: {
			404: { error: "Blog post not found", code: "NOT_FOUND" },
		},
	}),
	delete: setupEndpoint(
		"DELETE",
		"*/api/protected/blog/:id",
		{ message: "Blog post deleted successfully" },
		{
			successStatus: 200,
			overrides: {
				404: { error: "Blog post not found", code: "NOT_FOUND" },
			},
		},
	),
	publish: setupEndpoint(
		"POST",
		"*/api/protected/blog/:id/publish",
		{ post: publishedBlog, site_publish_error: undefined },
		{
			successStatus: 200,
			overrides: {
				404: { error: "Blog post not found", code: "NOT_FOUND" },
			},
		},
	),
	retrySitePublish: setupEndpoint(
		"POST",
		"*/api/protected/blog/:id/retry-site-publish",
		{ post: publishedBlogWithPr, site_publish_error: undefined },
		{
			successStatus: 200,
			overrides: {
				404: { error: "Blog post not found", code: "NOT_FOUND" },
				409: {
					error: "Blog post is not published yet",
					code: "BLOG_NOT_PUBLISHED",
				},
			},
		},
	),
	generate: setupEndpoint(
		"POST",
		"*/api/protected/blog/generate",
		generatedBlog,
		{
			overrides: {
				500: { error: "Blog generation failed", code: "INTERNAL_ERROR" },
			},
		},
	),
};

export const blogHandlers = Object.values(blogEndpoints).map((e) => e[200]());

export const blogScenarios = {
	/** 200: empty list */
	empty: () => http.get("*/api/protected/blogs", () => HttpResponse.json([])),

	/** 200: filtered to only published posts */
	publishedOnly: () =>
		http.get("*/api/protected/blogs", () =>
			HttpResponse.json(blogPosts.filter((p) => p.status === "published")),
		),

	/** 200: GET /blog/:id — post with a site publish PR already opened. */
	getWithPr: () =>
		http.get("*/api/protected/blog/:id", () =>
			HttpResponse.json({ post: publishedBlogWithPr, media: [] }),
		),

	/** 200: GET /blog/:id — published post, no PR opened. */
	getPublishedNoPr: () =>
		http.get("*/api/protected/blog/:id", () =>
			HttpResponse.json({ post: publishedBlogNoPr, media: [] }),
		),

	/** 200: publish succeeds but the site publish side-effect failed. */
	publishWithSiteError: () =>
		http.post("*/api/protected/blog/:id/publish", () =>
			HttpResponse.json({
				post: publishedBlogNoPr,
				site_publish_error: "GitHub publish failed: rate limited",
			}),
		),

	/** 200: retry succeeds — PR now opened, error cleared. */
	retrySitePublishSuccess: () =>
		http.post("*/api/protected/blog/:id/retry-site-publish", () =>
			HttpResponse.json({
				post: publishedBlogWithPr,
				site_publish_error: undefined,
			}),
		),
};
