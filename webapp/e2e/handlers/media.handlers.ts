/**
 * Media API handlers
 */
import { HttpResponse, http } from "msw";
import { mediaItems } from "../mocks/data";

/**
 * Default handlers - returns media library
 */
export const mediaHandlers = [
	// List media
	http.get("*/api/protected/media", () => {
		return HttpResponse.json(mediaItems);
	}),

	// Upload media
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

	// Delete media
	http.delete("*/api/protected/media/:id", ({ params }) => {
		const item = mediaItems.find((m) => m.id === params.id);
		if (!item) {
			return HttpResponse.json({ error: "Media not found" }, { status: 404 });
		}
		return HttpResponse.json({ message: "Media deleted" });
	}),
];

/**
 * Scenario factories for test overrides
 */
export const mediaScenarios = {
	/** Empty media library */
	empty: () =>
		http.get("*/api/protected/media", () => {
			return HttpResponse.json([]);
		}),

	/** Server error */
	serverError: () =>
		http.get("*/api/protected/media", () => {
			return HttpResponse.json(
				{ error: "Internal server error" },
				{ status: 500 },
			);
		}),
};
