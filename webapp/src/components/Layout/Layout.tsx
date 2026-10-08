import { Sidebar, Text, useTheme } from "@optimusfoundry/quiet";
import { useLocation } from "@tanstack/react-router";
import {
	BarChart,
	Calendar,
	CreditCard,
	Film,
	GitCommit,
	HelpCircle,
	Image,
	type LucideIcon,
	MessageSquare,
	Moon,
	Newspaper,
	PenSquare,
	Settings,
	Sun,
	Zap,
} from "lucide-react";
import { memo, type ReactNode, useState } from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { ImpersonationBanner } from "@/components/ImpersonationBanner/ImpersonationBanner";
import UserName from "@/components/user/Username";
import { usePersona } from "@/contexts/persona";
import styles from "./layout.module.scss";
import { TopbarSlotContext } from "./TopbarSlot";

interface LayoutProps {
	children: ReactNode;
}

const iconMap: Record<string, LucideIcon> = {
	"bar-chart-line": BarChart,
	"calendar-line": Calendar,
	"edit-line": PenSquare,
	"chat-line": MessageSquare,
	"image-line": Image,
	"article-line": Newspaper,
	"film-line": Film,
	"settings-line": Settings,
	"bank-card-line": CreditCard,
	"git-commit-line": GitCommit,
};

const getIcon = (iconClass?: string): LucideIcon | undefined => {
	if (!iconClass) return undefined;
	return iconMap[iconClass];
};

const renderIcon = (icon: LucideIcon | undefined): ReactNode =>
	icon ? <AppIcon icon={icon} size="lg" /> : undefined;

const AppSidebar = memo(function AppSidebar() {
	const { getNavigationGroups } = usePersona();
	const navigationGroups = getNavigationGroups();
	const { theme, setTheme } = useTheme();
	const isDark = theme === "foundry-dark";
	const location = useLocation();

	const groups = [
		...navigationGroups.map((group) => ({
			label: group.label,
			items: group.items.map((item) => ({
				label: item.label,
				value: item.href,
				href: item.href,
				icon: renderIcon(getIcon(item.iconClass)),
			})),
		})),
		{
			label: "Settings",
			items: [
				{
					label: "Settings",
					value: "/account",
					href: "/account",
					icon: renderIcon(Settings),
				},
				{
					label: "Help",
					value: "/help",
					href: "/help",
					icon: renderIcon(HelpCircle),
				},
				{
					label: isDark ? "Light Mode" : "Dark Mode",
					icon: renderIcon(isDark ? Sun : Moon),
					onClick: () => setTheme(isDark ? "foundry" : "foundry-dark"),
				},
			],
		},
	];

	return (
		<Sidebar
			label="Main"
			mobile="drawer"
			collapsible
			value={location.pathname}
			header={
				<span className={styles.brand}>
					<span className={styles.brandMark}>
						<AppIcon icon={Zap} size="md" />
					</span>
					<Text as="span" weight="semibold" color="heading">
						Growth Tools
					</Text>
				</span>
			}
			footer={<UserName />}
			groups={groups}
		/>
	);
});

export const Layout = memo(function Layout({ children }: LayoutProps) {
	const [topbarSlot, setTopbarSlot] = useState<HTMLElement | null>(null);

	return (
		<TopbarSlotContext value={topbarSlot}>
			<div className={styles.container}>
				<AppSidebar />
				<div className={styles.content}>
					<ImpersonationBanner />
					<div className={styles.topbarSlot} ref={setTopbarSlot} />
					<main className={styles.main}>{children}</main>
				</div>
			</div>
		</TopbarSlotContext>
	);
});
