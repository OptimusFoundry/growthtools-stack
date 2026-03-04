import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BarChart,
	Calendar,
	Image,
	MessageSquare,
	Newspaper,
	PenSquare,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "@/contexts/auth";
import cardStyles from "./dashboard.module.scss";
import styles from "./page.module.scss";

const quickLinks = [
	{ label: "Calendar", href: "/calendar", icon: <Calendar size={18} /> },
	{ label: "Posts", href: "/posts", icon: <PenSquare size={18} /> },
	{ label: "AI Chat", href: "/chat", icon: <MessageSquare size={18} /> },
	{ label: "Media", href: "/media", icon: <Image size={18} /> },
	{ label: "Blog", href: "/blog", icon: <Newspaper size={18} /> },
	{ label: "Analytics", href: "/analytics", icon: <BarChart size={18} /> },
];

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	const { user } = useAuth();

	return (
		<motion.div
			className={styles.page}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<div className={styles.pageHeader}>
				<h1 className={styles.pageTitle}>
					Welcome back, {user?.firstName || "User"}!
				</h1>
				<p className={styles.pageDescription}>
					Your AI-powered social media command center.
				</p>
			</div>

			<div className={cardStyles.dashboard}>
				<div className={cardStyles.quickAccess}>
					<h2 className={cardStyles.sectionTitle}>Quick Access</h2>
					<div className={cardStyles.cardGrid}>
						{quickLinks.map((link) => (
							<Link
								key={link.href}
								to={link.href}
								className={cardStyles.card}
							>
								{link.icon}
								<span className={cardStyles.cardLabel}>{link.label}</span>
							</Link>
						))}
					</div>
				</div>
			</div>
		</motion.div>
	);
}
