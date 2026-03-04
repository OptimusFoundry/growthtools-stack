/**
 * User UI Type Definitions
 *
 * UI types (camelCase) for users and waitlist participants
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

// ============================================================================
// Waitlist User Types (UI - camelCase)
// ============================================================================

export type WaitlistUserStatus =
	| "pending"
	| "verified"
	| "invited"
	| "active"
	| "rejected";

export interface WaitlistUser {
	id: string;
	campaignId: string;
	email: string;
	emailVerified: boolean;
	status: WaitlistUserStatus;
	position: number;
	originalPosition: number;
	referralCode: string;
	referredById?: string;
	referralCount: number;
	verifiedReferralCount: number;
	shareCount: number;
	points: number;
	source: string;
	termsAccepted: boolean;
	marketingConsent: boolean;
	customFields?: Record<string, string>;
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	utmContent?: string;
	utmTerm?: string;
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// UTM Types
// ============================================================================

export interface UTMParams {
	source?: string;
	medium?: string;
	campaign?: string;
	content?: string;
	term?: string;
}

export interface UserMetadata {
	ipAddress?: string;
	userAgent?: string;
	country?: string;
	device?: "mobile" | "tablet" | "desktop";
}

// ============================================================================
// List/Filter Types
// ============================================================================

export interface ListUsersParams {
	page?: number;
	limit?: number;
	status?: WaitlistUserStatus | "removed" | "blocked";
	sort?: "position" | "created_at" | "referral_count";
	order?: "asc" | "desc";
}

export interface ListUsersResponse {
	users: WaitlistUser[];
	totalCount: number;
	page: number;
	pageSize: number;
	totalPages: number;
}

export interface UserFilters {
	status?: WaitlistUserStatus[];
	source?: string[];
	hasReferrals?: boolean;
	minPosition?: number;
	maxPosition?: number;
	dateRange?: {
		start: Date;
		end: Date;
	};
}

export type UserSortField =
	| "email"
	| "status"
	| "position"
	| "referralCount"
	| "source"
	| "createdAt";

export type SortDirection = "asc" | "desc";
