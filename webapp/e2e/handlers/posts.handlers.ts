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
import { postListItems, posts } from "../mocks/data";

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

const emptyBreakdown = {
	by_status: {
		draft: 0,
		scheduled: 0,
		publishing: 0,
		published: 0,
		failed: 0,
		partially_published: 0,
	},
	by_platform: {
		x: 0,
		linkedin: 0,
		bluesky: 0,
		facebook: 0,
		instagram: 0,
		threads: 0,
		tiktok: 0,
		pinterest: 0,
	},
} as const;

// Canonical fixture month used for static setupEndpoint body.
const fixtureCalendarMonth = {
	month: "2026-04",
	days: [
		{
			date: "2026-04-05",
			by_status: {
				...emptyBreakdown.by_status,
				scheduled: 2,
				published: 1,
				draft: 1,
			},
			by_platform: { ...emptyBreakdown.by_platform, x: 2, linkedin: 1 },
		},
	],
	month_totals: {
		by_status: {
			...emptyBreakdown.by_status,
			scheduled: 2,
			published: 1,
			draft: 1,
		},
		by_platform: { ...emptyBreakdown.by_platform, x: 2, linkedin: 1 },
	},
};

export const postsEndpoints = {
	// Calendar month aggregate — must come before `list` in route registration
	// order so `/posts/calendar` doesn't match the `/posts` list handler.
	calendarMonth: setupEndpoint(
		"GET",
		"*/api/protected/posts/calendar",
		fixtureCalendarMonth,
	),
	list: setupEndpoint("GET", "*/api/protected/posts", postListItems),
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
	details: setupEndpoint("GET", "*/api/protected/posts/:id/details", {
		post: posts[0],
		platform_posts: [],
		media: null,
	}),
};

// Override delete to return 200+body (matches legacy behavior: returns JSON message)
postsEndpoints.delete[200] = () =>
	http.delete("*/api/protected/posts/:id", () =>
		HttpResponse.json({ message: "Post deleted" }),
	);

// Override calendar-month 200 to echo the requested year/month so the UI
// renders the header for the month the user navigated to, not a fixed fixture.
postsEndpoints.calendarMonth[200] = () =>
	http.get("*/api/protected/posts/calendar", ({ request }) => {
		const url = new URL(request.url);
		const year = url.searchParams.get("year") ?? "2026";
		const month = url.searchParams.get("month") ?? "4";
		const mm = String(Number(month)).padStart(2, "0");
		return HttpResponse.json({
			month: `${year}-${mm}`,
			days: [
				{
					date: `${year}-${mm}-05`,
					by_status: {
						...emptyBreakdown.by_status,
						scheduled: 2,
						published: 1,
						draft: 1,
					},
					by_platform: { ...emptyBreakdown.by_platform, x: 2, linkedin: 1 },
				},
			],
			month_totals: {
				by_status: {
					...emptyBreakdown.by_status,
					scheduled: 2,
					published: 1,
					draft: 1,
				},
				by_platform: { ...emptyBreakdown.by_platform, x: 2, linkedin: 1 },
			},
		});
	});

// ── Default (happy-path) handler array ─────────────────────────────────────

export const postsHandlers = Object.values(postsEndpoints).map((e) => e[200]());

// ── Semantic-only scenario variants ────────────────────────────────────────

export const postsScenarios = {
	/** 200 with empty list */
	empty: () => http.get("*/api/protected/posts", () => HttpResponse.json([])),
};
