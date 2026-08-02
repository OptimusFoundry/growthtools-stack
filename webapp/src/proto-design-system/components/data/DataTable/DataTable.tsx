/**
 * DataTable — div-based grid table for R-3.1 hairline row lists.
 *
 * Uses CSS custom property `--dt-cols` for column widths, keeping all
 * breakpoint logic in one place while avoiding a class-per-column approach.
 *
 * Design alignment:
 *   J-4.1   identical-shape rows → hairline divider pattern
 *   J-5.1   breathable row padding (comfortable) / J-5.2 compact density
 *   R-3.1   hairline rows, hover bg tint, last row suppresses border
 *   R-6.1   first-time empty state via emptyState prop
 */

import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./DataTable.module.scss";

// ============================================================================
// Types
// ============================================================================

export type DataTableDensity = "comfortable" | "compact";

export interface DataTableColumn<T> {
	/** Column identifier */
	id: string;
	/** Column header label (pass empty string for action columns) */
	header: string;
	/** Cell renderer */
	cell: (row: T, index: number) => ReactNode;
	/** CSS width value for grid-template-columns (e.g. "minmax(0, 2fr)", "100px", "auto") */
	width?: string;
	/** Text alignment for header + data cell */
	align?: "left" | "right";
}

export interface DataTableProps<T> {
	/** Column definitions */
	columns: DataTableColumn<T>[];
	/** Row data */
	data: T[];
	/** Unique key extractor */
	getRowKey: (row: T, index: number) => string;
	/** Whether to show a skeleton loading state */
	loading?: boolean;
	/** Number of skeleton rows to render while loading */
	loadingRowCount?: number;
	/** Content to render when data is empty and not loading */
	emptyState?: ReactNode;
	/** Row density */
	density?: DataTableDensity;
	/** Optional click handler — rows become focusable buttons */
	onRowClick?: (row: T) => void;
	/** Additional class for the outer wrapper */
	className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Build the CSS custom property value for grid-template-columns. */
function buildDtCols<T>(columns: DataTableColumn<T>[]): string {
	return columns.map((col) => col.width ?? "minmax(0, 1fr)").join(" ");
}

// ============================================================================
// Component
// ============================================================================

export function DataTable<T>({
	columns,
	data,
	getRowKey,
	loading = false,
	loadingRowCount = 3,
	emptyState,
	density = "comfortable",
	onRowClick,
	className,
}: DataTableProps<T>) {
	const dtCols = buildDtCols(columns);
	const cssVars = { "--dt-cols": dtCols } as CSSProperties;
	const densityClass =
		density === "compact" ? styles.compact : styles.comfortable;

	// ── Loading state ────────────────────────────────────────────────────────
	if (loading) {
		return (
			<div
				className={cn(styles.table, densityClass, className)}
				style={cssVars}
				role="table"
				aria-busy="true"
				aria-label="Loading"
			>
				{/* Header */}
				<div className={styles.headerRow} role="row">
					{columns.map((col) => (
						<div
							key={col.id}
							className={cn(
								styles.headerCell,
								col.align === "right" && styles.alignRight,
							)}
							role="columnheader"
						>
							{col.header}
						</div>
					))}
				</div>
				{/* Skeleton rows */}
				{Array.from({ length: loadingRowCount }).map((_, i) => (
					<div
						key={i}
						className={styles.skeletonRow}
						role="row"
						aria-hidden="true"
					>
						{columns.map((col) => (
							<div key={col.id} className={styles.skeletonCell} role="cell">
								<div className={styles.skeletonBar} />
							</div>
						))}
					</div>
				))}
			</div>
		);
	}

	// ── Empty state ──────────────────────────────────────────────────────────
	if (data.length === 0) {
		return (
			<div
				className={cn(styles.table, densityClass, className)}
				style={cssVars}
			>
				<div className={styles.emptyContainer}>
					{emptyState ?? (
						<span
							style={{
								fontSize: "var(--font-size-sm)",
								color: "var(--color-base-content-secondary)",
							}}
						>
							No data
						</span>
					)}
				</div>
			</div>
		);
	}

	// ── Normal state ─────────────────────────────────────────────────────────
	return (
		<div
			className={cn(styles.table, densityClass, className)}
			style={cssVars}
			role="table"
		>
			{/* Header row */}
			<div className={styles.headerRow} role="row">
				{columns.map((col) => (
					<div
						key={col.id}
						className={cn(
							styles.headerCell,
							col.align === "right" && styles.alignRight,
						)}
						role="columnheader"
					>
						{col.header}
					</div>
				))}
			</div>

			{/* Data rows */}
			{data.map((row, index) => {
				const key = getRowKey(row, index);

				if (onRowClick) {
					return (
						<button
							key={key}
							type="button"
							className={cn(styles.dataRow, styles.dataRowClickable)}
							role="row"
							onClick={() => onRowClick(row)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onRowClick(row);
								}
							}}
						>
							{columns.map((col) => (
								<div
									key={col.id}
									className={cn(
										styles.dataCell,
										col.align === "right" && styles.alignRight,
									)}
									role="cell"
								>
									{col.cell(row, index)}
								</div>
							))}
						</button>
					);
				}

				return (
					<div key={key} className={styles.dataRow} role="row">
						{columns.map((col) => (
							<div
								key={col.id}
								className={cn(
									styles.dataCell,
									col.align === "right" && styles.alignRight,
								)}
								role="cell"
							>
								{col.cell(row, index)}
							</div>
						))}
					</div>
				);
			})}
		</div>
	);
}

DataTable.displayName = "DataTable";
