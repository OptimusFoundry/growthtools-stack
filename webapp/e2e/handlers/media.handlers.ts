/**
 * Media API handlers
 *
 * Default handlers: happy-path responses.
 * Named factories: per-status-code overrides for table-driven tests.
 */
import { HttpResponse, http } from "msw";
import { mediaItems } from "../mocks/data";

// ── Default (happy-path) handlers ──────────────────────────────────────────

export const mediaHandlers = [
	// GET /api/protected/media → 200 list
	http.get("*/api/protected/media", () => {
		return HttpResponse.json(mediaItems);
	}),

	// POST /api/protected/media → 201 created
	http.post("*/api/protected/media", () => {
		const now = new Date().toISOString();
		return HttpResponse.json(
			{
				id: "media_new",
				account_id: "acc_123",
				filename: "uploaded-file.png",
				content_type: "image/png",
				s3_url: "https://cdn.example.com/media/uploaded-file.png",
				size_bytes: 102400,
				width: 800,
				height: 600,
				source: "upload",
				created_at: now,
				updated_at: now,
			},
			{ status: 201 },
		);
	}),

	// DELETE /api/protected/media/:id → 200
	http.delete("*/api/protected/media/:id", ({ params }) => {
		const item = mediaItems.find((m) => m.id === params.id);
		if (!item) {
			return HttpResponse.json({ error: "Media not found" }, { status: 404 });
		}
		return HttpResponse.json({ message: "Media deleted successfully" });
	}),
];

// ── GET /api/protected/media — per-status factories ────────────────────────

export const mediaListHandlers = {
	/** 200 — nominal list */
	success: () =>
		http.get("*/api/protected/media", () => HttpResponse.json(mediaItems)),

	/** 200 — empty library */
	empty: () => http.get("*/api/protected/media", () => HttpResponse.json([])),

	/** 401 — unauthenticated */
	unauthorized: () =>
		http.get("*/api/protected/media", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context", code: "UNAUTHORIZED" },
				{ status: 401 },
			),
		),

	/** 500 — internal server error */
	serverError: () =>
		http.get("*/api/protected/media", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	/** Transport failure */
	networkError: () =>
		http.get("*/api/protected/media", () => HttpResponse.error()),
};

// ── POST /api/protected/media — per-status factories ──────────────────────

export const mediaUploadHandlers = {
	/** 201 — created */
	success: () =>
		http.post("*/api/protected/media", () => {
			const now = new Date().toISOString();
			return HttpResponse.json(
				{
					id: "media_new",
					account_id: "acc_123",
					filename: "uploaded-file.png",
					content_type: "image/png",
					s3_url: "https://cdn.example.com/media/uploaded-file.png",
					size_bytes: 102400,
					width: 800,
					height: 600,
					source: "upload",
					created_at: now,
					updated_at: now,
				},
				{ status: 201 },
			);
		}),

	/** 400 — file field missing */
	badRequest: () =>
		http.post("*/api/protected/media", () =>
			HttpResponse.json(
				{ error: "File is required", code: "INVALID_INPUT" },
				{ status: 400 },
			),
		),

	/** 401 — unauthenticated */
	unauthorized: () =>
		http.post("*/api/protected/media", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context", code: "UNAUTHORIZED" },
				{ status: 401 },
			),
		),

	/** 500 — upload to storage failed */
	serverError: () =>
		http.post("*/api/protected/media", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	/** Transport failure */
	networkError: () =>
		http.post("*/api/protected/media", () => HttpResponse.error()),
};

// ── DELETE /api/protected/media/:id — per-status factories ────────────────

export const mediaDeleteHandlers = {
	/** 200 — deleted */
	success: () =>
		http.delete("*/api/protected/media/:id", () =>
			HttpResponse.json({ message: "Media deleted successfully" }),
		),

	/** 400 — invalid UUID */
	badRequest: () =>
		http.delete("*/api/protected/media/:id", () =>
			HttpResponse.json(
				{ error: "Invalid media ID format", code: "INVALID_INPUT" },
				{ status: 400 },
			),
		),

	/** 401 — unauthenticated */
	unauthorized: () =>
		http.delete("*/api/protected/media/:id", () =>
			HttpResponse.json(
				{ error: "Account ID not found in context", code: "UNAUTHORIZED" },
				{ status: 401 },
			),
		),

	/** 404 — ErrMediaNotFound */
	notFound: () =>
		http.delete("*/api/protected/media/:id", () =>
			HttpResponse.json(
				{ error: "Media not found", code: "NOT_FOUND" },
				{ status: 404 },
			),
		),

	/** 500 — ErrFailedDelete */
	serverError: () =>
		http.delete("*/api/protected/media/:id", () =>
			HttpResponse.json(
				{
					error: "An internal error occurred. Please try again later.",
					code: "INTERNAL_ERROR",
				},
				{ status: 500 },
			),
		),

	/** Transport failure */
	networkError: () =>
		http.delete("*/api/protected/media/:id", () => HttpResponse.error()),
};

// ── Unified scenario map (required by handlers/index.ts) ──────────────────

export const mediaScenarios = {
	// list
	listEmpty: mediaListHandlers.empty,
	listUnauthorized: mediaListHandlers.unauthorized,
	listServerError: mediaListHandlers.serverError,
	listNetworkError: mediaListHandlers.networkError,
	// upload
	uploadSuccess: mediaUploadHandlers.success,
	uploadBadRequest: mediaUploadHandlers.badRequest,
	uploadUnauthorized: mediaUploadHandlers.unauthorized,
	uploadServerError: mediaUploadHandlers.serverError,
	uploadNetworkError: mediaUploadHandlers.networkError,
	// delete
	deleteSuccess: mediaDeleteHandlers.success,
	deleteBadRequest: mediaDeleteHandlers.badRequest,
	deleteUnauthorized: mediaDeleteHandlers.unauthorized,
	deleteNotFound: mediaDeleteHandlers.notFound,
	deleteServerError: mediaDeleteHandlers.serverError,
	deleteNetworkError: mediaDeleteHandlers.networkError,
};
