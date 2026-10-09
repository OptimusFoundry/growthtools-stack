import {
	Badge,
	Button,
	EmptyState,
	Grid,
	List,
	type ListProps,
	PageHero,
	Spinner,
	Stack,
	Tabs,
	Text,
} from "@optimusfoundry/quiet";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowLeft,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { Topbar } from "@/components/Layout/Topbar";
import { statusLine } from "@/features/posts/components/PostRow/PostRow";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGetCalendarMonth } from "@/hooks/useGetCalendarMonth";
import { useGetPosts } from "@/hooks/useGetPosts";
import {
	ALL_PLATFORMS,
	type CalendarDay,
	type CalendarViewMode,
	type PlatformKey,
} from "@/types/calendar";
import {
	POST_STATUS_META,
	type PostListItem,
	type PostStatus,
} from "@/types/post";
import { truncate } from "@/utils/format";
import { getPlatformIcon } from "@/utils/platformIcons";
import styles from "./calendar.module.scss";

export const Route = createFileRoute("/calendar")({
	component: CalendarPage,
});

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const VIEW_MODE_TABS = [
	{ value: "status", label: "By status" },
	{ value: "platform", label: "By platform" },
];

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
	return new Date(year, month, 1).getDay();
}

function formatDisplayDate(dateStr: string): string {
	const [y, m, d] = dateStr.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

const STATUS_STRIPE_ORDER: PostStatus[] = [
	"published",
	"partially_published",
	"failed",
	"publishing",
	"scheduled",
	"draft",
];

const STATUS_LABELS: Record<PostStatus, string> = {
	draft: "draft",
	scheduled: "scheduled",
	publishing: "publishing",
	published: "published",
	failed: "failed",
	partially_published: "partial",
};

const STATUS_STRIPE_CLASS: Record<PostStatus, string> = {
	published: styles.stripePublished,
	partially_published: styles.stripePartial,
	failed: styles.stripeFailed,
	publishing: styles.stripePublishing,
	scheduled: styles.stripeScheduled,
	draft: styles.stripeDraft,
};

// Maps PostStatus keys to the camelCase field name in StatusBreakdown.
const STATUS_TO_BREAKDOWN_KEY: Record<
	PostStatus,
	keyof CalendarDay["byStatus"]
> = {
	draft: "draft",
	scheduled: "scheduled",
	publishing: "publishing",
	published: "published",
	failed: "failed",
	partially_published: "partiallyPublished",
};

function toListItems(posts: PostListItem[]): NonNullable<ListProps["items"]> {
	return posts.map((post, index) => {
		const meta = POST_STATUS_META[post.status];
		return {
			id: post.id,
			href: `/posts/${post.id}`,
			leading: `№ ${String(index + 1).padStart(2, "0")}`,
			primary: truncate(post.title ?? "Untitled post", 80),
			secondary: statusLine(post),
			trailing: (
				<span className={styles.postTrailing}>
					{post.platforms.length > 0 && (
						<span className={styles.chips}>
							{post.platforms.slice(0, 3).map((p) => (
								<span key={p} className={styles.chip} title={p}>
									{getPlatformIcon(p, 14)}
								</span>
							))}
						</span>
					)}
					<Badge variant={meta.badgeVariant} dot={meta.badgeDot}>
						{meta.label}
					</Badge>
				</span>
			),
		};
	});
}

function DayDetail({
	date,
	posts,
	loading,
	onBack,
}: {
	date: string;
	posts: PostListItem[];
	loading: boolean;
	onBack: () => void;
}) {
	return (
		<>
			<Stack direction="row" align="center" gap="sm">
				<Button
					variant="ghost"
					size="sm"
					onClick={onBack}
					leftIcon={<AppIcon icon={ArrowLeft} size="md" />}
				>
					Back to month
				</Button>
				<Text size="lg" weight="semibold">
					{formatDisplayDate(date)}
				</Text>
			</Stack>
			<DayPosts posts={posts} loading={loading} />
		</>
	);
}

function DayPosts({
	posts,
	loading,
}: {
	posts: PostListItem[];
	loading: boolean;
}) {
	if (loading) return <Spinner />;
	if (posts.length === 0) {
		return (
			<EmptyState
				icon={<AppIcon icon={CalendarDays} size="xl" />}
				title="No posts on this day"
				description="There are no posts scheduled or published for this date."
				headingLevel={2}
			/>
		);
	}
	return <List bordered divided items={toListItems(posts)} />;
}

function CalendarPage() {
	useDocumentTitle("Calendar");
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [viewMode, setViewMode] = useState<CalendarViewMode>("status");
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	// Month grid data from the server-side aggregate endpoint.
	// month+1 because JS Date months are 0-based but the API expects 1-based.
	const { data: calendarData, loading: calendarLoading } = useGetCalendarMonth(
		year,
		month + 1,
	);

	// Selected-day detail: only fetches when a day is selected.
	const { posts: selectedPosts, loading: postsLoading } = useGetPosts(
		selectedDate
			? { from: selectedDate, to: selectedDate, limit: 100 }
			: undefined,
	);

	const navigateMonth = useCallback((delta: number) => {
		setCurrentDate(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
		);
		setSelectedDate(null);
	}, []);

	const daysInMonth = getDaysInMonth(year, month);
	const firstDay = getFirstDayOfMonth(year, month);

	// Build a lookup map from the server response for O(1) cell rendering.
	const dayDataMap = useMemo(() => {
		const map = new Map<string, CalendarDay>();
		if (!calendarData) return map;
		for (const day of calendarData.days) {
			map.set(day.date, day);
		}
		return map;
	}, [calendarData]);

	const calendarCells = useMemo(() => {
		const cells: Array<{ day: number | null; dateKey: string }> = [];
		for (let i = 0; i < firstDay; i++) {
			cells.push({ day: null, dateKey: `empty-${i}` });
		}
		for (let d = 1; d <= daysInMonth; d++) {
			const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
			cells.push({ day: d, dateKey });
		}
		return cells;
	}, [year, month, daysInMonth, firstDay]);

	const today = new Date().toISOString().slice(0, 10);

	const monthLabel = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

	// Zero counts are dropped so an empty month doesn't read "0 draft · 0 scheduled · 0 …".
	const segments: string[] = [];
	if (calendarData) {
		if (viewMode === "status") {
			for (const status of STATUS_STRIPE_ORDER) {
				const count =
					calendarData.monthTotals.byStatus[STATUS_TO_BREAKDOWN_KEY[status]];
				if (count > 0) segments.push(`${count} ${STATUS_LABELS[status]}`);
			}
		} else {
			for (const platform of ALL_PLATFORMS as readonly PlatformKey[]) {
				const count = calendarData.monthTotals.byPlatform[platform] ?? 0;
				if (count > 0) segments.push(`${count} ${platform}`);
			}
		}
	}
	if (segments.length === 0) segments.push("0 scheduled");

	return (
		<>
			<Topbar
				title="Calendar"
				actions={
					<Tabs
						variant="pill"
						size="sm"
						tabs={VIEW_MODE_TABS}
						value={viewMode}
						onChange={(value) => setViewMode(value as CalendarViewMode)}
						label="Calendar view mode"
					/>
				}
			/>
			{/*
			  No `animated` on this Stack: the grid re-lays out when month posts
			  arrive, and the staggered rise makes Playwright day-cell clicks race.
			*/}
			<Stack gap="lg">
				<PageHero
					size="md"
					as="h2"
					ruled={false}
					className={styles.hero}
					title={monthLabel}
					description={segments.join(" · ")}
				/>
				{selectedDate ? (
					<DayDetail
						date={selectedDate}
						posts={selectedPosts}
						loading={postsLoading}
						onBack={() => setSelectedDate(null)}
					/>
				) : (
					<>
						<Stack direction="row" align="center" gap="sm">
							<Button
								variant="ghost"
								icon={<AppIcon icon={ChevronLeft} size="lg" />}
								aria-label="Prev month, calendar nav"
								onClick={() => navigateMonth(-1)}
							/>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCurrentDate(new Date())}
							>
								Today
							</Button>
							<Button
								variant="ghost"
								icon={<AppIcon icon={ChevronRight} size="lg" />}
								aria-label="Next month, calendar nav"
								onClick={() => navigateMonth(1)}
							/>
						</Stack>

						{calendarLoading ? (
							<Spinner />
						) : (
							<Grid columns={7} gap={1} className={styles.calendarGrid}>
								{DAYS_OF_WEEK.map((day) => (
									<div key={day} className={styles.dayHeader}>
										{day}
									</div>
								))}
								{calendarCells.map(({ day, dateKey }) => (
									<DayCell
										key={dateKey}
										day={day}
										dayData={day ? dayDataMap.get(dateKey) : undefined}
										isToday={dateKey === today}
										viewMode={viewMode}
										label={`${MONTHS[month]} ${day}, ${year}`}
										onSelect={() => setSelectedDate(dateKey)}
									/>
								))}
							</Grid>
						)}
					</>
				)}
			</Stack>
		</>
	);
}

function DayCell({
	day,
	dayData,
	isToday,
	viewMode,
	label,
	onSelect,
}: {
	day: number | null;
	dayData: CalendarDay | undefined;
	isToday: boolean;
	viewMode: CalendarViewMode;
	label: string;
	onSelect: () => void;
}) {
	const cls = [
		styles.dayCell,
		day ? "" : styles.emptyCell,
		isToday ? styles.today : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={cls}>
			{day && !dayData && (
				<span className={styles.dayNumber} aria-label={`${label} — no posts`}>
					{day}
				</span>
			)}
			{day && dayData && (
				<button
					type="button"
					className={styles.dayCellButton}
					onClick={onSelect}
					aria-label={`View posts for ${label}`}
				>
					<span className={styles.dayNumber}>{day}</span>
					<div className={styles.statusStripes}>
						{viewMode === "status" ? (
							<StatusStripes dayData={dayData} />
						) : (
							<PlatformStripes dayData={dayData} />
						)}
					</div>
				</button>
			)}
		</div>
	);
}

function StatusStripes({ dayData }: { dayData: CalendarDay }) {
	return STATUS_STRIPE_ORDER.map((status) => {
		const count = dayData.byStatus[STATUS_TO_BREAKDOWN_KEY[status]];
		if (!count) return null;
		return (
			<span
				key={status}
				className={`${styles.stripe} ${STATUS_STRIPE_CLASS[status]}`}
			>
				{count} {STATUS_LABELS[status]}
			</span>
		);
	});
}

function PlatformStripes({ dayData }: { dayData: CalendarDay }) {
	return (ALL_PLATFORMS as readonly PlatformKey[]).map((platform) => {
		const count = dayData.byPlatform[platform] ?? 0;
		if (!count) return null;
		return (
			<span
				key={platform}
				className={`${styles.stripe} ${styles.stripePlatform}`}
			>
				{getPlatformIcon(platform, 10)} {count}
			</span>
		);
	});
}
