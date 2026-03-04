/**
 * Centralized Error Handling Utilities
 *
 * Provides type-safe error handling for catch blocks and API responses
 */

import type { ApiError } from "@/types/api.types";

/**
 * Extracts a user-friendly error message from an unknown error
 */
export const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	return "An unknown error occurred";
};

/**
 * Checks if an error is an AbortError (from AbortController)
 */
export const isAbortError = (error: unknown): boolean => {
	return error instanceof Error && error.name === "AbortError";
};

/**
 * Creates a standardized ApiError object from an unknown error
 */
export const toApiError = (error: unknown): ApiError => {
	return { error: getErrorMessage(error) };
};

/**
 * Creates an ApiError with a specific error code prefix
 */
export const toCodedApiError = (
	error: unknown,
	code: string,
): { code: string; message: string } => {
	return {
		code,
		message: getErrorMessage(error),
	};
};

/**
 * Handles errors in async operations with consistent logging
 * Returns the error message for display
 */
export const handleAsyncError = (error: unknown, context?: string): string => {
	const message = getErrorMessage(error);

	if (context) {
		console.error(`${context}:`, error);
	} else {
		console.error(error);
	}

	return message;
};

/**
 * Type guard for checking if a value is a non-null object
 */
export const isObject = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null;
};
