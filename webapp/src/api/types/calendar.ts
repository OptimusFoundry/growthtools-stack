/**
 * Calendar API Types
 * API response types for the month-aggregate calendar endpoint (snake_case, matches Go JSON tags).
 */

export interface ApiStatusBreakdown {
	draft: number;
	scheduled: number;
	publishing: number;
	published: number;
	failed: number;
	partially_published: number;
}

export interface ApiPlatformBreakdown {
	x: number;
	linkedin: number;
	bluesky: number;
	facebook: number;
	instagram: number;
	threads: number;
	tiktok: number;
	pinterest: number;
}

export interface ApiCalendarDay {
	date: string; // "YYYY-MM-DD"
	by_status: ApiStatusBreakdown;
	by_platform: ApiPlatformBreakdown;
}

export interface ApiCalendarMonth {
	month: string; // "YYYY-MM"
	days: ApiCalendarDay[];
	month_totals: {
		by_status: ApiStatusBreakdown;
		by_platform: ApiPlatformBreakdown;
	};
}
