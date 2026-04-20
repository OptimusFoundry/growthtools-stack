import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import {
	Breadcrumb,
	type BreadcrumbItem,
} from "@/proto-design-system/components/navigation/Breadcrumb";
import { SidebarMobileTrigger } from "@/proto-design-system/components/navigation/Sidebar";
import styles from "./topbar.module.scss";

interface TopbarProps {
	/** Title shown when no breadcrumbs are provided. */
	title?: string;
	breadcrumbs?: BreadcrumbItem[];
	actions?: ReactNode;
	children?: ReactNode;
	/**
	 * Content rendered as the first flex child, before the title block.
	 * Defaults to <SidebarMobileTrigger /> — shown only on mobile via its
	 * own internal guard. Pass null to suppress the default.
	 */
	leading?: ReactNode;
}

export function Topbar({
	title,
	breadcrumbs,
	actions,
	children,
	leading,
}: TopbarProps) {
	const hasBreadcrumbs = !!breadcrumbs && breadcrumbs.length > 0;
	// The first breadcrumb item that has an href is the parent to navigate back to.
	const parentCrumb = hasBreadcrumbs
		? breadcrumbs.find((item) => item.href != null)
		: undefined;

	// Default leading: the hamburger trigger. Callers can pass `leading={null}` to suppress.
	const leadingNode =
		leading === undefined ? <SidebarMobileTrigger /> : leading;

	return (
		<header className={styles.topbar}>
			{leadingNode != null && (
				<div className={styles.leading}>{leadingNode}</div>
			)}
			<div className={styles.titleBlock}>
				{hasBreadcrumbs ? (
					<>
						{/* Desktop: full breadcrumb trail */}
						<span className={styles.breadcrumbDesktop}>
							<Breadcrumb items={breadcrumbs} size="md" />
						</span>
						{/* Mobile: compact back link (only when a parent href exists) */}
						{parentCrumb?.href != null && (
							<a
								href={parentCrumb.href}
								className={styles.backLink}
								aria-label={`Back to ${String(parentCrumb.label)}`}
							>
								<ChevronLeft size={16} aria-hidden="true" />
								<span>{parentCrumb.label}</span>
							</a>
						)}
					</>
				) : (
					title && <h1 className={styles.title}>{title}</h1>
				)}
			</div>
			{children}
			{actions && <div className={styles.actions}>{actions}</div>}
		</header>
	);
}
