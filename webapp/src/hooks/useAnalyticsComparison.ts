import { useMemo } from "react";
import type { RangeKey } from "./useAnalytics";
import { priorWindow, rangeToDates, useAnalytics } from "./useAnalytics";

export interface AnalyticsDeltas {
	impressions: number; // current - prior (positive = up)
	likes: number;
	comments: number;
	shares: number;
}

export interface AnalyticsComparisonResult {
	current: ReturnType<typeof useAnalytics>;
	prior: ReturnType<typeof useAnalytics>;
	deltas: AnalyticsDeltas | null; // null while either window is loading
}

/**
 * Calls useAnalytics twice (current window + prior window of the same length)
 * and exposes computed deltas. Doubles request volume but responses are small
 * and independent.
 */
export function useAnalyticsComparison(
	range: RangeKey,
): AnalyticsComparisonResult {
	const currentWindow = useMemo(() => rangeToDates(range), [range]);
	const priorWin = useMemo(() => priorWindow(currentWindow), [currentWindow]);

	const current = useAnalytics(currentWindow);
	const prior = useAnalytics(priorWin);

	const deltas = useMemo<AnalyticsDeltas | null>(() => {
		if (!current.overview || !prior.overview) return null;
		return {
			impressions:
				current.overview.totalImpressions - prior.overview.totalImpressions,
			likes: current.overview.totalLikes - prior.overview.totalLikes,
			comments: current.overview.totalComments - prior.overview.totalComments,
			shares: current.overview.totalShares - prior.overview.totalShares,
		};
	}, [current.overview, prior.overview]);

	return { current, prior, deltas };
}
