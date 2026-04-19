import type { ReactNode } from "react";
import {
	Breadcrumb,
	type BreadcrumbItem,
} from "@/proto-design-system/components/navigation/Breadcrumb";
import styles from "./topbar.module.scss";

interface TopbarProps {
	/** Title shown when no breadcrumbs are provided. With breadcrumbs, the
	 *  current crumb becomes the visual title. */
	title?: string;
	breadcrumbs?: BreadcrumbItem[];
	actions?: ReactNode;
	children?: ReactNode;
}

export function Topbar({ title, breadcrumbs, actions, children }: TopbarProps) {
	const hasBreadcrumbs = !!breadcrumbs && breadcrumbs.length > 0;

	return (
		<header className={styles.topbar}>
			<div className={styles.titleBlock}>
				{hasBreadcrumbs ? (
					<Breadcrumb items={breadcrumbs} size="md" />
				) : (
					title && <h1 className={styles.title}>{title}</h1>
				)}
			</div>
			{children}
			{actions && <div className={styles.actions}>{actions}</div>}
		</header>
	);
}
