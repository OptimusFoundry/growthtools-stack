import type { ReactNode } from "react";
import {
	Breadcrumb,
	type BreadcrumbItem,
} from "@/proto-design-system/components/navigation/Breadcrumb";
import styles from "./topbar.module.scss";

interface TopbarProps {
	title: string;
	breadcrumbs?: BreadcrumbItem[];
	eyebrow?: ReactNode;
	actions?: ReactNode;
	children?: ReactNode;
}

export function Topbar({
	title,
	breadcrumbs,
	eyebrow,
	actions,
	children,
}: TopbarProps) {
	return (
		<header className={styles.topbar}>
			<div className={styles.titleBlock}>
				{breadcrumbs && breadcrumbs.length > 0 && (
					<Breadcrumb items={breadcrumbs} size="sm" />
				)}
				{eyebrow && !breadcrumbs && (
					<div className={styles.eyebrow}>{eyebrow}</div>
				)}
				<h1 className={styles.title}>{title}</h1>
			</div>
			{children}
			{actions && <div className={styles.actions}>{actions}</div>}
		</header>
	);
}
