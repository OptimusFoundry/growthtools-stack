/**
 * Common Type Definitions
 *
 * Core types for the Growth Tools platform
 */

// ============================================================================
// Account User Types
// ============================================================================

export interface AccountUser {
	id: string;
	email: string;
	name: string;
	role: "owner" | "admin" | "editor" | "viewer";
	permissions?: string[];
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// Analytics Types (placeholder — will be replaced with social media analytics)
// ============================================================================

export interface Analytics {
	overview: {
		totalSignups: number;
		todaySignups: number;
		verificationRate: number;
		referralRate: number;
		viralCoefficient: number;
		avgReferralsPerUser: number;
	};
	funnel: {
		impressions: number;
		started: number;
		submitted: number;
		verified: number;
		referred: number;
	};
	trafficSources: {
		source: string;
		count: number;
		percentage: number;
	}[];
	timeline: {
		date: string;
		signups: number;
		referrals: number;
		verifications: number;
	}[];
}

// ============================================================================
// UI Types
// ============================================================================

export interface Toast {
	id: string;
	type: "success" | "error" | "info" | "warning";
	message: string;
	duration?: number;
}

// Re-export API types for convenience
export type {
	ApiError,
	ApiResponse,
	ListParams,
	ListResponse,
	PaginatedResponse,
	Pagination,
	PaginationParams,
} from "./api.types";
