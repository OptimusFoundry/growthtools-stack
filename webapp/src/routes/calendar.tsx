import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { useGetPosts } from "@/hooks/useGetPosts";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import type { Post } from "@/types/post";
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

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
	return new Date(year, month, 1).getDay();
}

function getPostDate(post: Post): string | undefined {
	return post.scheduledAt ?? post.publishedAt ?? post.createdAt;
}

function CalendarPage() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();

	const { posts, loading } = useGetPosts();

	const navigateMonth = useCallback((delta: number) => {
		setCurrentDate(
			(prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
		);
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
							return (
								<div
									key={dateKey}
									className={`${calendarStyles.dayCell} ${day ? "" : calendarStyles.emptyCell} ${isToday ? calendarStyles.today : ""}`}
								>
									{day && (
										<>
											<span className={calendarStyles.dayNumber}>{day}</span>
											<div className={calendarStyles.postDots}>
												{dayPosts.slice(0, 3).map((post) => (
													<span
														key={post.id}
														className={`${calendarStyles.dot} ${calendarStyles[`dot-${post.status}`]}`}
														title={post.title ?? post.content.slice(0, 40)}
													/>
												))}
												{dayPosts.length > 3 && (
													<span className={calendarStyles.moreCount}>
														+{dayPosts.length - 3}
													</span>
												)}
											</div>
										</>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</motion.div>
	);
}
