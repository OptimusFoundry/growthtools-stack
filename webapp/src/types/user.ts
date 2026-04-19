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

export interface ImpersonatorSummary {
	id: string;
	name: string;
}

export interface User {
	firstName: string;
	lastName: string;
	externalId: string;
	persona?: UserPersona;
	tier?: TierInfo;
	/** True when the current session is an active impersonation of another user. */
	isImpersonated?: boolean;
	/** Set when isImpersonated is true. */
	impersonatedBy?: ImpersonatorSummary;
}
