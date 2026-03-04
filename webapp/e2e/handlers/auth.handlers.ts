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

/**
 * Default handlers - Pro tier user
 */
export const authHandlers = [createUserHandler("pro")];

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
};
