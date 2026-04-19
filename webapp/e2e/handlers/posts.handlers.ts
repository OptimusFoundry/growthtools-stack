/**
 * Posts API handlers
 *
 * Canonical surface: `postsEndpoints` — one `setupEndpoint(...)` per route.
 * `postsHandlers` is the default 2xx happy-path array, built from the
 * `[200]()` factory of each endpoint. `postsScenarios` only retains semantic
 * variants that can't be expressed as a numeric status (empty list, etc.).
 */

import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import { posts } from "../mocks/data";

// ── Endpoint table ─────────────────────────────────────────────────────────

const now = new Date().toISOString();

const createdPost = {
	id: "post_new",
	account_id: "acc_123",
	title: "",
	content: "",
	content_type: "text",
	status: "draft",
	media_ids: [],
	tags: [],
	ai_generated: false,
	source: "manual",
	created_at: now,
	updated_at: now,
};

const scheduledPost = {
	...posts[0],
	status: "scheduled",
	scheduled_at: new Date(Date.now() + 86400000).toISOString(),
};

const publishedPost = {
	...posts[0],
	status: "published",
	published_at: now,
};

export const postsEndpoints = {
	list: setupEndpoint("GET", "*/api/protected/posts", posts),
	create: setupEndpoint("POST", "*/api/protected/posts", createdPost),
	get: setupEndpoint("GET", "*/api/protected/posts/:id", posts[0]),
	update: setupEndpoint("PUT", "*/api/protected/posts/:id", posts[0]),
	delete: setupEndpoint("DELETE", "*/api/protected/posts/:id", null, {
		successStatus: 200,
	}),
	publish: setupEndpoint(
		"POST",
		"*/api/protected/posts/:id/publish",
		publishedPost,
		{ successStatus: 200 },
	),
	schedule: setupEndpoint(
		"POST",
		"*/api/protected/posts/:id/schedule",
		scheduledPost,
		{ successStatus: 200 },
	),
	unlinkMedia: setupEndpoint(
		"DELETE",
		"*/api/protected/posts/:id/media/:mediaID",
		{ message: "Media unlinked from post" },
		{ successStatus: 200 },
	),
};

// Override delete to return 200+body (matches legacy behavior: returns JSON message)
postsEndpoints.delete[200] = () =>
	http.delete("*/api/protected/posts/:id", () =>
		HttpResponse.json({ message: "Post deleted" }),
	);

// ── Default (happy-path) handler array ─────────────────────────────────────

export const postsHandlers = Object.values(postsEndpoints).map((e) => e[200]());

// ── Semantic-only scenario variants ────────────────────────────────────────

export const postsScenarios = {
	/** 200 with empty list */
	empty: () => http.get("*/api/protected/posts", () => HttpResponse.json([])),
};
