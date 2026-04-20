/**
 * Blog API handlers
 *
 * Canonical surface: `blogEndpoints` — one `setupEndpoint(...)` per route.
 * `blogHandlers` is the default 2xx happy-path array, built from the `[200]()`
 * factory of each endpoint. `blogScenarios` only retains semantic variants
 * that can't be expressed as a numeric status (empty list, filtered list).
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

export const blogEndpoints = {
	list: setupEndpoint("GET", "*/api/protected/blogs", blogPosts),
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
		publishedBlog,
		{
			successStatus: 200,
			overrides: {
				404: { error: "Blog post not found", code: "NOT_FOUND" },
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
};
