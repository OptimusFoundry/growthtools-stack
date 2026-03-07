import { Link, useLocation } from "@tanstack/react-router";
import {
	BarChart,
	Calendar,
	CreditCard,
	Film,
	HelpCircle,
	Image,
	MessageSquare,
	Moon,
	Newspaper,
	PenSquare,
	Settings,
	Sun,
} from "lucide-react";
import React, { memo } from "react";
import UserName from "@/components/user/Username";
import { usePersona } from "@/contexts/persona";
import {
	Sidebar,
	SidebarDivider,
	SidebarHeader,
	SidebarItem,
	SidebarLogo,
	SidebarMobileTrigger,
	SidebarSection,
	SidebarToggle,
} from "@/proto-design-system/components/navigation/Sidebar";
import { useTheme } from "@/proto-design-system/hooks/useTheme";
import styles from "./layout.module.scss";

interface LayoutProps {
	children: React.ReactNode;
}

// Map icon names to Lucide icons
const iconMap: Record<string, React.ReactNode> = {
	"bar-chart-line": <BarChart size={18} />,
	"calendar-line": <Calendar size={18} />,
	"edit-line": <PenSquare size={18} />,
	"chat-line": <MessageSquare size={18} />,
	"image-line": <Image size={18} />,
	"article-line": <Newspaper size={18} />,
	"film-line": <Film size={18} />,
	"settings-line": <Settings size={18} />,
	"bank-card-line": <CreditCard size={18} />,
};

const getIcon = (iconClass?: string) => {
	if (!iconClass) return null;
	return iconMap[iconClass] || null;
};

const AppSidebar = memo(function AppSidebar() {
	const { getNavigationGroups } = usePersona();
	const navigationGroups = getNavigationGroups();
	const { theme, setTheme } = useTheme();
	const isDark = theme === "midnight";
	const location = useLocation();

	return (
		<Sidebar>
			<SidebarHeader>
				<SidebarLogo>Growth Tools</SidebarLogo>
				<SidebarToggle />
			</SidebarHeader>

			{navigationGroups.map((group) => (
				<SidebarSection key={group.label} title={group.label}>
					{group.items.map((item) => (
						<SidebarItem
							key={item.href}
							icon={getIcon(item.iconClass)}
							href={item.href}
							active={location.pathname === item.href}
							LinkComponent={Link}
						>
							{item.label}
						</SidebarItem>
					))}
				</SidebarSection>
			))}

			<SidebarDivider />

			<SidebarSection title="Settings">
				<SidebarItem
					icon={<Settings size={18} />}
					href="/account"
					active={location.pathname === "/account"}
					LinkComponent={Link}
				>
					Settings
				</SidebarItem>
				<SidebarItem
					icon={<HelpCircle size={18} />}
					href="/help"
					active={location.pathname === "/help"}
					LinkComponent={Link}
				>
					Help
				</SidebarItem>
				<SidebarItem
					icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
					onClick={() => setTheme(isDark ? "neon-orange" : "midnight")}
				>
					{isDark ? "Light Mode" : "Dark Mode"}
				</SidebarItem>
			</SidebarSection>

			<div style={{ marginTop: "auto", padding: "1rem" }}>
				<UserName />
			</div>
		</Sidebar>
	);
});

export const Layout = memo(function Layout({ children }: LayoutProps) {
	return (
		<div className={styles.container}>
			<AppSidebar />
			<div className={styles.content}>
				<header className={styles.header}>
					<SidebarMobileTrigger />
				</header>
				<main className={styles.main}>{children}</main>
			</div>
		</div>
	);
});
