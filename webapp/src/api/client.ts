/**
 * API Client
 *
 * Centralized HTTP client for all API calls
 */

import { isAbortError, isApiError } from "@/utils";
import type { ApiError } from "./types/common";

interface FetcherOptions extends RequestInit {
	headers?: HeadersInit;
}

// Re-export ApiError for convenience
export type { ApiError };

/**
 * Authenticated fetcher that includes credentials (cookies)
 * Use this for protected API endpoints
 */
export const fetcher = async <T>(
	url: string,
	options: FetcherOptions = {},
): Promise<T> => {
	try {
		// Add token to headers if it exists
		const headers = new Headers({
			"Content-Type": "application/json",
			...options.headers,
		});

		// Remove the 'connection' header if it exists
		if (headers.has("connection")) {
			headers.delete("connection");
		}

		const response = await fetch(url, {
			...options,
			headers,
			credentials: "include",
		});

		// Handle 204 No Content responses
		if (response.status === 204) {
			return undefined as T;
		}

		const data: unknown = await response.json();

		// Check if response is not OK (not a 2xx status)
		if (!response.ok) {
			const errorMessage = isApiError(data)
				? data.error
				: "An unknown error occurred";
			throw new Error(errorMessage);
		}

		// Return the parsed data if response is OK
		return data as T;
	} catch (error: unknown) {
		// Handle abort signal
		if (isAbortError(error)) {
			console.debug("Fetch request was aborted");
			return Promise.reject(error);
		}

		console.log("Error fetching request", error);
		throw error;
	}
};

/**
 * Public fetcher that doesn't send authentication credentials
 * Use this for public API endpoints (e.g., embed forms)
 */
export const publicFetcher = async <T>(
	url: string,
	options: FetcherOptions = {},
): Promise<T> => {
	try {
		const headers = new Headers({
			"Content-Type": "application/json",
			...options.headers,
		});

		// Remove the 'connection' header if it exists
		if (headers.has("connection")) {
			headers.delete("connection");
		}

		const response = await fetch(url, {
			...options,
			headers,
			// Note: NO credentials included for public requests
		});

		const data: unknown = await response.json();

		// Check if response is not OK (not a 2xx status)
		if (!response.ok) {
			const errorMessage = isApiError(data)
				? data.error
				: "An unknown error occurred";
			throw new Error(errorMessage);
		}

		// Return the parsed data if response is OK
		return data as T;
	} catch (error: unknown) {
		// Handle abort signal
		if (isAbortError(error)) {
			console.debug("Fetch request was aborted");
			return Promise.reject(error);
		}

		console.log("Error fetching request", error);
		throw error;
	}
};
