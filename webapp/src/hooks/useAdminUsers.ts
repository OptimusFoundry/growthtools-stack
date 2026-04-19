import { useCallback, useEffect, useRef, useState } from "react";
import { fetcher } from "@/api/client";
import type { ApiAdminUser } from "@/api/types/user";

export interface AdminUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	createdAt: string;
}

function toAdminUser(api: ApiAdminUser): AdminUser {
	return {
		id: api.id,
		email: api.email,
		firstName: api.first_name,
		lastName: api.last_name,
		createdAt: api.created_at,
	};
}

interface UseAdminUsersResult {
	users: AdminUser[];
	isLoading: boolean;
	error: string | null;
	search: (query: string) => void;
}

/**
 * Fetches admin user search results from GET /api/protected/admin/users?q=<query>.
 * Debounces the query by 250 ms. Empty query returns the 25 most recent users.
 */
export function useAdminUsers(): UseAdminUsersResult {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const fetchUsers = useCallback(async (q: string) => {
		setIsLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams({ q });
			const result = await fetcher<ApiAdminUser[]>(
				`${import.meta.env.VITE_API_URL}/api/protected/admin/users?${params.toString()}`,
				{ method: "GET" },
			);
			setUsers((result ?? []).map(toAdminUser));
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Failed to load users";
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Initial fetch on mount
	useEffect(() => {
		void fetchUsers("");
	}, [fetchUsers]);

	// Debounced search on query change
	useEffect(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
		}
		timerRef.current = setTimeout(() => {
			void fetchUsers(query);
		}, 250);
		return () => {
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
			}
		};
	}, [query, fetchUsers]);

	const search = useCallback((q: string) => {
		setQuery(q);
	}, []);

	return { users, isLoading, error, search };
}
