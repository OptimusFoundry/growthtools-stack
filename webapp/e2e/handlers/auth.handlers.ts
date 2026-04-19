/**
 * Auth/User API handlers
 *
 * Endpoints covered:
 *   POST /api/auth/test/login   — hidden test-login page
 *   GET  /api/protected/user    — current user / session hydration
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
 * Handler factories for different user states and error conditions.
 *
 * POST /api/auth/test/login error factories
 * ─────────────────────────────────────────
 * Backend handleError switch (auth/handler/auth.go):
 *   400 — ShouldBindJSON validation failure  (apierrors.ValidationError)
 *   401 — ErrIncorrectPassword               ("Invalid email or password")
 *   404 — ErrEmailDoesNotExist / ErrUserNotFound
 *   500 — unexpected processor error
 *
 * GET /api/protected/user error factories
 * ────────────────────────────────────────
 *   401 — missing/expired token (JWT middleware)
 *   500 — unexpected processor error
 */
export const authScenarios = {
	// ── User tier scenarios ──────────────────────────────────────────────────

	/** Free tier user */
	freeTier: () => createUserHandler("free"),

	/** Pro tier user */
	proTier: () => createUserHandler("pro"),

	/** Team tier user */
	teamTier: () => createUserHandler("team"),

	// ── GET /api/protected/user error scenarios ──────────────────────────────

	/** Unauthenticated - returns 401 */
	unauthenticated: () =>
		http.get("*/api/protected/user", () => {
			return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
		}),

	/** Session expired - 401 with session-expired message */
	sessionExpired: () =>
		http.get("*/api/protected/user", () => {
			return HttpResponse.json({ error: "Session expired" }, { status: 401 });
		}),

	/** Server error on user fetch - 500 */
	getUserServerError: () =>
		http.get("*/api/protected/user", () => {
			return HttpResponse.json(
				{ error: "Internal server error" },
				{ status: 500 },
			);
		}),

	/** Network/transport failure on user fetch */
	getUserNetworkError: () =>
		http.get("*/api/protected/user", () => HttpResponse.error()),

	// ── POST /api/auth/test/login error scenarios ────────────────────────────

	/** Test-login rejected (e.g. bad password) - 401 */
	testLoginFailed: () =>
		http.post("*/api/auth/test/login", () => {
			return HttpResponse.json(
				{ error: "Invalid email or password" },
				{ status: 401 },
			);
		}),

	/** Test-login validation error (missing/malformed fields) - 400 */
	testLoginBadRequest: () =>
		http.post("*/api/auth/test/login", () => {
			return HttpResponse.json({ error: "invalid input" }, { status: 400 });
		}),

	/** Test-login server error - 500 */
	testLoginServerError: () =>
		http.post("*/api/auth/test/login", () => {
			return HttpResponse.json(
				{ error: "Internal server error" },
				{ status: 500 },
			);
		}),

	/** Test-login network/transport failure */
	testLoginNetworkError: () =>
		http.post("*/api/auth/test/login", () => HttpResponse.error()),
};
