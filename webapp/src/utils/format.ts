/**
 * Relative-time formatter used across list pages.
 * Shared by routes/posts, routes/blog, routes/github, routes/calendar.
 */
export function timeAgo(iso: string): string {
	const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

/**
 * Word-boundary-aware truncation for list-row titles.
 */
export function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	const truncated = text.slice(0, maxLen);
	const lastSpace = truncated.lastIndexOf(" ");
	return (
		(lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated) +
		"..."
	);
}

export function formatNumber(value: number): string {
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return value.toLocaleString();
}

export function formatDelta(delta: number): string {
	return delta > 0 ? `+${formatNumber(delta)}` : formatNumber(delta);
}

/**
 * StatCard cannot infer a trend from a string delta, so derive it from the sign.
 */
export function trendOf(delta: string): "up" | "down" | "neutral" {
	if (delta.startsWith("-")) return "down";
	if (delta === "0" || delta === "+0") return "neutral";
	return "up";
}

/**
 * Group items by a discriminator key and return occurrence counts.
 * Useful for computing filter-tab counts in one pass instead of N .filter() calls.
 */
export function countBy<T, K extends string>(
	items: readonly T[],
	keyFn: (item: T) => K,
): Record<K, number> {
	const acc = {} as Record<K, number>;
	for (const item of items) {
		const key = keyFn(item);
		acc[key] = (acc[key] ?? 0) + 1;
	}
	return acc;
}
