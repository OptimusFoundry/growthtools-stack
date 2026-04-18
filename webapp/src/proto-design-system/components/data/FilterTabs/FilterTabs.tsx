import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./FilterTabs.module.scss";

export interface FilterTabItem {
	/** Stable id used as the value */
	id: string;
	/** Visible label */
	label: string;
	/** Optional count rendered as a small mono badge */
	count?: number;
	/** Optional leading icon */
	icon?: ReactNode;
}

export type FilterTabsSize = "sm" | "md";

export interface FilterTabsProps {
	items: FilterTabItem[];
	value: string;
	onChange: (id: string) => void;
	size?: FilterTabsSize;
	"aria-label"?: string;
	className?: string;
}

/**
 * FilterTabs — a row of pill buttons used for filtering a collection.
 * The active filter renders in the primary variant; idle filters render
 * as outlined ghosts. Counts are displayed as a small mono badge.
 *
 * @example
 * ```tsx
 * <FilterTabs
 *   value={filter}
 *   onChange={setFilter}
 *   items={[
 *     { id: "all", label: "All", count: 7 },
 *     { id: "draft", label: "Drafts", count: 2 },
 *   ]}
 * />
 * ```
 */
export function FilterTabs({
	items,
	value,
	onChange,
	size = "sm",
	"aria-label": ariaLabel,
	className,
}: FilterTabsProps) {
	return (
		<div
			role="tablist"
			aria-label={ariaLabel}
			className={cn(styles.tabs, styles[`size-${size}`], className)}
		>
			{items.map((item) => {
				const active = item.id === value;
				return (
					<button
						key={item.id}
						type="button"
						role="tab"
						aria-selected={active}
						className={cn(styles.tab, active && styles.active)}
						onClick={() => onChange(item.id)}
					>
						{item.icon && <span className={styles.icon}>{item.icon}</span>}
						<span className={styles.label}>{item.label}</span>
						{item.count !== undefined && (
							<span className={styles.count}>
								{String(item.count).padStart(2, "0")}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
