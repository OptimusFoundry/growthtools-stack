import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BarChart,
	Calendar,
	Image,
	Newspaper,
	PenSquare,
} from "lucide-react";
import { Topbar } from "@/components/Layout/Topbar";
import { useAuth } from "@/contexts/auth";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import cardStyles from "./dashboard.module.scss";
import styles from "./page.module.scss";

const quickLinks = [
	{ label: "Calendar", href: "/calendar", icon: <Calendar size={18} /> },
	{ label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
	{ label: "Media", href: "/media", icon: <Image size={18} /> },
	{ label: "Blog", href: "/blog", icon: <Newspaper size={18} /> },
	{ label: "Analytics", href: "/analytics", icon: <BarChart size={18} /> },
];

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const { user } = useAuth();
	const now = new Date();
	const eyebrowDate = now.toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	});
	const hour = now.getHours();
	const greeting =
		hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
	const firstName = user?.firstName || "there";

	return (
		<>
			<Topbar title="Dashboard" />
			<Stack gap="lg" className={styles.page} animate>
				<header className={styles.pageHero}>
					<div className={styles.pageHeroText}>
						<div className={styles.pageEyebrow}>{eyebrowDate}</div>
						<h1 className={styles.pageHeroTitle}>
							{greeting}, {firstName} — your <em>command center</em>.
						</h1>
						<p className={styles.pageHeroSub}>
							Drafts to finish, posts to schedule, and a calendar that knows
							what's next. Pick where you want to spend your morning.
						</p>
					</div>
				</header>

				<Stack gap="xs">
					<Text as="h3" size="lg" weight="semibold">
						Quick Access
					</Text>
					<div className={cardStyles.cardGrid}>
						{quickLinks.map((link) => (
							<Link key={link.href} to={link.href} className={cardStyles.card}>
								{link.icon}
								<span className={cardStyles.cardLabel}>{link.label}</span>
							</Link>
						))}
					</div>
				</Stack>
			</Stack>
		</>
	);
}
