/**
 * Auth/User API handlers
 *
 * Endpoints covered:
 *   POST /api/auth/test/login   — hidden test-login page
 *   GET  /api/protected/user    — current user / session hydration
 */
import { HttpResponse, http } from "msw";
import type { ApiTierName } from "../../src/api/types/tier";
import type { ApiUserPersona } from "../../src/api/types/user";
import { setupEndpoint } from "../helpers/endpoint";
import { users } from "../mocks/data";

export const createUserHandler = (tier: ApiTierName) =>
	http.get("*/api/protected/user", () => HttpResponse.json(users[tier]));

// ── Endpoint table ─────────────────────────────────────────────────────────

export const authEndpoints = {
	user: setupEndpoint("GET", "*/api/protected/user", users.pro),
	testLogin: setupEndpoint("POST", "*/api/auth/test/login", null, {
		successStatus: 204,
		overrides: {
			401: { error: "Invalid email or password", code: "UNAUTHORIZED" },
		},
	}),
};

export const testLoginHandler = authEndpoints.testLogin[200]();

export const authHandlers = [createUserHandler("pro"), testLoginHandler];

// ── Semantic scenario variants (consumed by auth.spec.ts) ─────────────────

export const authScenarios = {
	/** Free tier user */
	freeTier: () => createUserHandler("free"),
	/** Pro tier user */
	proTier: () => createUserHandler("pro"),
	/** Team tier user */
	teamTier: () => createUserHandler("team"),

	/** Pro tier user with a specific persona (drives persona-gated navigation) */
	withPersona: (persona: ApiUserPersona) =>
		http.get("*/api/protected/user", () =>
			HttpResponse.json({ ...users.pro, persona }),
		),

	/** Unauthenticated — generic 401 on /user */
	unauthenticated: () =>
		http.get("*/api/protected/user", () =>
			HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
		),

	/** Session expired — 401 with a specific message the UI checks for */
	sessionExpired: () =>
		http.get("*/api/protected/user", () =>
			HttpResponse.json({ error: "Session expired" }, { status: 401 }),
		),

	/**
	 * Test-login rejected (bad password) — 401 with specific message. Kept as
	 * a semantic variant because auth.spec.ts asserts the exact error copy.
	 */
	testLoginFailed: () =>
		http.post("*/api/auth/test/login", () =>
			HttpResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			),
		),
};
