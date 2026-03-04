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

export interface ApiUser {
	first_name: string;
	last_name: string;
	external_id: string;
	persona?: ApiUserPersona;
	tier?: ApiTierInfo;
}
