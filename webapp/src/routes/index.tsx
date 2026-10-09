import {
	Button,
	Grid,
	PageHero,
	SectionHeader,
	Stack,
} from "@optimusfoundry/quiet";
import { createFileRoute } from "@tanstack/react-router";
import {
	BarChart,
	Calendar,
	Image,
	type LucideIcon,
	Newspaper,
	PenSquare,
} from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { Topbar } from "@/components/Layout/Topbar";
import { useAuth } from "@/contexts/auth";
import { LastSevenDaysSection } from "@/features/analytics/components/LastSevenDaysSection/component";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import styles from "./dashboard.module.scss";

const quickLinks: { label: string; href: string; icon: LucideIcon }[] = [
	{ label: "Calendar", href: "/calendar", icon: Calendar },
	{ label: "Posts", href: "/posts", icon: PenSquare },
	{ label: "Media", href: "/media", icon: Image },
	{ label: "Blog", href: "/blog", icon: Newspaper },
	{ label: "Analytics", href: "/analytics", icon: BarChart },
];

export const Route = createFileRoute("/")({
	component: Index,
});

function Index() {
	useDocumentTitle();
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
			<Stack gap="lg" animated>
				<PageHero
					size="md"
					as="h2"
					ruled={false}
					className={styles.hero}
					eyebrow={eyebrowDate}
					title={`${greeting}, ${firstName} — your`}
					accent="command center"
					description="Drafts to finish, posts to schedule, and a calendar that knows what's next. Pick where you want to spend your morning."
				/>

				<LastSevenDaysSection />

				<section aria-label="Quick access">
					<Stack gap="sm">
						<SectionHeader size="sm" as="h2" title="Quick Access" />
						<Grid minChildWidth={200} gap="sm" rowGap="sm">
							{quickLinks.map((link) => (
								<Button
									key={link.href}
									variant="outline"
									size="sm"
									fullWidth
									href={link.href}
									aria-label={`Open ${link.label}, quick access`}
									leftIcon={<AppIcon icon={link.icon} size="md" />}
								>
									{link.label}
								</Button>
							))}
						</Grid>
					</Stack>
				</section>
			</Stack>
		</>
	);
}
