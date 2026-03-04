/**
 * Blog API handlers
 */
import { HttpResponse, http } from "msw";
import { blogPosts } from "../mocks/data";

/**
 * Default handlers - returns blog posts
 */
export const blogHandlers = [
	// List blog posts
	http.get("*/api/protected/blog", ({ request }) => {
		const url = new URL(request.url);
		const status = url.searchParams.get("status");

		let filtered = [...blogPosts];
		if (status) {
			filtered = filtered.filter((p) => p.status === status);
		}

		return HttpResponse.json(filtered);
	}),

	// Create blog post
	http.post("*/api/protected/blog", async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>;
		const now = new Date().toISOString();
		return HttpResponse.json(
			{
				id: "blog_new",
				accountId: "acc_123",
				title: body.title ?? "",
				slug: body.slug ?? "",
				content: body.content ?? "",
				excerpt: body.excerpt ?? "",
				status: body.status ?? "draft",
				keywords: body.keywords ?? [],
				createdAt: now,
				updatedAt: now,
			},
			{ status: 201 },
		);
	}),
];

/**
 * Scenario factories for test overrides
 */
export const blogScenarios = {
	/** Empty blog */
	empty: () =>
		http.get("*/api/protected/blog", () => {
			return HttpResponse.json([]);
		}),

	/** Server error */
	serverError: () =>
		http.get("*/api/protected/blog", () => {
			return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
		}),
};
