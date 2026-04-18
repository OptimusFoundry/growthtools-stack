import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BarChart,
	Calendar,
	Image,
	MessageSquare,
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
	const today = new Date().toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	return (
		<>
			<Topbar
				title={`Welcome back, ${user?.firstName || "there"}`}
				eyebrow={today}
			/>
			<Stack gap="lg" className={styles.page} animate>
				<Stack gap="xs">
					<Text color="muted">
						Your AI-powered social media command center.
					</Text>
				</Stack>

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
