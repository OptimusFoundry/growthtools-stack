/**
 * Common API Types
 *
 * Shared types used across all API interactions (snake_case to match API)
 */

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
	error: string;
	details?: unknown;
}

// ============================================================================
// Pagination Types (API format - snake_case)
// ============================================================================

export interface ApiPagination {
	next_cursor?: string;
	has_more: boolean;
	total_count?: number;
}

export interface ApiListParams {
	page?: number;
	limit?: number;
	offset?: number;
	sort?: string;
	order?: "asc" | "desc";
}

export interface ApiListResponse<T> {
	items: T[];
	total_count: number;
	page: number;
	page_size: number;
	total_pages: number;
}

// ============================================================================
// Analytics Types (API format)
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

export interface SignupsOverTimeParams {
	period?: AnalyticsPeriod;
	from?: string;
	to?: string;
}
