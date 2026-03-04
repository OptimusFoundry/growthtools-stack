/**
 * Centralized Type Guards
 *
 * Reusable type guard functions for common data validation patterns
 */

import type { ApiError } from "@/types/api.types";

/**
 * Type guard for ApiError response
 */
export const isApiError = (value: unknown): value is ApiError => {
	return (
		typeof value === "object" &&
		value !== null &&
		"error" in value &&
		typeof (value as ApiError).error === "string"
	);
};

/**
 * Type guard for error responses with code and message
 */
export const isCodedError = (
	value: unknown,
): value is { code: string; message: string } => {
	return (
		typeof value === "object" &&
		value !== null &&
		"code" in value &&
		"message" in value &&
		typeof (value as { code: string }).code === "string" &&
		typeof (value as { message: string }).message === "string"
	);
};

/**
 * Type guard for checking if a value has a specific property
 */
export const hasProperty = <K extends string>(
	value: unknown,
	key: K,
): value is Record<K, unknown> => {
	return typeof value === "object" && value !== null && key in value;
};

/**
 * Type guard for checking if a value has multiple properties
 */
export const hasProperties = <K extends string>(
	value: unknown,
	keys: readonly K[],
): value is Record<K, unknown> => {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	return keys.every((key) => key in value);
};

/**
 * Type guard for non-empty string
 */
export const isNonEmptyString = (value: unknown): value is string => {
	return typeof value === "string" && value.trim().length > 0;
};

/**
 * Type guard for checking if value is a valid Date
 */
export const isValidDate = (value: unknown): value is Date => {
	return value instanceof Date && !isNaN(value.getTime());
};

/**
 * Type guard for array of specific type
 */
export const isArrayOf = <T>(
	value: unknown,
	itemGuard: (item: unknown) => item is T,
): value is T[] => {
	return Array.isArray(value) && value.every(itemGuard);
};

/**
 * Type guard for non-empty arrays
 */
export const isNonEmptyArray = <T>(
	value: T[] | undefined | null,
): value is [T, ...T[]] => {
	return Array.isArray(value) && value.length > 0;
};

/**
 * Creates a type guard for objects with a discriminant property
 */
export const createDiscriminantGuard = <
	T extends { [K in D]: string },
	D extends keyof T,
>(
	discriminant: D,
	value: T[D],
) => {
	return (obj: unknown): obj is T => {
		return (
			typeof obj === "object" &&
			obj !== null &&
			discriminant in obj &&
			(obj as T)[discriminant] === value
		);
	};
};
