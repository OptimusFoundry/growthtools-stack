/**
 * Blog API handlers
 *
 * Default handlers cover the happy path (200/201).
 * blogScenarios exposes one factory per meaningful status code variant
 * so tests can override with network.use(blogScenarios.notFound()).
 */
import { HttpResponse, http } from "msw";
import { blogPosts } from "../mocks/data";

// ============================================================================
// Default (happy-path) handlers
// ============================================================================

export const blogHandlers = [
	// List blog posts — 200
	http.get("*/api/protected/blog", ({ request }) => {
		const url = new URL(request.url);
		const status = url.searchParams.get("status");

		let filtered = [...blogPosts];
		if (status) {
			filtered = filtered.filter((p) => p.status === status);
		}

		return HttpResponse.json(filtered);
	}),

	// Create blog post — 201
	http.post("*/api/protected/blog", async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>;
		const now = new Date().toISOString();
		return HttpResponse.json(
			{
				id: "blog_new",
				account_id: "acc_123",
				title: body.title ?? "",
				slug: body.slug ?? "",
				content: body.content ?? "",
				excerpt: body.excerpt ?? "",
				status: body.status ?? "draft",
				keywords: body.keywords ?? [],
				created_at: now,
				updated_at: now,
			},
			{ status: 201 },
		);
	}),

	// Update blog post — 200
	http.put("*/api/protected/blog/:id", async ({ params, request }) => {
		const body = (await request.json()) as Record<string, unknown>;
		const existing = blogPosts.find((p) => p.id === params.id) ?? blogPosts[0];
		return HttpResponse.json({ ...existing, ...body });
	}),

	// Delete blog post — 200
	http.delete("*/api/protected/blog/:id", () => {
		return HttpResponse.json({ message: "Blog post deleted successfully" });
	}),

	// Publish blog post — 200
	http.post("*/api/protected/blog/:id/publish", ({ params }) => {
		const existing = blogPosts.find((p) => p.id === params.id) ?? blogPosts[0];
		return HttpResponse.json({
			...existing,
			status: "published",
			published_at: new Date().toISOString(),
		});
	}),

	// Generate blog post — 201
	http.post("*/api/protected/blog/generate", async () => {
		const now = new Date().toISOString();
		return HttpResponse.json(
			{
				id: "blog_generated",
				account_id: "acc_123",
				title: "AI-Generated Post",
				slug: "ai-generated-post",
				content: "Generated content.",
				status: "draft",
				keywords: [],
				created_at: now,
				updated_at: now,
			},
			{ status: 201 },
		);
	}),
];

// ============================================================================
// Scenario factories — one per meaningful status code variant
// ============================================================================

export const blogScenarios = {
	// ── GET /api/protected/blog ──────────────────────────────────────────────

	/** 200: empty list */
	empty: () => http.get("*/api/protected/blog", () => HttpResponse.json([])),

	/** 200: filtered by published status */
	publishedOnly: () =>
		http.get("*/api/protected/blog", () =>
			HttpResponse.json(blogPosts.filter((p) => p.status === "published")),
		),

	/** 401: unauthenticated */
	listUnauthorized: () =>
		http.get("*/api/protected/blog", () =>
			HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
		),

	/** 500: server error on list */
	listServerError: () =>
		http.get("*/api/protected/blog", () =>
			HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
		),

	/** Transport failure on list */
	listNetworkError: () =>
		http.get("*/api/protected/blog", () => HttpResponse.error()),

	// ── POST /api/protected/blog ─────────────────────────────────────────────

	/** 400: bad request on create */
	createBadRequest: () =>
		http.post("*/api/protected/blog", () =>
			HttpResponse.json({ error: "Invalid input" }, { status: 400 }),
		),

	/** 409: slug conflict on create */
	createConflict: () =>
		http.post("*/api/protected/blog", () =>
			HttpResponse.json(
				{ error: "A blog post with this slug already exists" },
				{ status: 409 },
			),
		),

	/** 500: server error on create */
	createServerError: () =>
		http.post("*/api/protected/blog", () =>
			HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
		),

	/** Transport failure on create */
	createNetworkError: () =>
		http.post("*/api/protected/blog", () => HttpResponse.error()),

	// ── PUT /api/protected/blog/:id ──────────────────────────────────────────

	/** 400: bad request on update */
	updateBadRequest: () =>
		http.put("*/api/protected/blog/:id", () =>
			HttpResponse.json({ error: "Invalid input" }, { status: 400 }),
		),

	/** 404: post not found on update */
	updateNotFound: () =>
		http.put("*/api/protected/blog/:id", () =>
			HttpResponse.json({ error: "Blog post not found" }, { status: 404 }),
		),

	/** 500: server error on update */
	updateServerError: () =>
		http.put("*/api/protected/blog/:id", () =>
			HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
		),

	/** Transport failure on update */
	updateNetworkError: () =>
		http.put("*/api/protected/blog/:id", () => HttpResponse.error()),

	// ── DELETE /api/protected/blog/:id ───────────────────────────────────────

	/** 404: post not found on delete */
	deleteNotFound: () =>
		http.delete("*/api/protected/blog/:id", () =>
			HttpResponse.json({ error: "Blog post not found" }, { status: 404 }),
		),

	/** 500: server error on delete */
	deleteServerError: () =>
		http.delete("*/api/protected/blog/:id", () =>
			HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
		),

	/** Transport failure on delete */
	deleteNetworkError: () =>
		http.delete("*/api/protected/blog/:id", () => HttpResponse.error()),

	// ── POST /api/protected/blog/:id/publish ─────────────────────────────────

	/** 404: post not found on publish */
	publishNotFound: () =>
		http.post("*/api/protected/blog/:id/publish", () =>
			HttpResponse.json({ error: "Blog post not found" }, { status: 404 }),
		),

	/** 500: server error on publish */
	publishServerError: () =>
		http.post("*/api/protected/blog/:id/publish", () =>
			HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
		),

	/** Transport failure on publish */
	publishNetworkError: () =>
		http.post("*/api/protected/blog/:id/publish", () => HttpResponse.error()),

	// ── POST /api/protected/blog/generate ────────────────────────────────────

	/** 400: bad request on generate */
	generateBadRequest: () =>
		http.post("*/api/protected/blog/generate", () =>
			HttpResponse.json({ error: "Invalid input" }, { status: 400 }),
		),

	/** 500: generation failed */
	generateServerError: () =>
		http.post("*/api/protected/blog/generate", () =>
			HttpResponse.json({ error: "Blog generation failed" }, { status: 500 }),
		),

	/** Transport failure on generate */
	generateNetworkError: () =>
		http.post("*/api/protected/blog/generate", () => HttpResponse.error()),
};
