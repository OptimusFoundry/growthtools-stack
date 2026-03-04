/**
 * User API Types
 *
 * API request/response types for users and waitlist participants (snake_case)
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

// ============================================================================
// Waitlist User Types (API Response)
// ============================================================================

export type ApiWaitlistUserStatus =
	| "pending"
	| "verified"
	| "invited"
	| "active"
	| "rejected";

export interface ApiWaitlistUser {
	id: string;
	campaign_id: string;
	email: string;
	email_verified: boolean;
	status: ApiWaitlistUserStatus;
	position: number;
	original_position: number;
	referral_code: string;
	referred_by_id?: string;
	referral_count: number;
	verified_referral_count: number;
	share_count: number;
	points: number;
	source: string;
	terms_accepted: boolean;
	marketing_consent: boolean;
	custom_fields?: Record<string, string>;
	metadata?: Record<string, string>;
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_content?: string;
	utm_term?: string;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// List/Response Types
// ============================================================================

export interface ApiListUsersResponse {
	users: ApiWaitlistUser[];
	total_count: number;
	page: number;
	page_size: number;
	total_pages: number;
}

export interface ApiListUsersParams {
	page?: number;
	limit?: number;
	status?: ApiWaitlistUserStatus | "removed" | "blocked";
	sort?: "position" | "created_at" | "referral_count";
	order?: "asc" | "desc";
}
