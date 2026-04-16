import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useDeletePost } from "@/hooks/useDeletePost";
import { useGetPosts } from "@/hooks/useGetPosts";
import { usePublishPost } from "@/hooks/usePublishPost";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Modal } from "@/proto-design-system/components/overlays/Modal";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { Post, PostSource, PostStatus } from "@/types/post";
import { getPlatformIcon } from "@/utils/platformIcons";
import calendarStyles from "./calendar.module.scss";
import styles from "./page.module.scss";

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

const STATUS_BADGE_VARIANT: Record<
	PostStatus,
	"success" | "warning" | "error" | "default" | "primary"
> = {
	draft: "default",
	scheduled: "warning",
	publishing: "primary",
	published: "success",
	failed: "error",
	partially_published: "warning",
};

const SOURCE_LABELS: Record<PostSource, string> = {
	manual: "Manual",
	ai_generated: "AI Generated",
	github_event: "GitHub",
	bulk_import: "Import",
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

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
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

	const { posts, loading, refetch } = useGetPosts();
	const { deletePost, loading: deleting } = useDeletePost();
	const { publishPost, loading: publishing } = usePublishPost();
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

	const handleDeleteConfirm = useCallback(async () => {
		if (!deleteTargetId) return;
		try {
			await deletePost(deleteTargetId);
			setDeleteTargetId(null);
			refetch();
		} catch {
			// error surfaced via hook state
		}
	}, [deleteTargetId, deletePost, refetch]);

	const handlePublish = async (id: string) => {
		try {
			await publishPost(id, []);
			refetch();
		} catch {
			// error surfaced via hook state
		}
	};

	return (
		<motion.div
			className={styles.page}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<div className={styles.pageHeader}>
				<h1 className={styles.pageTitle}>Content Calendar</h1>
				<p className={styles.pageDescription}>
					View your scheduled and published posts
				</p>
			</div>

			<div className={styles.pageContent}>
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
								title="No posts on this day"
								description="There are no posts scheduled or published for this date."
							/>
						) : (
							<Stack gap="sm">
								{selectedPosts.map((post) => (
									<Link key={post.id} to="/posts/$id" params={{ id: post.id }}>
										<Card padding="md" interactive>
											<Stack direction="row" justify="between" align="center">
												<Stack gap="md">
													<Stack direction="row" gap="sm" align="center">
														<Text size="sm" weight="semibold">
															{post.title || post.content.slice(0, 60)}
														</Text>
														<Badge
															variant={STATUS_BADGE_VARIANT[post.status]}
															size="sm"
														>
															{post.status}
														</Badge>
													</Stack>
													<Stack direction="row" gap="md" align="center">
														<Text size="xs" color="muted">
															<Text
																as="span"
																size="xs"
																color="secondary"
																weight="medium"
															>
																Source:{" "}
															</Text>
															{SOURCE_LABELS[post.source] ?? post.source}
														</Text>
														<Text size="xs" color="muted">
															<Text
																as="span"
																size="xs"
																color="secondary"
																weight="medium"
															>
																Created:{" "}
															</Text>
															{formatDate(post.createdAt)}
														</Text>
														{post.scheduledAt && (
															<Text size="xs" color="muted">
																<Text
																	as="span"
																	size="xs"
																	color="secondary"
																	weight="medium"
																>
																	Scheduled:{" "}
																</Text>
																{formatDateTime(post.scheduledAt)}
															</Text>
														)}
														{post.publishedAt && (
															<Text size="xs" color="muted">
																<Text
																	as="span"
																	size="xs"
																	color="secondary"
																	weight="medium"
																>
																	Published:{" "}
																</Text>
																{formatDateTime(post.publishedAt)}
															</Text>
														)}
													</Stack>
													{post.platforms.length > 0 && (
														<Stack direction="row" gap="xs" align="center">
															{post.platforms.map((p) => (
																<span key={p}>{getPlatformIcon(p, 14)}</span>
															))}
														</Stack>
													)}
												</Stack>
												<Stack direction="row" gap="xs">
													{post.status === "draft" && (
														<Button
															variant="primary"
															size="sm"
															onClick={(e) => {
																e.preventDefault();
																e.stopPropagation();
																handlePublish(post.id);
															}}
															isLoading={publishing}
														>
															Publish
														</Button>
													)}
													{post.status !== "published" &&
														post.status !== "partially_published" && (
															<Button
																variant="destructive"
																size="sm"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	setDeleteTargetId(post.id);
																}}
																aria-label="Delete post"
															>
																<Trash2 size={14} />
															</Button>
														)}
												</Stack>
											</Stack>
										</Card>
									</Link>
								))}
							</Stack>
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
							<strong>
								{MONTHS[month]} {year}
							</strong>
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
									const dayPosts = day ? (postsByDate.get(dateKey) ?? []) : [];
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
			</div>

			<Modal
				isOpen={deleteTargetId !== null}
				onClose={() => setDeleteTargetId(null)}
				title="Delete post"
				size="sm"
				footer={
					<Stack direction="row" gap="sm" justify="end">
						<Button variant="ghost" onClick={() => setDeleteTargetId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteConfirm}
							isLoading={deleting}
						>
							Delete
						</Button>
					</Stack>
				}
			>
				<Text color="secondary">
					Are you sure you want to delete this post? This action cannot be
					undone.
				</Text>
			</Modal>
		</motion.div>
	);
}
