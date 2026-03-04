/**
 * Shared API Type Definitions
 *
 * Core types used across all API interactions
 */

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
	error: string;
	details?: unknown;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface Pagination {
	next_cursor?: string;
	has_more: boolean;
	total_count?: number;
}

export interface PaginationParams {
	page?: number;
	limit?: number;
	offset?: number;
}

export interface PaginatedResponse<T> {
	items: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
	};
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
	data: T;
	meta?: {
		page?: number;
		limit?: number;
		total?: number;
		hasMore?: boolean;
	};
}

// ============================================================================
// Common Request/Response Patterns
// ============================================================================

export interface ListParams {
	page?: number;
	limit?: number;
	sort?: string;
	order?: "asc" | "desc";
}

export interface ListResponse<T> {
	items: T[];
	total_count: number;
	page: number;
	page_size: number;
	total_pages: number;
}

// ============================================================================
// Waitlist User API Response (snake_case from server)
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
	utm_source?: string;
	utm_medium?: string;
	utm_campaign?: string;
	utm_content?: string;
	utm_term?: string;
	created_at: string;
	updated_at: string;
}

export interface ApiListUsersResponse {
	users: ApiWaitlistUser[];
	total_count: number;
	page: number;
	page_size: number;
	total_pages: number;
}

// ============================================================================
// Analytics API Types
// ============================================================================

export type AnalyticsPeriod = "hour" | "day" | "week" | "month";

export interface ApiSignupDataPoint {
	date: string;
	count: number;
}

export interface ApiSignupsOverTimeResponse {
	data: ApiSignupDataPoint[];
	total: number;
	period: AnalyticsPeriod;
}

export interface SignupsOverTimeParams {
	period?: AnalyticsPeriod;
	from?: string;
	to?: string;
}

export interface ApiSignupsBySourceDataPoint {
	date: string;
	utm_source: string | null;
	count: number;
}

export interface ApiSignupsBySourceResponse {
	data: ApiSignupsBySourceDataPoint[];
	sources: string[];
	total: number;
	period: AnalyticsPeriod;
}
