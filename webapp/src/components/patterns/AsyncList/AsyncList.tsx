import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import styles from "./AsyncList.module.scss";

export interface AsyncListProps<T> {
	loading: boolean;
	items: readonly T[];
	hasActiveFilter: boolean;
	/** Rendered when loading === true. Defaults to a <Spinner/>. */
	loadingState?: ReactNode;
	/** Rendered when items is empty AND no filter is active. */
	empty: ReactNode;
	/** Rendered when items is empty AND a filter is active. */
	emptyFiltered: ReactNode;
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
	hasActiveFilter,
	loadingState,
	empty,
	emptyFiltered,
	renderItem,
}: AsyncListProps<T>) {
	if (loading) {
		return (
			<div className={styles.loadingState}>{loadingState ?? <Spinner />}</div>
		);
	}
	if (items.length === 0) {
		return <>{hasActiveFilter ? emptyFiltered : empty}</>;
	}
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className={styles.list}
		>
			{items.map((item, i) => renderItem(item, i))}
		</motion.div>
	);
}
