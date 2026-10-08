import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner/Spinner";
import styles from "./AsyncList.module.scss";

export interface AsyncListProps<T> {
	loading: boolean;
	items: readonly T[];
	/**
	 * Whether a filter is currently active. Controls whether the empty state
	 * shows the "nothing here yet" or the "no matches" variant. Defaults to
	 * false — pages without filters can omit this prop.
	 */
	hasActiveFilter?: boolean;
	/** Rendered when loading === true. Defaults to a <Spinner/>. */
	loadingState?: ReactNode;
	/** Rendered when items is empty AND no filter is active. */
	empty: ReactNode;
	/**
	 * Rendered when items is empty AND a filter is active. Defaults to
	 * `empty` — pages without filters can omit this prop.
	 */
	emptyFiltered?: ReactNode;
	/**
	 * Override the container class applied to the item container. Defaults
	 * to a vertical list container; pass your own class for grid layouts.
	 */
	listClassName?: string;
	renderItem: (item: T, index: number) => ReactNode;
}

/**
 * Declarative replacement for the 4-branch loading/empty/empty-filtered/list
 * ternary that list pages re-implement. Owns the motion transition + spinner
 * wrapper. Consumers supply the per-branch UI as props.
 */
export function AsyncList<T>({
	loading,
	items,
	hasActiveFilter = false,
	loadingState,
	empty,
	emptyFiltered,
	listClassName,
	renderItem,
}: AsyncListProps<T>) {
	if (loading) {
		return (
			<div className={styles.loadingState}>{loadingState ?? <Spinner />}</div>
		);
	}
	if (items.length === 0) {
		return <>{hasActiveFilter ? (emptyFiltered ?? empty) : empty}</>;
	}
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className={listClassName ?? styles.list}
		>
			{items.map((item, i) => renderItem(item, i))}
		</motion.div>
	);
}
