import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import { toCalendarMonth } from "@/api/transforms/calendar";
import type { ApiCalendarMonth } from "@/api/types/calendar";
import type { CalendarMonth } from "@/types/calendar";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

export function useGetCalendarMonth(
	year: number,
	month: number,
): {
	data: CalendarMonth | null;
	loading: boolean;
	error: string | null;
	refetch: () => void;
} {
	const [data, setData] = useState<CalendarMonth | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const fetchCalendar = useCallback(
		async (signal: AbortSignal) => {
			setLoading(true);
			setError(null);
			try {
				const url = `${import.meta.env.VITE_API_URL}/api/protected/posts/calendar?year=${year}&month=${month}`;
				const response = await fetcher<ApiCalendarMonth>(url, {
					method: "GET",
					signal,
				});
				setData(toCalendarMonth(response));
			} catch (err: unknown) {
				if (isAbortError(err)) {
					console.debug("Calendar request aborted.");
				} else {
					setError(getErrorMessage(err));
				}
			} finally {
				setLoading(false);
			}
		},
		[year, month],
	);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchCalendar(controller.signal);
		return () => controller.abort();
	}, [fetchCalendar]);

	useEffect(() => {
		const controller = new AbortController();
		fetchCalendar(controller.signal);
		return () => controller.abort();
	}, [fetchCalendar]);

	return { data, loading, error, refetch };
}
