import { Stack } from "@optimusfoundry/quiet";
import type { ReactNode } from "react";
import { Topbar } from "@/components/Layout/Topbar";
import { AsyncList } from "@/components/patterns/AsyncList/AsyncList";

export interface ResourceListPageProps<T> {
	/** Topbar title — e.g. "Posts", "Blog". */
	title: string;
	/** Action element shown on the right of the topbar (usually a New button). */
	topbarAction?: ReactNode;
	/** Optional editorial <header> slot rendered above the filters. */
	hero?: ReactNode;
	/** FilterTabs slot (or any other filter UI). */
	filters?: ReactNode;
	loading: boolean;
	items: readonly T[];
	/** Defaults to false — pages without filters can omit. */
	hasActiveFilter?: boolean;
	/** Empty-state slot when no items and no filter. */
	empty: ReactNode;
	/** Empty-state slot when no items but a filter is active. Defaults to `empty`. */
	emptyFiltered?: ReactNode;
	/** Override the list container class (e.g. for grid layouts). */
	listClassName?: string;
	/** Wraps the rendered items (e.g. in a quiet Grid) instead of the default list container. */
	renderContainer?: (children: ReactNode) => ReactNode;
	renderItem: (item: T, index: number) => ReactNode;
	/** Confirmation modal or any overlays belonging to this page. */
	overlays?: ReactNode;
}

/**
 * Slot-based shell for CRUD list pages. Owns topbar, hero, filters, the
 * loading/empty/list state machine (via AsyncList), and the Stack rhythm.
 * Route files declare *what* the page is; this component owns *how* it
 * renders.
 */
export function ResourceListPage<T>({
	title,
	topbarAction,
	hero,
	filters,
	loading,
	items,
	hasActiveFilter,
	empty,
	emptyFiltered,
	listClassName,
	renderContainer,
	renderItem,
	overlays,
}: ResourceListPageProps<T>) {
	return (
		<>
			<Topbar title={title} actions={topbarAction} />
			<Stack gap="lg" animated>
				{hero}
				{filters}
				<div>
					<AsyncList
						loading={loading}
						items={items}
						hasActiveFilter={hasActiveFilter}
						empty={empty}
						emptyFiltered={emptyFiltered}
						listClassName={listClassName}
						renderContainer={renderContainer}
						renderItem={renderItem}
					/>
				</div>
				{overlays}
			</Stack>
		</>
	);
}
