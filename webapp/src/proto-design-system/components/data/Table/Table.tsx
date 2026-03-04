import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import { Spinner } from "../../primitives/Spinner";
import styles from "./Table.module.scss";

export type TableSize = "sm" | "md" | "lg";
export type TableVariant = "default" | "striped" | "bordered";
export type SortDirection = "asc" | "desc" | null;

export interface TableProps {
	/** Table size */
	size?: TableSize;
	/** Table variant */
	variant?: TableVariant;
	/** Whether the table is loading */
	loading?: boolean;
	/** Loading message */
	loadingMessage?: string;
	/** Minimum width for responsive horizontal scroll */
	minWidth?: string;
	/** Table content */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * Table component for displaying tabular data.
 *
 * @example
 * ```tsx
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *       <TableHead>Email</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>John Doe</TableCell>
 *       <TableCell>john@example.com</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * ```
 */
export function Table({
	size = "md",
	variant = "default",
	loading = false,
	loadingMessage = "Loading...",
	minWidth,
	children,
	className,
}: TableProps) {
	return (
		<div className={cn(styles.wrapper, loading && styles.wrapperLoading)}>
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

			<table
				className={cn(
					styles.table,
					styles[`size-${size}`],
					styles[variant],
					className,
				)}
				style={minWidth ? { minWidth } : undefined}
			>
				{children}
			</table>
		</div>
	);
}

export interface TableHeaderProps {
	children: ReactNode;
	className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
	return <thead className={cn(styles.header, className)}>{children}</thead>;
}

export interface TableBodyProps {
	children: ReactNode;
	className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
	return <tbody className={cn(styles.body, className)}>{children}</tbody>;
}

export interface TableFooterProps {
	children: ReactNode;
	className?: string;
}

export function TableFooter({ children, className }: TableFooterProps) {
	return <tfoot className={cn(styles.footer, className)}>{children}</tfoot>;
}

export interface TableRowProps {
	children: ReactNode;
	/** Selected state */
	selected?: boolean;
	/** Whether the row is expandable */
	expandable?: boolean;
	/** Whether the row is expanded */
	expanded?: boolean;
	/** Click handler */
	onClick?: () => void;
	className?: string;
}

export function TableRow({
	children,
	selected = false,
	expandable = false,
	expanded = false,
	onClick,
	className,
}: TableRowProps) {
	return (
		<tr
			className={cn(
				styles.row,
				selected && styles.selected,
				expanded && styles.expanded,
				(onClick || expandable) && styles.clickable,
				className,
			)}
			onClick={onClick}
			onKeyDown={
				onClick
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick();
							}
						}
					: undefined
			}
			tabIndex={onClick ? 0 : undefined}
			aria-selected={selected || undefined}
			aria-expanded={expandable ? expanded : undefined}
		>
			{children}
		</tr>
	);
}

export interface TableHeadProps {
	children?: ReactNode;
	/** Sort direction */
	sortDirection?: SortDirection;
	/** Sortable handler */
	onSort?: () => void;
	/** Column width */
	width?: string | number;
	/** Whether the column should use narrow width (for checkboxes, icons) */
	narrow?: boolean;
	/** Text alignment */
	align?: "left" | "center" | "right";
	className?: string;
}

export function TableHead({
	children,
	sortDirection,
	onSort,
	width,
	narrow = false,
	align = "left",
	className,
}: TableHeadProps) {
	const isSortable = onSort !== undefined;

	const sortIcon =
		sortDirection === "asc" ? (
			<ArrowUp />
		) : sortDirection === "desc" ? (
			<ArrowDown />
		) : (
			<ArrowUpDown />
		);

	return (
		<th
			className={cn(
				styles.head,
				styles[`align-${align}`],
				narrow && styles.headNarrow,
				isSortable && styles.sortable,
				className,
			)}
			style={{ width }}
			onClick={isSortable ? onSort : undefined}
			onKeyDown={
				isSortable
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onSort();
							}
						}
					: undefined
			}
			tabIndex={isSortable ? 0 : undefined}
			aria-sort={
				sortDirection === "asc"
					? "ascending"
					: sortDirection === "desc"
						? "descending"
						: undefined
			}
		>
			<span className={styles.headContent}>
				{children}
				{isSortable && <span className={styles.sortIcon}>{sortIcon}</span>}
			</span>
		</th>
	);
}

export interface TableCellProps {
	children?: ReactNode;
	/** Text alignment */
	align?: "left" | "center" | "right";
	className?: string;
}

export function TableCell({
	children,
	align = "left",
	className,
}: TableCellProps) {
	return (
		<td className={cn(styles.cell, styles[`align-${align}`], className)}>
			{children}
		</td>
	);
}

export interface TableCaptionProps {
	children: ReactNode;
	className?: string;
}

export function TableCaption({ children, className }: TableCaptionProps) {
	return (
		<caption className={cn(styles.caption, className)}>{children}</caption>
	);
}

export interface TableExpandedRowProps {
	children: ReactNode;
	/** Number of columns to span */
	colSpan: number;
	/** Whether the row is expanded */
	expanded?: boolean;
	className?: string;
}

/**
 * TableExpandedRow displays expanded content spanning all columns.
 * Use with TableRow's expanded prop for collapsible row content.
 */
export function TableExpandedRow({
	children,
	colSpan,
	expanded = true,
	className,
}: TableExpandedRowProps) {
	return (
		<tr
			className={cn(
				styles.expandedRow,
				expanded && styles.expandedRowVisible,
				className,
			)}
		>
			<td colSpan={colSpan} className={styles.expandedCell}>
				<div className={styles.expandedWrapper}>
					<div className={styles.expandedContent}>{children}</div>
				</div>
			</td>
		</tr>
	);
}

Table.displayName = "Table";
TableHeader.displayName = "TableHeader";
TableBody.displayName = "TableBody";
TableFooter.displayName = "TableFooter";
TableRow.displayName = "TableRow";
TableHead.displayName = "TableHead";
TableCell.displayName = "TableCell";
TableCaption.displayName = "TableCaption";
TableExpandedRow.displayName = "TableExpandedRow";
