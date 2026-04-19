/**
 * User API Types
 *
 * API request/response types for authenticated users (snake_case)
 */

import type { ApiTierInfo } from "./tier";

// ============================================================================
// Auth User Types (API Response)
// ============================================================================

export type ApiUserPersona =
	| "admin"
	| "marketing"
	| "developer"
	| "sales"
	| "content_creator"
	| "viewer";

/** Summary of the admin who started the impersonation session. */
export interface ApiImpersonatorSummary {
	id: string;
	name: string;
	// email intentionally omitted — backend does not populate it
}

export interface ApiUser {
	first_name: string;
	last_name: string;
	external_id: string;
	persona?: ApiUserPersona;
	tier?: ApiTierInfo;
	/** Present (true) when the current session is an active impersonation. Omitted otherwise. */
	is_impersonated?: boolean;
	/** Set when is_impersonated is true. Contains the real admin's summary. */
	impersonated_by?: ApiImpersonatorSummary;
}

// ============================================================================
// Admin User Search Types
// ============================================================================

/** One row returned by GET /api/protected/admin/users */
export interface ApiAdminUser {
	id: string;
	email: string;
	first_name: string;
	last_name: string;
	created_at: string;
}
