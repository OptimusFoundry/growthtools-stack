/**
 * Base Transformation Utilities
 *
 * Generic utilities for transforming between API (snake_case) and UI (camelCase) formats
 */

/**
 * Converts a snake_case string to camelCase
 */
export function snakeToCamel(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts a camelCase string to snake_case
 */
export function camelToSnake(str: string): string {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively converts all keys in an object from snake_case to camelCase
 */
export function objectKeysToCamel<T = unknown>(obj: unknown): T {
	if (obj === null || obj === undefined) {
		return obj as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => objectKeysToCamel(item)) as T;
	}

	if (typeof obj === "object" && obj.constructor === Object) {
		return Object.fromEntries(
			Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
				snakeToCamel(key),
				objectKeysToCamel(value),
			]),
		) as T;
	}

	return obj as T;
}

/**
 * Recursively converts all keys in an object from camelCase to snake_case
 */
export function objectKeysToSnake<T = unknown>(obj: unknown): T {
	if (obj === null || obj === undefined) {
		return obj as T;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => objectKeysToSnake(item)) as T;
	}

	if (typeof obj === "object" && obj.constructor === Object) {
		return Object.fromEntries(
			Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
				camelToSnake(key),
				objectKeysToSnake(value),
			]),
		) as T;
	}

	return obj as T;
}

/**
 * Safe date parser that returns Date object or undefined
 */
export function parseDate(dateString?: string | null): Date | undefined {
	if (!dateString) return undefined;
	try {
		const date = new Date(dateString);
		return isNaN(date.getTime()) ? undefined : date;
	} catch {
		return undefined;
	}
}

/**
 * Format a date to ISO string, handling null/undefined
 */
export function formatDateToISO(date?: Date | null): string | undefined {
	if (!date) return undefined;
	try {
		return date.toISOString();
	} catch {
		return undefined;
	}
}
