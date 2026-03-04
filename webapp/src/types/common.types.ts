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
