import {
	Breadcrumb,
	type BreadcrumbProps,
	Link,
	SidebarTrigger,
	useSidebar,
} from "@optimusfoundry/quiet";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { TopbarActionsTargetSlot } from "./TopbarActionsPortal";
import { useTopbarSlot } from "./TopbarSlot";
import styles from "./topbar.module.scss";

type BreadcrumbItem = BreadcrumbProps["items"][number];

interface TopbarProps {
	/** Title shown when no breadcrumbs are provided. */
	title?: string;
	breadcrumbs?: BreadcrumbItem[];
	actions?: ReactNode;
	children?: ReactNode;
	/** Rendered before the title block; defaults to <SidebarTrigger />, pass null to suppress. */
	leading?: ReactNode;
	/** Hides the actions slot below the `lg` breakpoint. */
	hideActionsOnMobile?: boolean;
}

export function Topbar({
	title,
	breadcrumbs,
	actions,
	children,
	leading,
	hideActionsOnMobile = false,
}: TopbarProps) {
	const { isMobile } = useSidebar();
	const slot = useTopbarSlot();

	const hasBreadcrumbs = !!breadcrumbs && breadcrumbs.length > 0;
	const parentCrumb = hasBreadcrumbs
		? breadcrumbs.find((item) => item.href != null)
		: undefined;

	const leadingNode = leading === undefined ? <SidebarTrigger /> : leading;

	const actionsClassName = hideActionsOnMobile
		? `${styles.actions} ${styles.actionsHiddenOnMobile}`
		: styles.actions;

	// The breadcrumb swap follows the provider breakpoint (720), which has no
	// step in _breakpoints.scss, so it cannot be a CSS media query.
	const crumbs = isMobile ? (
		parentCrumb?.href != null && (
			<Link
				href={parentCrumb.href}
				variant="muted"
				underline="none"
				size="sm"
				className={styles.backLink}
				aria-label={`Back to ${String(parentCrumb.label)}`}
			>
				<AppIcon icon={ChevronLeft} size="md" />
				<span>{parentCrumb.label}</span>
			</Link>
		)
	) : (
		<Breadcrumb items={breadcrumbs ?? []} className={styles.breadcrumb} />
	);

	const header = (
		<header className={styles.topbar}>
			{leadingNode != null && (
				<div className={styles.leading}>{leadingNode}</div>
			)}
			<div className={styles.titleBlock}>
				{hasBreadcrumbs
					? crumbs
					: title && <h1 className={styles.title}>{title}</h1>}
			</div>
			{children}
			<TopbarActionsTargetSlot className={styles.portalSlot} />
			{actions && <div className={actionsClassName}>{actions}</div>}
		</header>
	);

	if (slot === undefined) return header;
	if (slot === null) return null;
	return createPortal(header, slot);
}
