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

	// Unlink media from post
	http.delete("*/api/protected/posts/:id/media/:mediaID", ({ params }) => {
		const post = getPostById(params.id as string);
		if (!post) {
			return HttpResponse.json({ error: "Post not found" }, { status: 404 });
		}
		return HttpResponse.json({ message: "Media unlinked from post" });
	}),
];

/**
 * Scenario factories for test overrides — one per non-2xx status the backend
 * can return. Named by semantics so spec files stay readable.
 */
export const postsScenarios = {
	// ── GET /posts ────────────────────────────────────────────────────────────

	/** Empty posts list (200 with empty array) */
	empty: () => http.get("*/api/protected/posts", () => HttpResponse.json([])),

	/** 401 Unauthorized on list */
	listUnauthorized: () =>
		http.get("*/api/protected/posts", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context" },
				{ status: 401 },
			),
		),

	/** 500 Internal error on list */
	listServerError: () =>
		http.get("*/api/protected/posts", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	/** Transport-level failure on list */
	listNetworkError: () =>
		http.get("*/api/protected/posts", () => HttpResponse.error()),

	// ── GET /posts/:id ────────────────────────────────────────────────────────

	/** 401 Unauthorized on single-post fetch */
	getPostUnauthorized: () =>
		http.get("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context" },
				{ status: 401 },
			),
		),

	/** 400 Bad Request — invalid post ID UUID */
	getPostBadRequest: () =>
		http.get("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{ error: "Invalid post ID format", code: "INVALID_INPUT" },
				{ status: 400 },
			),
		),

	/** 404 Not Found on single-post fetch */
	getPostNotFound: () =>
		http.get("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{ error: "Post not found", code: "NOT_FOUND" },
				{ status: 404 },
			),
		),

	/** 500 Internal error on single-post fetch */
	getPostServerError: () =>
		http.get("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	/** Transport failure on single-post fetch */
	getPostNetworkError: () =>
		http.get("*/api/protected/posts/:id", () => HttpResponse.error()),

	// ── POST /posts ───────────────────────────────────────────────────────────

	/** 401 Unauthorized on create */
	createUnauthorized: () =>
		http.post("*/api/protected/posts", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context" },
				{ status: 401 },
			),
		),

	/** 400 Bad Request on create (e.g. invalid JSON / media ID) */
	createBadRequest: () =>
		http.post("*/api/protected/posts", () =>
			HttpResponse.json(
				{ error: "Invalid media ID format", code: "INVALID_INPUT" },
				{ status: 400 },
			),
		),

	/** 500 Internal error on create */
	createServerError: () =>
		http.post("*/api/protected/posts", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	/** Transport failure on create */
	createNetworkError: () =>
		http.post("*/api/protected/posts", () => HttpResponse.error()),

	// ── PUT /posts/:id ────────────────────────────────────────────────────────

	/** 401 Unauthorized on update */
	updateUnauthorized: () =>
		http.put("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context" },
				{ status: 401 },
			),
		),

	/** 400 Bad Request on update */
	updateBadRequest: () =>
		http.put("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{ error: "Invalid post ID format", code: "INVALID_INPUT" },
				{ status: 400 },
			),
		),

	/** 404 Not Found on update */
	updateNotFound: () =>
		http.put("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{ error: "Post not found", code: "NOT_FOUND" },
				{ status: 404 },
			),
		),

	/** 500 Internal error on update */
	updateServerError: () =>
		http.put("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	// ── DELETE /posts/:id ─────────────────────────────────────────────────────

	/** 401 Unauthorized on delete */
	deleteUnauthorized: () =>
		http.delete("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context" },
				{ status: 401 },
			),
		),

	/** 400 Bad Request on delete */
	deleteBadRequest: () =>
		http.delete("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{ error: "Invalid post ID format", code: "INVALID_INPUT" },
				{ status: 400 },
			),
		),

	/** 404 Not Found on delete */
	deleteNotFound: () =>
		http.delete("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{ error: "Post not found", code: "NOT_FOUND" },
				{ status: 404 },
			),
		),

	/** 500 Internal error on delete */
	deleteServerError: () =>
		http.delete("*/api/protected/posts/:id", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	/** Transport failure on delete */
	deleteNetworkError: () =>
		http.delete("*/api/protected/posts/:id", () => HttpResponse.error()),

	// ── POST /posts/:id/publish ───────────────────────────────────────────────

	/** 401 Unauthorized on publish */
	publishUnauthorized: () =>
		http.post("*/api/protected/posts/:id/publish", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context" },
				{ status: 401 },
			),
		),

	/** 400 Bad Request on publish (validation failure) */
	publishBadRequest: () =>
		http.post("*/api/protected/posts/:id/publish", () =>
			HttpResponse.json(
				{ error: "Invalid post ID format", code: "INVALID_INPUT" },
				{ status: 400 },
			),
		),

	/** 404 Not Found on publish */
	publishNotFound: () =>
		http.post("*/api/protected/posts/:id/publish", () =>
			HttpResponse.json(
				{ error: "Post not found", code: "NOT_FOUND" },
				{ status: 404 },
			),
		),

	/** 500 Internal error on publish */
	publishServerError: () =>
		http.post("*/api/protected/posts/:id/publish", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	// ── POST /posts/:id/schedule ──────────────────────────────────────────────

	/** 401 Unauthorized on schedule */
	scheduleUnauthorized: () =>
		http.post("*/api/protected/posts/:id/schedule", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context" },
				{ status: 401 },
			),
		),

	/** 400 Bad Request on schedule (invalid scheduled_at format) */
	scheduleBadRequest: () =>
		http.post("*/api/protected/posts/:id/schedule", () =>
			HttpResponse.json(
				{
					error: "Invalid scheduled_at format, expected RFC3339",
					code: "INVALID_INPUT",
				},
				{ status: 400 },
			),
		),

	/** 404 Not Found on schedule */
	scheduleNotFound: () =>
		http.post("*/api/protected/posts/:id/schedule", () =>
			HttpResponse.json(
				{ error: "Post not found", code: "NOT_FOUND" },
				{ status: 404 },
			),
		),

	/** 500 Internal error on schedule */
	scheduleServerError: () =>
		http.post("*/api/protected/posts/:id/schedule", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	// ── DELETE /posts/:id/media/:mediaID ──────────────────────────────────────

	/** 409 Conflict on unlink media (media not attached) */
	unlinkMediaConflict: () =>
		http.delete("*/api/protected/posts/:id/media/:mediaID", () =>
			HttpResponse.json(
				{
					error: "Media is not attached to this post",
					code: "MEDIA_NOT_ATTACHED",
				},
				{ status: 409 },
			),
		),

	/** 404 Not Found on unlink media */
	unlinkMediaNotFound: () =>
		http.delete("*/api/protected/posts/:id/media/:mediaID", () =>
			HttpResponse.json(
				{ error: "Post not found", code: "NOT_FOUND" },
				{ status: 404 },
			),
		),

	/** 500 Internal error on unlink media */
	unlinkMediaServerError: () =>
		http.delete("*/api/protected/posts/:id/media/:mediaID", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	// ── Legacy aliases (kept for any external callers) ────────────────────────

	/** @deprecated use listServerError */
	serverError: () =>
		http.get("*/api/protected/posts", () =>
			HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
		),

	/** @deprecated use listNetworkError */
	networkError: () =>
		http.get("*/api/protected/posts", () => HttpResponse.error()),
};
