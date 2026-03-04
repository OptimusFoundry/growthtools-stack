import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { type KeyboardEvent, useCallback, useMemo } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Pagination.module.scss";

export type PaginationSize = "sm" | "md" | "lg";
export type PaginationVariant = "default" | "outline" | "ghost";

export interface PaginationProps {
	/** Current page (1-indexed) */
	page: number;
	/** Total number of pages */
	totalPages: number;
	/** Page change callback */
	onPageChange: (page: number) => void;
	/** Number of sibling pages to show */
	siblings?: number;
	/** Show first/last page buttons */
	showFirstLast?: boolean;
	/** Size */
	size?: PaginationSize;
	/** Variant */
	variant?: PaginationVariant;
	/** Disabled state */
	disabled?: boolean;
	/** Additional className */
	className?: string;
}

function range(start: number, end: number): number[] {
	const length = end - start + 1;
	return Array.from({ length }, (_, i) => start + i);
}

/**
 * Pagination component for navigating through pages.
 *
 * @example
 * ```tsx
 * <Pagination
 *   page={currentPage}
 *   totalPages={10}
 *   onPageChange={setCurrentPage}
 * />
 * ```
 */
export function Pagination({
	page,
	totalPages,
	onPageChange,
	siblings = 1,
	showFirstLast = true,
	size = "md",
	variant = "default",
	disabled = false,
	className,
}: PaginationProps) {
	const paginationRange = useMemo(() => {
		const totalPageNumbers = siblings * 2 + 3; // siblings + current + first + last

		if (totalPageNumbers >= totalPages) {
			return range(1, totalPages);
		}

		const leftSiblingIndex = Math.max(page - siblings, 1);
		const rightSiblingIndex = Math.min(page + siblings, totalPages);

		const shouldShowLeftDots = leftSiblingIndex > 2;
		const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

		if (!shouldShowLeftDots && shouldShowRightDots) {
			const leftItemCount = 3 + 2 * siblings;
			const leftRange = range(1, leftItemCount);
			return [...leftRange, "dots", totalPages];
		}

		if (shouldShowLeftDots && !shouldShowRightDots) {
			const rightItemCount = 3 + 2 * siblings;
			const rightRange = range(totalPages - rightItemCount + 1, totalPages);
			return [1, "dots", ...rightRange];
		}

		if (shouldShowLeftDots && shouldShowRightDots) {
			const middleRange = range(leftSiblingIndex, rightSiblingIndex);
			return [1, "dots", ...middleRange, "dots", totalPages];
		}

		return range(1, totalPages);
	}, [page, totalPages, siblings]);

	const handlePageChange = useCallback(
		(newPage: number) => {
			if (newPage >= 1 && newPage <= totalPages && !disabled) {
				onPageChange(newPage);
			}
		},
		[onPageChange, totalPages, disabled],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLElement>) => {
			if (disabled) return;

			switch (e.key) {
				case "ArrowLeft":
					e.preventDefault();
					handlePageChange(page - 1);
					break;
				case "ArrowRight":
					e.preventDefault();
					handlePageChange(page + 1);
					break;
				case "Home":
					e.preventDefault();
					handlePageChange(1);
					break;
				case "End":
					e.preventDefault();
					handlePageChange(totalPages);
					break;
			}
		},
		[disabled, page, totalPages, handlePageChange],
	);

	if (totalPages <= 1) return null;

	return (
		<nav
			aria-label="Pagination"
			className={cn(styles.pagination, styles[`size-${size}`], className)}
			onKeyDown={handleKeyDown}
		>
			{showFirstLast && (
				<button
					type="button"
					className={cn(styles.button, styles[variant])}
					onClick={() => handlePageChange(1)}
					disabled={disabled || page === 1}
					aria-label="Go to first page"
				>
					<ChevronsLeft />
				</button>
			)}

			<button
				type="button"
				className={cn(styles.button, styles[variant])}
				onClick={() => handlePageChange(page - 1)}
				disabled={disabled || page === 1}
				aria-label="Go to previous page"
			>
				<ChevronLeft />
			</button>

			<div className={styles.pages}>
				{paginationRange.map((pageNumber, index) => {
					if (pageNumber === "dots") {
						// Use position relative to start/end to create stable keys
						const dotsKey =
							index < paginationRange.length / 2 ? "dots-start" : "dots-end";
						return (
							<span key={dotsKey} className={styles.dots}>
								...
							</span>
						);
					}

					return (
						<button
							key={`page-${pageNumber}`}
							type="button"
							className={cn(
								styles.button,
								styles[variant],
								pageNumber === page && styles.active,
							)}
							onClick={() => handlePageChange(pageNumber as number)}
							disabled={disabled}
							aria-label={`Go to page ${pageNumber}`}
							aria-current={pageNumber === page ? "page" : undefined}
						>
							{pageNumber}
						</button>
					);
				})}
			</div>

			<button
				type="button"
				className={cn(styles.button, styles[variant])}
				onClick={() => handlePageChange(page + 1)}
				disabled={disabled || page === totalPages}
				aria-label="Go to next page"
			>
				<ChevronRight />
			</button>

			{showFirstLast && (
				<button
					type="button"
					className={cn(styles.button, styles[variant])}
					onClick={() => handlePageChange(totalPages)}
					disabled={disabled || page === totalPages}
					aria-label="Go to last page"
				>
					<ChevronsRight />
				</button>
			)}
		</nav>
	);
}

Pagination.displayName = "Pagination";
