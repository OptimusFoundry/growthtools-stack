/**
 * Settings API handlers
 */
import { HttpResponse, http } from "msw";
import { voiceProfile } from "../mocks/data";

/**
 * Default handlers - returns voice profile settings
 */
export const settingsHandlers = [
	// Get voice profile
	http.get("*/api/protected/settings/voice", () => {
		return HttpResponse.json(voiceProfile);
	}),

	// Update voice profile
	http.put("*/api/protected/settings/voice", async ({ request }) => {
		const body = (await request.json()) as Record<string, unknown>;
		return HttpResponse.json({
			...voiceProfile,
			...body,
			updatedAt: new Date().toISOString(),
		});
	}),
];

/**
 * Scenario factories for test overrides
 */
export const settingsScenarios = {
	/** No voice profile configured */
	noVoiceProfile: () =>
		http.get("*/api/protected/settings/voice", () => {
			return HttpResponse.json({ error: "Voice profile not found" }, { status: 404 });
		}),

	/** Server error */
	serverError: () =>
		http.get("*/api/protected/settings/voice", () => {
			return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
		}),
};
