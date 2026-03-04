/**
 * Platforms API handlers
 */
import { HttpResponse, http } from "msw";
import { platformConnections } from "../mocks/data";

/**
 * Default handlers - returns connected platforms
 */
export const platformsHandlers = [
	http.get("*/api/protected/platforms", () => {
		return HttpResponse.json(platformConnections);
	}),
];

/**
 * Scenario factories for test overrides
 */
export const platformsScenarios = {
	/** No connected platforms */
	empty: () =>
		http.get("*/api/protected/platforms", () => {
			return HttpResponse.json([]);
		}),

	/** Server error */
	serverError: () =>
		http.get("*/api/protected/platforms", () => {
			return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
		}),
};
