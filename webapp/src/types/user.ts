/**
 * User UI Type Definitions
 *
 * UI types (camelCase) for authenticated users
 */

import type { TierInfo } from "./tier";

// ============================================================================
// Auth User Types (UI - camelCase)
// ============================================================================

export type UserPersona =
	| "admin"
	| "marketing"
	| "developer"
	| "sales"
	| "content_creator"
	| "viewer";

export interface User {
	firstName: string;
	lastName: string;
	externalId: string;
	persona?: UserPersona;
	tier?: TierInfo;
}
