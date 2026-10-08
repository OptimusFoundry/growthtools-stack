import { Link, useLocation } from "@tanstack/react-router";
import {
	BarChart,
	Calendar,
	CreditCard,
	Film,
	GitCommit,
	HelpCircle,
	Image,
	MessageSquare,
	Newspaper,
	PenSquare,
	Settings,
} from "lucide-react";
import React, { memo } from "react";
import { ImpersonationBanner } from "@/components/ImpersonationBanner/ImpersonationBanner";
import UserName from "@/components/user/Username";
import { usePersona } from "@/contexts/persona";
import {
	Sidebar,
	SidebarDivider,
	SidebarHeader,
	SidebarItem,
	SidebarLogo,
	SidebarSection,
	SidebarToggle,
} from "@/proto-design-system/components/navigation/Sidebar/Sidebar";
import styles from "./layout.module.scss";
import { ThemeSwitcher } from "./ThemeSwitcher";

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
	"git-commit-line": <GitCommit size={18} />,
};

const getIcon = (iconClass?: string) => {
	if (!iconClass) return null;
	return iconMap[iconClass] || null;
};

const AppSidebar = memo(function AppSidebar() {
	const { getNavigationGroups } = usePersona();
	const navigationGroups = getNavigationGroups();
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
			</SidebarSection>

			<ThemeSwitcher />

			<div className={styles.userFooter}>
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
				{/* ImpersonationBanner renders only when is_impersonated=true; no-op otherwise */}
				<ImpersonationBanner />
				<main className={styles.main}>{children}</main>
			</div>
		</div>
	);
});
