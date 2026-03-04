import { ChevronRight, Home } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Breadcrumb.module.scss";

export type BreadcrumbSize = "sm" | "md" | "lg";

export interface BreadcrumbItem {
	/** Item label */
	label: ReactNode;
	/** Item href */
	href?: string;
	/** Item icon */
	icon?: ReactNode;
}

export interface BreadcrumbProps {
	/** Breadcrumb items */
	items: BreadcrumbItem[];
	/** Separator element */
	separator?: ReactNode;
	/** Show home icon */
	showHomeIcon?: boolean;
	/** Size */
	size?: BreadcrumbSize;
	/** Max items to show (rest collapsed) */
	maxItems?: number;
	/** Additional className */
	className?: string;
}

/**
 * Breadcrumb component for navigation hierarchy.
 *
 * @example
 * ```tsx
 * <Breadcrumb
 *   items={[
 *     { label: "Home", href: "/" },
 *     { label: "Products", href: "/products" },
 *     { label: "Category" },
 *   ]}
 * />
 * ```
 */
export function Breadcrumb({
	items,
	separator = <ChevronRight />,
	showHomeIcon = true,
	size = "md",
	maxItems,
	className,
}: BreadcrumbProps) {
	let displayItems = items;
	let showEllipsis = false;

	if (maxItems && items.length > maxItems && items[0]) {
		const firstItem = items[0];
		const lastItems = items.slice(-(maxItems - 1));
		displayItems = [firstItem, ...lastItems];
		showEllipsis = true;
	}

	return (
		<nav
			aria-label="Breadcrumb"
			className={cn(styles.breadcrumb, styles[`size-${size}`], className)}
		>
			<ol className={styles.list}>
				{displayItems.map((item, index) => {
					const isFirst = index === 0;
					const isLast = index === displayItems.length - 1;
					const showIcon = isFirst && showHomeIcon && !item.icon;
					const key = `${String(item.label)}-${index}`;

					return (
						<li key={key} className={styles.item}>
							{!isFirst && (
								<>
									{showEllipsis && index === 1 && (
										<>
											<span className={styles.separator} aria-hidden="true">
												{separator}
											</span>
											<span className={styles.ellipsis}>...</span>
										</>
									)}
									<span className={styles.separator} aria-hidden="true">
										{separator}
									</span>
								</>
							)}
							{isLast ? (
								<span
									className={cn(styles.link, styles.current)}
									aria-current="page"
								>
									{item.icon && (
										<span className={styles.icon}>{item.icon}</span>
									)}
									{showIcon && <Home className={styles.homeIcon} />}
									<span>{item.label}</span>
								</span>
							) : item.href ? (
								<a href={item.href} className={styles.link}>
									{item.icon && (
										<span className={styles.icon}>{item.icon}</span>
									)}
									{showIcon && <Home className={styles.homeIcon} />}
									<span>{item.label}</span>
								</a>
							) : (
								<span className={styles.link}>
									{item.icon && (
										<span className={styles.icon}>{item.icon}</span>
									)}
									{showIcon && <Home className={styles.homeIcon} />}
									<span>{item.label}</span>
								</span>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

Breadcrumb.displayName = "Breadcrumb";
