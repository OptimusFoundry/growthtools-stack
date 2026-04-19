/**
 * Calendar UI Types (camelCase)
 */

export interface StatusBreakdown {
	draft: number;
	scheduled: number;
	publishing: number;
	published: number;
	failed: number;
	partiallyPublished: number;
}

export interface PlatformBreakdown {
	x: number;
	linkedin: number;
	bluesky: number;
	facebook: number;
	instagram: number;
	threads: number;
	tiktok: number;
	pinterest: number;
}

export interface CalendarDay {
	date: string;
	byStatus: StatusBreakdown;
	byPlatform: PlatformBreakdown;
}

export interface CalendarMonth {
	month: string;
	days: CalendarDay[];
	monthTotals: {
		byStatus: StatusBreakdown;
		byPlatform: PlatformBreakdown;
	};
}

export type CalendarViewMode = "status" | "platform";

export const ALL_PLATFORMS = [
	"x",
	"linkedin",
	"bluesky",
	"facebook",
	"instagram",
	"threads",
	"tiktok",
	"pinterest",
] as const;
export type PlatformKey = (typeof ALL_PLATFORMS)[number];
