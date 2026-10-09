/**
 * Media API handlers
 */
import { delay, HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";
import { mediaItems } from "../mocks/data";

const now = new Date().toISOString();

const uploadedMedia = {
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
};

export const mediaEndpoints = {
	list: setupEndpoint("GET", "*/api/protected/media", mediaItems),
	upload: setupEndpoint("POST", "*/api/protected/media", uploadedMedia),
	delete: setupEndpoint(
		"DELETE",
		"*/api/protected/media/:id",
		{ message: "Media deleted successfully" },
		{ successStatus: 200 },
	),
};

export const mediaHandlers = Object.values(mediaEndpoints).map((e) => e[200]());

export const mediaScenarios = {
	/** 200 with empty media library */
	listEmpty: () =>
		http.get("*/api/protected/media", () => HttpResponse.json([])),
	/** 201 upload that stays pending until `gate` resolves (or 1.5s without one) */
	uploadSlow: (gate?: Promise<void>) =>
		http.post("*/api/protected/media", async () => {
			await (gate ?? delay(1500));
			return HttpResponse.json(uploadedMedia, { status: 201 });
		}),
};
