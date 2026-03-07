/**
 * Posts API handlers
 */
import { HttpResponse, http } from "msw";
import { getPostById, posts } from "../mocks/data";

/**
 * Default handlers - returns all posts
 */
export const postsHandlers = [
	// List posts
	http.get("*/api/protected/posts", ({ request }) => {
		const url = new URL(request.url);
		const status = url.searchParams.get("status");
		const contentType = url.searchParams.get("content_type");

		let filtered = [...posts];
		if (status) {
			filtered = filtered.filter((p) => p.status === status);
		}
		if (contentType) {
			filtered = filtered.filter((p) => p.content_type === contentType);
		}

		return HttpResponse.json(filtered);
	}),

	// Get single post
	http.get("*/api/protected/posts/:id", ({ params }) => {
		const post = getPostById(params.id as string);
		if (!post) {
			return HttpResponse.json({ error: "Post not found" }, { status: 404 });
		}
		return HttpResponse.json(post);
	}),

	// Create post
	http.post("*/api/protected/posts", async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>;
		const now = new Date().toISOString();
		return HttpResponse.json(
			{
				id: "post_new",
				account_id: "acc_123",
				title: body.title ?? "",
				content: body.content ?? "",
				content_type: body.content_type ?? "text",
				status: body.status ?? "draft",
				media_ids: body.media_ids ?? [],
				tags: body.tags ?? [],
				ai_generated: false,
				source: "manual",
				created_at: now,
				updated_at: now,
			},
			{ status: 201 },
		);
	}),

	// Update post
	http.put("*/api/protected/posts/:id", ({ params }) => {
		const post = getPostById(params.id as string);
		if (!post) {
			return HttpResponse.json({ error: "Post not found" }, { status: 404 });
		}
		return HttpResponse.json({
			...post,
			updated_at: new Date().toISOString(),
		});
	}),

	// Delete post
	http.delete("*/api/protected/posts/:id", ({ params }) => {
		const post = getPostById(params.id as string);
		if (!post) {
			return HttpResponse.json({ error: "Post not found" }, { status: 404 });
		}
		return HttpResponse.json({ message: "Post deleted" });
	}),

	// Publish post
	http.post("*/api/protected/posts/:id/publish", ({ params }) => {
		const post = getPostById(params.id as string);
		if (!post) {
			return HttpResponse.json({ error: "Post not found" }, { status: 404 });
		}
		return HttpResponse.json({
			...post,
			status: "published",
			published_at: new Date().toISOString(),
		});
	}),

	// Schedule post
	http.post("*/api/protected/posts/:id/schedule", ({ params }) => {
		const post = getPostById(params.id as string);
		if (!post) {
			return HttpResponse.json({ error: "Post not found" }, { status: 404 });
		}
		return HttpResponse.json({
			...post,
			status: "scheduled",
			scheduled_at: new Date(Date.now() + 86400000).toISOString(),
		});
	}),
];

/**
 * Scenario factories for test overrides
 */
export const postsScenarios = {
	/** Empty posts list */
	empty: () =>
		http.get("*/api/protected/posts", () => {
			return HttpResponse.json([]);
		}),

	/** Server error */
	serverError: () =>
		http.get("*/api/protected/posts", () => {
			return HttpResponse.json(
				{ error: "Internal server error" },
				{ status: 500 },
			);
		}),

	/** Network failure */
	networkError: () =>
		http.get("*/api/protected/posts", () => {
			return HttpResponse.error();
		}),
};
