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
