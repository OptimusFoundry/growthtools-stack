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
import { useGetPosts } from "@/hooks/useGetPosts";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
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

function getPostDate(post: Post): string | undefined {
	return post.scheduledAt ?? post.publishedAt ?? post.createdAt;
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

type StatusCounts = Partial<Record<PostStatus, number>>;

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

function computeStatusCounts(dayPosts: Post[]): StatusCounts {
	const counts: StatusCounts = {};
	for (const post of dayPosts) {
		counts[post.status] = (counts[post.status] ?? 0) + 1;
	}
	return counts;
}

function CalendarPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	const { posts, loading } = useGetPosts();

	const navigateMonth = useCallback((delta: number) => {
		setCurrentDate(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
		);
		setSelectedDate(null);
	}, []);

	const daysInMonth = getDaysInMonth(year, month);
	const firstDay = getFirstDayOfMonth(year, month);

	const postsByDate = useMemo(() => {
		const map = new Map<string, Post[]>();
		for (const post of posts) {
			const dateStr = getPostDate(post);
			if (!dateStr) continue;
			const day = new Date(dateStr).toISOString().slice(0, 10);
			const existing = map.get(day) ?? [];
			existing.push(post);
			map.set(day, existing);
		}
		return map;
	}, [posts]);

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

	const selectedPosts = selectedDate
		? (postsByDate.get(selectedDate) ?? [])
		: [];

	const monthLabel = `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
	const scheduledThisMonth = posts.filter(
		(p) => p.status === "scheduled",
	).length;

	return (
		<>
			<Topbar
				title="Calendar"
				actions={
					<>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigateMonth(-1)}
							aria-label="Previous month"
						>
							<ChevronLeft size={16} />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setCurrentDate(new Date())}
						>
							Today
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigateMonth(1)}
							aria-label="Next month"
						>
							<ChevronRight size={16} />
						</Button>
					</>
				}
			/>
			<Stack gap="lg" className={styles.page} animate>
				<header className={styles.pageHero}>
					<div className={styles.pageHeroText}>
						<h1 className={styles.pageHeroTitle}>Calendar</h1>
						<p className={styles.pageHeroSub}>
							{monthLabel} · {scheduledThisMonth} scheduled
						</p>
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

							{loading ? (
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
								<Button
									variant="ghost"
									onClick={() => navigateMonth(-1)}
									aria-label="Previous month"
								>
									<ChevronLeft size={18} />
								</Button>
								<Text weight="semibold">
									{MONTHS[month]} {year}
								</Text>
								<Button
									variant="ghost"
									onClick={() => navigateMonth(1)}
									aria-label="Next month"
								>
									<ChevronRight size={18} />
								</Button>
							</Stack>

							{loading ? (
								<Spinner />
							) : (
								<div className={calendarStyles.calendarGrid}>
									{DAYS_OF_WEEK.map((day) => (
										<div key={day} className={calendarStyles.dayHeader}>
											{day}
										</div>
									))}
									{calendarCells.map(({ day, dateKey }) => {
										const dayPosts = day
											? (postsByDate.get(dateKey) ?? [])
											: [];
										const isToday = dateKey === today;
										const counts = day ? computeStatusCounts(dayPosts) : {};
										const hasPosts = dayPosts.length > 0;

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
														>
															<span className={calendarStyles.dayNumber}>
																{day}
															</span>
															<div className={calendarStyles.statusStripes}>
																{STATUS_STRIPE_ORDER.map((status) => {
																	const count = counts[status];
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
														</button>
													) : (
														<span className={calendarStyles.dayNumber}>
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
