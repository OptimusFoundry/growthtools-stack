import type { FilterTabsProps } from "@optimusfoundry/quiet";
import { useMemo } from "react";
import { countBy } from "@/utils/format";

export interface FilterKey<K extends string> {
	id: K | "";
	label: string;
}

export interface FilterItemWithCount<K extends string> extends FilterKey<K> {
	count: number;
}

export function toFilterTabItems<K extends string>(
	items: FilterItemWithCount<K>[],
): FilterTabsProps["items"] {
	return items.map(({ id, label, count }) => ({ value: id, label, count }));
}

/**
 * Computes counts per filter-tab in one pass (instead of N .filter().length
 * calls + a ternary chain). The empty-string id ("") is treated as the "All"
 * bucket and returns items.length.
 */
export function useFilterCounts<T, K extends string>(
	items: readonly T[],
	filters: readonly FilterKey<K>[],
	keyFn: (item: T) => K,
): FilterItemWithCount<K>[] {
	return useMemo(() => {
		const counts = countBy(items, keyFn);
		return filters.map((f) => ({
			...f,
			count: f.id === "" ? items.length : (counts[f.id] ?? 0),
		}));
	}, [items, filters, keyFn]);
}
