import type {
	ApiCalendarDay,
	ApiCalendarMonth,
	ApiPlatformBreakdown,
	ApiStatusBreakdown,
} from "@/api/types/calendar";
import type {
	CalendarDay,
	CalendarMonth,
	PlatformBreakdown,
	StatusBreakdown,
} from "@/types/calendar";

function toStatusBreakdown(api: ApiStatusBreakdown): StatusBreakdown {
	return {
		draft: api.draft,
		scheduled: api.scheduled,
		publishing: api.publishing,
		published: api.published,
		failed: api.failed,
		partiallyPublished: api.partially_published,
	};
}

function toPlatformBreakdown(api: ApiPlatformBreakdown): PlatformBreakdown {
	return {
		x: api.x,
		linkedin: api.linkedin,
		bluesky: api.bluesky,
		facebook: api.facebook,
		instagram: api.instagram,
		threads: api.threads,
		tiktok: api.tiktok,
		pinterest: api.pinterest,
	};
}

function toCalendarDay(api: ApiCalendarDay): CalendarDay {
	return {
		date: api.date,
		byStatus: toStatusBreakdown(api.by_status),
		byPlatform: toPlatformBreakdown(api.by_platform),
	};
}

export function toCalendarMonth(api: ApiCalendarMonth): CalendarMonth {
	return {
		month: api.month,
		days: api.days.map(toCalendarDay),
		monthTotals: {
			byStatus: toStatusBreakdown(api.month_totals.by_status),
			byPlatform: toPlatformBreakdown(api.month_totals.by_platform),
		},
	};
}
