import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { cn } from "../../../utils/cn";
import { Checkbox } from "../../forms/Checkbox";
import { Pagination } from "../../navigation/Pagination";
import { Spinner } from "../../primitives/Spinner";
import styles from "./DataGrid.module.scss";

export type SortDirection = "asc" | "desc" | null;

export interface DataGridColumn<T> {
	/** Column ID */
	id: string;
	/** Header label */
	header: ReactNode;
	/** Cell renderer */
	cell: (row: T) => ReactNode;
	/** Column width */
	width?: string | number;
	/** Sortable */
	sortable?: boolean;
	/** Sort function */
	sortFn?: (a: T, b: T) => number;
	/** Text alignment */
	align?: "left" | "center" | "right";
}

export interface DataGridProps<T> {
	/** Data rows */
	data: T[];
	/** Column definitions */
	columns: DataGridColumn<T>[];
	/** Row key accessor */
	getRowId: (row: T) => string | number;
	/** Enable pagination */
	pagination?: boolean;
	/** Page size */
	pageSize?: number;
	/** Enable row selection */
	selectable?: boolean;
	/** Selected row IDs */
	selectedIds?: Set<string | number>;
	/** Selection change handler */
	onSelectionChange?: (ids: Set<string | number>) => void;
	/** Row click handler */
	onRowClick?: (row: T) => void;
	/** Loading state */
	loading?: boolean;
	/** Loading message */
	loadingMessage?: string;
	/** Empty state content */
	emptyState?: ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * DataGrid component for displaying tabular data with advanced features.
 *
 * @example
 * ```tsx
 * <DataGrid
 *   data={users}
 *   columns={[
 *     { id: "name", header: "Name", cell: (row) => row.name, sortable: true },
 *     { id: "email", header: "Email", cell: (row) => row.email },
 *   ]}
 *   getRowId={(row) => row.id}
 *   pagination
 *   pageSize={10}
 * />
 * ```
 */
export function DataGrid<T>({
	data,
	columns,
	getRowId,
	pagination = false,
	pageSize = 10,
	selectable = false,
	selectedIds = new Set(),
	onSelectionChange,
	onRowClick,
	loading = false,
	loadingMessage = "Loading...",
	emptyState,
	className,
}: DataGridProps<T>) {
	const [sortColumn, setSortColumn] = useState<string | null>(null);
	const [sortDirection, setSortDirection] = useState<SortDirection>(null);
	const [currentPage, setCurrentPage] = useState(1);

	// Handle sorting
	const handleSort = useCallback(
		(columnId: string) => {
			if (sortColumn === columnId) {
				if (sortDirection === "asc") {
					setSortDirection("desc");
				} else if (sortDirection === "desc") {
					setSortColumn(null);
					setSortDirection(null);
				}
			} else {
				setSortColumn(columnId);
				setSortDirection("asc");
			}
			setCurrentPage(1);
		},
		[sortColumn, sortDirection],
	);

	// Sort data
	const sortedData = useMemo(() => {
		if (!sortColumn || !sortDirection) return data;

		const column = columns.find((c) => c.id === sortColumn);
		if (!column) return data;

		return [...data].sort((a, b) => {
			let comparison = 0;
			if (column.sortFn) {
				comparison = column.sortFn(a, b);
			} else {
				const aVal = String(column.cell(a));
				const bVal = String(column.cell(b));
				comparison = aVal.localeCompare(bVal);
			}
			return sortDirection === "asc" ? comparison : -comparison;
		});
	}, [data, columns, sortColumn, sortDirection]);

	// Paginate data
	const paginatedData = useMemo(() => {
		if (!pagination) return sortedData;
		const start = (currentPage - 1) * pageSize;
		return sortedData.slice(start, start + pageSize);
	}, [sortedData, pagination, currentPage, pageSize]);

	const totalPages = Math.ceil(data.length / pageSize);

	// Handle selection
	const handleSelectAll = useCallback(() => {
		if (!onSelectionChange) return;

		const allIds = new Set(paginatedData.map(getRowId));
		const allSelected = paginatedData.every((row) =>
			selectedIds.has(getRowId(row)),
		);

		if (allSelected) {
			const newSelection = new Set(selectedIds);
			for (const id of allIds) {
				newSelection.delete(id);
			}
			onSelectionChange(newSelection);
		} else {
			onSelectionChange(new Set([...selectedIds, ...allIds]));
		}
	}, [paginatedData, getRowId, selectedIds, onSelectionChange]);

	const handleSelectRow = useCallback(
		(row: T) => {
			if (!onSelectionChange) return;

			const id = getRowId(row);
			const newSelection = new Set(selectedIds);
			if (newSelection.has(id)) {
				newSelection.delete(id);
			} else {
				newSelection.add(id);
			}
			onSelectionChange(newSelection);
		},
		[getRowId, selectedIds, onSelectionChange],
	);

	const allSelected =
		paginatedData.length > 0 &&
		paginatedData.every((row) => selectedIds.has(getRowId(row)));
	const someSelected = paginatedData.some((row) =>
		selectedIds.has(getRowId(row)),
	);

	return (
		<div className={cn(styles.dataGrid, className)}>
			<div
				className={cn(
					styles.tableWrapper,
					loading && styles.tableWrapperLoading,
				)}
			>
				{/* Loading overlay */}
				<div
					className={cn(
						styles.loadingOverlay,
						loading && styles.loadingOverlayVisible,
					)}
				>
					<Spinner size="lg" label={loadingMessage} />
					<p className={styles.loadingMessage}>{loadingMessage}</p>
				</div>

				<table className={styles.table}>
					<thead className={styles.header}>
						<tr>
							{selectable && (
								<th className={styles.checkboxCell}>
									<Checkbox
										size="sm"
										checked={allSelected}
										indeterminate={someSelected && !allSelected}
										onChange={handleSelectAll}
										aria-label="Select all rows"
									/>
								</th>
							)}
							{columns.map((column) => (
								<th
									key={column.id}
									className={cn(
										styles.head,
										styles[`align-${column.align || "left"}`],
										column.sortable && styles.sortable,
									)}
									style={{ width: column.width }}
									onClick={
										column.sortable ? () => handleSort(column.id) : undefined
									}
									onKeyDown={
										column.sortable
											? (e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														handleSort(column.id);
													}
												}
											: undefined
									}
									tabIndex={column.sortable ? 0 : undefined}
									aria-sort={
										sortColumn === column.id
											? sortDirection === "asc"
												? "ascending"
												: "descending"
											: undefined
									}
								>
									<span className={styles.headContent}>
										{column.header}
										{column.sortable && (
											<span className={styles.sortIcon}>
												{sortColumn === column.id ? (
													sortDirection === "asc" ? (
														<ArrowUp />
													) : (
														<ArrowDown />
													)
												) : (
													<ArrowUpDown />
												)}
											</span>
										)}
									</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody className={styles.body}>
						{paginatedData.length === 0 && !loading ? (
							<tr>
								<td
									colSpan={columns.length + (selectable ? 1 : 0)}
									className={styles.emptyCell}
								>
									{emptyState || (
										<div className={styles.empty}>No data available</div>
									)}
								</td>
							</tr>
						) : (
							paginatedData.map((row) => {
								const id = getRowId(row);
								const isSelected = selectedIds.has(id);

								return (
									<tr
										key={id}
										className={cn(
											styles.row,
											isSelected && styles.selected,
											onRowClick && styles.clickable,
										)}
										onClick={onRowClick ? () => onRowClick(row) : undefined}
										onKeyDown={
											onRowClick
												? (e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															onRowClick(row);
														}
													}
												: undefined
										}
										tabIndex={onRowClick ? 0 : undefined}
										aria-selected={isSelected || undefined}
									>
										{selectable && (
											<td className={styles.checkboxCell}>
												<Checkbox
													size="sm"
													checked={isSelected}
													onChange={() => handleSelectRow(row)}
													onClick={(e) => e.stopPropagation()}
													aria-label={`Select row ${id}`}
												/>
											</td>
										)}
										{columns.map((column) => (
											<td
												key={column.id}
												className={cn(
													styles.cell,
													styles[`align-${column.align || "left"}`],
												)}
											>
												{column.cell(row)}
											</td>
										))}
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{pagination && totalPages > 1 && (
				<div className={styles.paginationWrapper}>
					<span className={styles.pageInfo}>
						Showing {(currentPage - 1) * pageSize + 1} to{" "}
						{Math.min(currentPage * pageSize, data.length)} of {data.length}
					</span>
					<Pagination
						page={currentPage}
						totalPages={totalPages}
						onPageChange={setCurrentPage}
						size="sm"
						showFirstLast={false}
					/>
				</div>
			)}
		</div>
	);
}

DataGrid.displayName = "DataGrid";
