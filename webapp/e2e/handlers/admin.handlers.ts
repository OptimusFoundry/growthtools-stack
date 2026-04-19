/**
 * Admin API handlers
 *
 * Endpoints covered:
 *   GET    /api/protected/admin/users             — user search
 *   POST   /api/protected/admin/impersonate/:id   — start impersonation
 *   DELETE /api/protected/admin/impersonate       — stop impersonation
 */

import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";

// ── Mock data ─────────────────────────────────────────────────────────────

export const adminUsers = [
	{
		id: "user_target_1",
		email: "jane@example.com",
		first_name: "Jane",
		last_name: "Doe",
		created_at: "2024-01-15T10:00:00Z",
	},
	{
		id: "user_target_2",
		email: "bob@example.com",
		first_name: "Bob",
		last_name: "Smith",
		created_at: "2024-01-10T10:00:00Z",
	},
];

// ── Endpoint tables ────────────────────────────────────────────────────────

export const adminEndpoints = {
	users: setupEndpoint("GET", "*/api/protected/admin/users", adminUsers),
	startImpersonation: setupEndpoint(
		"POST",
		"*/api/protected/admin/impersonate/*",
		null,
		{
			successStatus: 204,
			overrides: {
				403: { error: "Forbidden", code: "FORBIDDEN" },
				404: { error: "User not found", code: "NOT_FOUND" },
				409: { error: "Already impersonating", code: "ALREADY_IMPERSONATING" },
			},
		},
	),
	stopImpersonation: setupEndpoint(
		"DELETE",
		"*/api/protected/admin/impersonate",
		null,
		{ successStatus: 204 },
	),
};

export const adminHandlers = [
	adminEndpoints.users[200](),
	adminEndpoints.startImpersonation[200](),
	adminEndpoints.stopImpersonation[200](),
];

// ── Semantic scenario variants ────────────────────────────────────────────

export const adminScenarios = {
	/** User is not an admin — /admin/users returns 403 */
	notAdmin: () =>
		http.get("*/api/protected/admin/users", () =>
			HttpResponse.json({ error: "Forbidden" }, { status: 403 }),
		),

	/** Active impersonation session — /api/protected/user returns impersonation fields */
	impersonating: () =>
		http.get("*/api/protected/user", () =>
			HttpResponse.json({
				first_name: "Jane",
				last_name: "Doe",
				external_id: "user_target_1",
				is_impersonated: true,
				impersonated_by: { id: "admin_user_1", name: "Admin User" },
			}),
		),

	/** Already impersonating — start returns 409 */
	alreadyImpersonating: () =>
		http.post("*/api/protected/admin/impersonate/*", () =>
			HttpResponse.json(
				{ error: "Already impersonating", code: "ALREADY_IMPERSONATING" },
				{ status: 409 },
			),
		),
};
