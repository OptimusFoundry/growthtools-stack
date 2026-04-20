import { useCallback, useEffect, useState } from "react";
import { fetcher } from "@/api/client";
import {
	toAnalyticsOverview,
	toPlatformBreakdown,
	toTimeSeriesDataPoint,
} from "@/api/transforms/analytics";
import type {
	ApiAnalyticsOverview,
	ApiPlatformBreakdown,
	ApiTimeSeriesDataPoint,
} from "@/api/types/analytics";
import type {
	AnalyticsOverview,
	PlatformBreakdown,
	TimeSeriesDataPoint,
} from "@/types/analytics";
import { getErrorMessage, isAbortError } from "@/utils/errorHandler";

// ── Date helpers ────────────────────────────────────────────────────────────

export type RangeKey = "7d" | "30d" | "90d";

export interface DateWindow {
	from: string; // RFC3339 timestamp, e.g. "2026-04-19T00:00:00.000Z"
	to: string;
}

/**
 * Converts a RangeKey into {from, to} relative to now (UTC) as RFC3339
 * timestamps. Backend (base-server/internal/analytics/handler) parses with
 * time.RFC3339, so date-only strings are rejected.
 */
export function rangeToDates(range: RangeKey): DateWindow {
	const to = new Date();
	const from = new Date();
	const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
	from.setUTCDate(from.getUTCDate() - days);
	return {
		from: from.toISOString(),
		to: to.toISOString(),
	};
}

/**
 * Returns the date window immediately before the given window, of the same
 * length. Used for prior-period delta computation.
 */
export function priorWindow(current: DateWindow): DateWindow {
	const fromDate = new Date(current.from);
	const toDate = new Date(current.to);
	const span = toDate.getTime() - fromDate.getTime();
	const priorTo = new Date(fromDate.getTime() - 1);
	const priorFrom = new Date(priorTo.getTime() - span);
	return {
		from: priorFrom.toISOString(),
		to: priorTo.toISOString(),
	};
}

// ── useAnalytics ────────────────────────────────────────────────────────────

interface AnalyticsFilters {
	from?: string;
	to?: string;
}

export const useAnalytics = (filters?: AnalyticsFilters) => {
	const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
	const [timeseries, setTimeseries] = useState<TimeSeriesDataPoint[]>([]);
	const [platformBreakdown, setPlatformBreakdown] = useState<
		PlatformBreakdown[]
	>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const buildQuery = useCallback(() => {
		const params = new URLSearchParams();
		if (filters?.from) params.set("from", filters.from);
		if (filters?.to) params.set("to", filters.to);
		const query = params.toString();
		return query ? `?${query}` : "";
	}, [filters?.from, filters?.to]);

	const fetchAnalytics = useCallback(
		async (signal: AbortSignal) => {
			setLoading(true);
			setError(null);
			const query = buildQuery();
			const base = `${import.meta.env.VITE_API_URL}/api/protected/analytics`;
			try {
				const [overviewData, timeseriesData, platformData] = await Promise.all([
					fetcher<ApiAnalyticsOverview>(`${base}/overview${query}`, {
						method: "GET",
						signal,
					}),
					fetcher<ApiTimeSeriesDataPoint[]>(`${base}/timeseries${query}`, {
						method: "GET",
						signal,
					}),
					fetcher<ApiPlatformBreakdown[]>(`${base}/platforms${query}`, {
						method: "GET",
						signal,
					}),
				]);
				setOverview(toAnalyticsOverview(overviewData));
				setTimeseries(timeseriesData.map(toTimeSeriesDataPoint));
				setPlatformBreakdown(platformData.map(toPlatformBreakdown));
			} catch (err: unknown) {
				if (isAbortError(err)) {
					console.debug("Analytics request aborted.");
				} else {
					setError(getErrorMessage(err));
				}
			} finally {
				setLoading(false);
			}
		},
		[buildQuery],
	);

	const refetch = useCallback(() => {
		const controller = new AbortController();
		fetchAnalytics(controller.signal);
		return () => controller.abort();
	}, [fetchAnalytics]);

	useEffect(() => {
		const controller = new AbortController();
		fetchAnalytics(controller.signal);
		return () => controller.abort();
	}, [fetchAnalytics]);

	return { overview, timeseries, platformBreakdown, loading, error, refetch };
};
