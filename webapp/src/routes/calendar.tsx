import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	CalendarDays,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import { useGetCalendarMonth } from "@/hooks/useGetCalendarMonth";
import { useGetPosts } from "@/hooks/useGetPosts";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import {
	Tab,
	TabList,
	Tabs,
} from "@/proto-design-system/components/navigation/Tabs/Tabs";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import {
	ALL_PLATFORMS,
	type CalendarDay,
	type CalendarViewMode,
	type PlatformKey,
} from "@/types/calendar";
import type { Post, PostStatus } from "@/types/post";
import { getPlatformIcon } from "@/utils/platformIcons";
import calendarStyles from "./calendar.module.scss";
import styles from "./page.module.scss";
import postStyles from "./posts.module.scss";

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

const STATUS_CLASS: Record<PostStatus, string> = {
	draft: "statusDraft",
	scheduled: "statusScheduled",
	publishing: "statusPublishing",
	published: "statusPublished",
	failed: "statusFailed",
	partially_published: "statusPartial",
};

const STATUS_ROW_LABELS: Record<PostStatus, string> = {
	draft: "Draft",
	scheduled: "Scheduled",
	publishing: "Publishing",
	published: "Published",
	failed: "Failed",
	partially_published: "Partial",
};

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
	return new Date(year, month, 1).getDay();
}

function timeAgo(iso: string): string {
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

function statusLine(post: Post): string {
	const when = post.publishedAt ?? post.scheduledAt ?? post.createdAt;
	const ago = timeAgo(when);
	if (post.status === "published") return `Published · ${ago}`;
	if (post.status === "scheduled") return `Queued · ${ago}`;
	if (post.status === "failed") return `Failed · needs retry`;
	if (post.status === "publishing") return `Publishing · ${ago}`;
	if (post.status === "partially_published") return `Partial · ${ago}`;
	return `Draft · edited ${ago}`;
}

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) return text;
	const truncated = text.slice(0, maxLen);
	const lastSpace = truncated.lastIndexOf(" ");
	return (
		(lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated) +
		"..."
	);
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
	published: "stripePublished",
	partially_published: "stripePartial",
	failed: "stripeFailed",
	publishing: "stripePublishing",
	scheduled: "stripeScheduled",
	draft: "stripeDraft",
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

function CalendarPage() {
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

	// Build the subtitle segments for the selected view mode, dropping zeros
	// so the header doesn't read "0 draft · 0 scheduled · 0 …" on empty months.
	const subtitleSegments: string[] = [];
	if (calendarData) {
		if (viewMode === "status") {
			for (const status of STATUS_STRIPE_ORDER) {
				const count =
					calendarData.monthTotals.byStatus[STATUS_TO_BREAKDOWN_KEY[status]];
				if (count > 0) {
					subtitleSegments.push(`${count} ${STATUS_LABELS[status]}`);
				}
			}
		} else {
			for (const platform of ALL_PLATFORMS as readonly PlatformKey[]) {
				const count = calendarData.monthTotals.byPlatform[platform] ?? 0;
				if (count > 0) subtitleSegments.push(`${count} ${platform}`);
			}
		}
	}
	// Fallback when the month has no posts so the header still reads sensibly.
	if (subtitleSegments.length === 0) subtitleSegments.push("0 scheduled");
	const subtitle = `${monthLabel} · ${subtitleSegments.join(" · ")}`;

	return (
		<>
			<Topbar
				title="Calendar"
				actions={
					<>
						<Tabs
							variant="pill"
							size="sm"
							activeTab={viewMode}
							onTabChange={(id) => setViewMode(id as CalendarViewMode)}
						>
							<TabList aria-label="Calendar view mode">
								<Tab id="status">By status</Tab>
								<Tab id="platform">By platform</Tab>
							</TabList>
						</Tabs>
					</>
				}
			/>
			{/*
			  No outer Stack `animate` on this route: the calendar grid is
			  data-heavy (re-layouts when month posts arrive) and the
			  staggered y:12→0 transform causes Playwright actionability
			  races where day-cell button clicks time out. Page hero still
			  feels fine without the extra polish.
			*/}
			<Stack gap="lg" className={styles.page}>
				<header className={styles.pageHero}>
					<div className={styles.pageHeroText}>
						<h1 className={styles.pageHeroTitle}>Calendar</h1>
						<p className={styles.pageHeroSub}>{subtitle}</p>
					</div>
				</header>
				<Stack gap="md">
					{selectedDate ? (
						<>
							<Stack direction="row" align="center" gap="sm">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setSelectedDate(null)}
								>
									<ArrowLeft size={16} /> Back to month
								</Button>
								<Text size="lg" weight="semibold">
									{formatDisplayDate(selectedDate)}
								</Text>
							</Stack>

							{postsLoading ? (
								<Spinner />
							) : selectedPosts.length === 0 ? (
								<EmptyState
									icon={<CalendarDays size={48} />}
									title="No posts on this day"
									description="There are no posts scheduled or published for this date."
								/>
							) : (
								<motion.div
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.2 }}
									className={postStyles.postList}
								>
									{selectedPosts.map((post, index) => (
										<Link
											key={post.id}
											to="/posts/$id"
											params={{ id: post.id }}
											className={postStyles.postLink}
										>
											<div className={postStyles.postRow}>
												<div className={postStyles.titleRow}>
													<span className={postStyles.idx}>
														№ {String(index + 1).padStart(2, "0")}
													</span>
													<div className={postStyles.postBody}>
														<div className={postStyles.postTitleText}>
															{truncate(post.title || post.content, 80)}
														</div>
														<div className={postStyles.postMetaText}>
															{statusLine(post)}
														</div>
													</div>
												</div>
												<div className={postStyles.metaRow}>
													{post.platforms.length > 0 && (
														<span className={postStyles.platformChips}>
															{post.platforms.slice(0, 3).map((p) => (
																<span
																	key={p}
																	className={postStyles.platformChip}
																	title={p}
																>
																	{getPlatformIcon(p, 14)}
																</span>
															))}
														</span>
													)}
													<span
														className={`${postStyles.statusBadge} ${postStyles[STATUS_CLASS[post.status]]}`}
													>
														{STATUS_ROW_LABELS[post.status]}
													</span>
													<span className={postStyles.chevronBtn} aria-hidden>
														<ChevronRight size={16} />
													</span>
												</div>
											</div>
										</Link>
									))}
								</motion.div>
							)}
						</>
					) : (
						<>
							<Stack direction="row" justify="between" align="center">
								<Stack direction="row" align="center" gap="sm">
									<Button
										variant="ghost"
										onClick={() => navigateMonth(-1)}
										aria-label="Prev month, calendar nav"
										isIconOnly={true}
										leftIcon={<ChevronLeft size={18} />}
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
										onClick={() => navigateMonth(1)}
										aria-label="Next month, calendar nav"
										isIconOnly={true}
										leftIcon={<ChevronRight size={18} />}
									/>
								</Stack>
							</Stack>

							{calendarLoading ? (
								<Spinner />
							) : (
								<div className={calendarStyles.calendarGrid}>
									{DAYS_OF_WEEK.map((day) => (
										<div key={day} className={calendarStyles.dayHeader}>
											{day}
										</div>
									))}
									{calendarCells.map(({ day, dateKey }) => {
										const dayData = day ? dayDataMap.get(dateKey) : undefined;
										const isToday = dateKey === today;
										const hasPosts = !!dayData;

										return (
											<div
												key={dateKey}
												className={`${calendarStyles.dayCell} ${day ? "" : calendarStyles.emptyCell} ${isToday ? calendarStyles.today : ""}`}
											>
												{day &&
													(hasPosts ? (
														<button
															type="button"
															className={calendarStyles.dayCellButton}
															onClick={() => setSelectedDate(dateKey)}
															aria-label={`View posts for ${MONTHS[month]} ${day}, ${year}`}
														>
															<span className={calendarStyles.dayNumber}>
																{day}
															</span>
															{viewMode === "status" ? (
																<div className={calendarStyles.statusStripes}>
																	{STATUS_STRIPE_ORDER.map((status) => {
																		const count =
																			dayData.byStatus[
																				STATUS_TO_BREAKDOWN_KEY[status]
																			];
																		if (!count) return null;
																		return (
																			<span
																				key={status}
																				className={`${calendarStyles.stripe} ${calendarStyles[STATUS_STRIPE_CLASS[status]]}`}
																			>
																				{count} {STATUS_LABELS[status]}
																			</span>
																		);
																	})}
																</div>
															) : (
																<div className={calendarStyles.statusStripes}>
																	{(
																		ALL_PLATFORMS as readonly PlatformKey[]
																	).map((platform) => {
																		const count =
																			dayData.byPlatform[platform] ?? 0;
																		if (!count) return null;
																		return (
																			<span
																				key={platform}
																				className={`${calendarStyles.stripe} ${calendarStyles.stripePlatform}`}
																			>
																				{getPlatformIcon(platform, 10)} {count}
																			</span>
																		);
																	})}
																</div>
															)}
														</button>
													) : (
														<span
															className={calendarStyles.dayNumber}
															aria-label={`${MONTHS[month]} ${day}, ${year} — no posts`}
														>
															{day}
														</span>
													))}
											</div>
										);
									})}
								</div>
							)}
						</>
					)}
				</Stack>
			</Stack>
		</>
	);
}
