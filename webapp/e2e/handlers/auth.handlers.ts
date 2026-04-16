/**
 * Auth/User API handlers
 */
import { HttpResponse, http } from "msw";
import type { ApiTierName } from "../../src/api/types/tier";
import { users } from "../mocks/data";

/**
 * Creates user handler for a specific tier
 */
export const createUserHandler = (tier: ApiTierName) =>
	http.get("*/api/protected/user", () => {
		return HttpResponse.json(users[tier]);
	});

// Intercepts the hidden test-login endpoint. MSW sits at the network layer, so
// no real cookie is set — the companion /api/protected/user handler is what
// makes the app appear authenticated afterwards.
export const testLoginHandler = http.post("*/api/auth/test/login", () => {
	return new HttpResponse(null, { status: 204 });
});

/**
 * Default handlers - Pro tier user
 */
export const authHandlers = [createUserHandler("pro"), testLoginHandler];

/**
 * Handler factories for different user states
 */
export const authScenarios = {
	/** Free tier user */
	freeTier: () => createUserHandler("free"),

	/** Pro tier user */
	proTier: () => createUserHandler("pro"),

	/** Team tier user */
	teamTier: () => createUserHandler("team"),

	/** Unauthenticated - returns 401 */
	unauthenticated: () =>
		http.get("*/api/protected/user", () => {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}),

	/** Session expired */
	sessionExpired: () =>
		http.get("*/api/protected/user", () => {
			return HttpResponse.json({ error: "Session expired" }, { status: 401 });
		}),

	/** Test-login rejected (e.g. bad password) */
	testLoginFailed: () =>
		http.post("*/api/auth/test/login", () => {
			return HttpResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}),
};
