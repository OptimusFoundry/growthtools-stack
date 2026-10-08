import React from "react";
import { motionToken, usePresence } from "../../a11y/hooks";
import "./Table.scss";

/**
 * Data table. Mono caps header on an ink rule, soft row hairlines. Sorting, selection, expandable rows, striped, bordered, loading.
 * @startingPoint section="Data" subtitle="Sortable, selectable table" viewport="900x420"
 */
export interface TableProps<Row = Record<string, unknown>, Key extends React.Key = React.Key> {
	columns: Array<{
		key: string;
		header: React.ReactNode;
		align?: "left" | "right" | "center";
		width?: number | string;
		sortable?: boolean;
		sortValue?: (row: Row) => unknown;
		nowrap?: boolean;
		render?: (row: Row, index: number) => React.ReactNode;
		/** Cell spans this many columns for the row; the columns it covers are not rendered */
		colSpan?: (row: Row, index: number) => number | undefined;
		/** Footer (totals) cell; a function receives the rows in display order */
		footer?: React.ReactNode | ((rows: Row[]) => React.ReactNode);
		/** Footer cell spans this many columns */
		footerColSpan?: number;
	}>;
	data: Row[];
	/** Field name or getter; default 'id' */
	rowKey?: string | ((row: Row) => Key);
	size?: "sm" | "md" | "lg";
	striped?: boolean;
	bordered?: boolean;
	caption?: React.ReactNode;
	selectable?: boolean;
	selected?: Key[];
	defaultSelected?: Key[];
	onSelectionChange?: (keys: Key[]) => void;
	sort?: { key: string; dir: "asc" | "desc" } | null;
	defaultSort?: { key: string; dir: "asc" | "desc" };
	onSortChange?: (sort: { key: string; dir: "asc" | "desc" } | null) => void;
	/** Don't sort client-side; just report */
	manualSort?: boolean;
	/** Enables expandable rows */
	renderExpanded?: (row: Row) => React.ReactNode;
	/** Expanded row keys (controlled) */
	expanded?: Key[];
	defaultExpanded?: Key[];
	onExpandedChange?: (keys: Key[]) => void;
	/** Full-width footer row, after any columns[].footer row */
	footer?: React.ReactNode;
	loading?: boolean;
	loadingRows?: number;
	emptyText?: React.ReactNode;
	onRowClick?: (row: Row) => void;
	/** Scroll horizontally below this width */
	minWidth?: number;
	/** Accessible name when there is no caption */
	label?: string;
	/** Row name used in 'Select …' / 'Expand …' labels; default: first column's value */
	rowLabel?: (row: Row) => string;
	className?: string;
	style?: React.CSSProperties;
}

type TableColumn<Row> = TableProps<Row>["columns"][number];
type TableSort = { key: string; dir: "asc" | "desc" };

const SIZES: string[] = ["sm", "md", "lg"];
// Rows are the consumer's own type; a column reads its field by name.
const field = (row: unknown, key: string): unknown => (row as Record<string, unknown>)[key];
const len = (v: number | string) => (typeof v === "number" ? `${v}px` : v);
// Per-column width and alignment are dynamic, so they travel as --_* custom properties.
const colVars = <Row,>(c: TableColumn<Row>) => {
	const v: Record<string, string> = {};
	if (c.width != null) v["--_width"] = len(c.width);
	if (c.align) v["--_align"] = c.align;
	return v;
};

// Columns covered by an earlier cell's colSpan are dropped, so every row keeps the column count.
const spans = <Row,>(
	cols: TableColumn<Row>[],
	spanOf: (c: TableColumn<Row>) => number | undefined,
) => {
	const out: Array<{ c: TableColumn<Row>; ci: number; span: number | undefined }> = [];
	for (let ci = 0; ci < cols.length; ) {
		const c = cols[ci]!;
		const n = Math.max(1, Math.min(Math.floor(spanOf(c) || 1), cols.length - ci));
		out.push({ c, ci, span: n > 1 ? n : undefined });
		ci += n;
	}
	return out;
};

function Box({
	on,
	mixed,
	onClick,
	label,
}: {
	on: boolean;
	mixed?: boolean;
	onClick: () => void;
	label: string;
}) {
	return (
		<span
			role="checkbox"
			aria-checked={mixed ? "mixed" : on}
			aria-label={label}
			tabIndex={0}
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			onKeyDown={(e) => e.key === " " && (e.preventDefault(), onClick())}
			className="q-table__check"
		>
			{mixed ? "\u2212" : on ? "\u2713" : ""}
		</span>
	);
}

function TR<Row>({
	row,
	cols,
	i,
	striped,
	selectable,
	isSel,
	onSel,
	expandable,
	isOpen,
	onOpen,
	onRowClick,
	renderExpanded,
	name,
	id,
}: {
	row: Row;
	cols: TableColumn<Row>[];
	i: number;
	striped: boolean;
	selectable: boolean;
	isSel: boolean;
	onSel: () => void;
	expandable: boolean;
	isOpen: boolean;
	onOpen: () => void;
	onRowClick?: (row: Row) => void;
	renderExpanded?: (row: Row) => React.ReactNode;
	name: string;
	id: string;
}) {
	const click = onRowClick ? () => onRowClick(row) : expandable ? onOpen : undefined;
	const reveal = usePresence(expandable && isOpen);
	const cls = [
		"q-table__row",
		click && "q-table__row--clickable",
		striped && i % 2 && "q-table__row--stripe",
	]
		.filter(Boolean)
		.join(" ");
	return (
		<>
			<tr
				onClick={click}
				aria-selected={selectable ? isSel : undefined}
				className={cls}
				tabIndex={onRowClick ? 0 : undefined}
				onKeyDown={
					onRowClick
						? (e) => {
								if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
									e.preventDefault();
									onRowClick(row);
								}
							}
						: undefined
				}
			>
				{selectable && (
					<td className="q-table__cell q-table__cell--control">
						<Box on={isSel} onClick={onSel} label={`Select ${name}`} />
					</td>
				)}
				{expandable && (
					<td className="q-table__cell q-table__cell--control">
						<button
							type="button"
							aria-label={(isOpen ? "Collapse " : "Expand ") + name}
							aria-expanded={isOpen}
							aria-controls={id}
							onClick={(e) => {
								e.stopPropagation();
								onOpen();
							}}
							className="q-table__expand"
						>
							+
						</button>
					</td>
				)}
				{spans(cols, (c) => c.colSpan?.(row, i)).map(({ c, ci, span }) => (
					<td
						key={c.key}
						colSpan={span}
						style={colVars(c)}
						className={[
							"q-table__cell",
							ci === 0 && "q-table__cell--first",
							c.nowrap && "q-table__cell--nowrap",
							c.align === "right" && "q-table__cell--numeric",
						]
							.filter(Boolean)
							.join(" ")}
					>
						{c.render ? c.render(row, i) : (field(row, c.key) as React.ReactNode)}
					</td>
				))}
			</tr>
			{reveal.mounted && (
				<tr id={id} className="q-anim-drop" data-state={reveal.state}>
					<td colSpan={cols.length + 1 + (selectable ? 1 : 0)} className="q-table__detail">
						{renderExpanded!(row)}
					</td>
				</tr>
			)}
		</>
	);
}

export function Table<Row = Record<string, unknown>, Key extends React.Key = React.Key>({
	columns = [],
	data = [],
	rowKey = "id",
	size = "md",
	striped = false,
	bordered = false,
	caption,
	selectable = false,
	selected,
	defaultSelected = [],
	onSelectionChange,
	sort,
	defaultSort,
	onSortChange,
	manualSort = false,
	renderExpanded,
	expanded,
	defaultExpanded = [],
	onExpandedChange,
	footer,
	loading = false,
	loadingRows = 5,
	emptyText = "No rows.",
	onRowClick,
	minWidth,
	label,
	rowLabel,
	className,
	style,
}: TableProps<Row, Key>) {
	const [innerSel, setInnerSel] = React.useState(defaultSelected);
	const [innerSort, setInnerSort] = React.useState<TableSort | null>(defaultSort || null);
	const [innerOpen, setInnerOpen] = React.useState(defaultExpanded);
	const sel = selected ?? innerSel;
	const open = expanded ?? innerOpen;
	const toggleOpen = (k: Key) => {
		const next = open.includes(k) ? open.filter((x) => x !== k) : [...open, k];
		setInnerOpen(next);
		onExpandedChange?.(next);
	};
	const srt = sort !== undefined ? sort : innerSort;
	const keyOf = (r: Row, i: number) =>
		typeof rowKey === "function" ? rowKey(r) : ((field(r, rowKey) ?? i) as Key);
	const setSel = (s: Key[]) => {
		setInnerSel(s);
		onSelectionChange?.(s);
	};
	const rows = React.useMemo(() => {
		if (!srt || manualSort) return data;
		const col = columns.find((c) => c.key === srt.key);
		const get = col?.sortValue ? col.sortValue : (r: Row) => field(r, srt.key);
		return [...data].sort((a, b) => {
			const x = get(a),
				y = get(b);
			const r =
				typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
			return srt.dir === "desc" ? -r : r;
		});
	}, [data, srt, manualSort, columns]);
	const keys = rows.map(keyOf);
	const all = keys.length > 0 && keys.every((k) => sel.includes(k));
	const some = !all && keys.some((k) => sel.includes(k));
	const clickSort = (c: TableColumn<Row>) => {
		const next: TableSort | null =
			!srt || srt.key !== c.key
				? { key: c.key, dir: "asc" }
				: srt.dir === "asc"
					? { key: c.key, dir: "desc" }
					: null;
		setInnerSort(next);
		onSortChange?.(next);
	};
	const extra = (selectable ? 1 : 0) + (renderExpanded ? 1 : 0);
	const hasColFooter = columns.some((c) => c.footer !== undefined);
	const uid = React.useId();
	const nameOf = (r: Row, k: Key) =>
		rowLabel
			? rowLabel(r)
			: columns[0] &&
					(typeof field(r, columns[0].key) === "string" ||
						typeof field(r, columns[0].key) === "number")
				? String(field(r, columns[0].key))
				: `row ${k}`;
	// Sort reorder: rows fade in softly after the order changes (never on mount).
	const body = React.useRef<HTMLTableSectionElement>(null);
	const sortSig = srt ? `${srt.key}:${srt.dir}` : "";
	const lastSig = React.useRef(sortSig);
	React.useEffect(() => {
		if (lastSig.current === sortSig) return;
		lastSig.current = sortSig;
		const el = body.current;
		if (!el?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const timing = {
			duration: motionToken(el, "--q-dur-expand"),
			easing: motionToken(el, "--q-ease-soft") as string,
		};
		el.querySelectorAll("tr").forEach((tr) => {
			tr.animate([{ opacity: 0.35 }, { opacity: 1 }], timing);
		});
	}, [sortSig]);
	const cls = [
		"q-table",
		`q-table--${SIZES.includes(size) ? size : "md"}`,
		bordered && "q-table--bordered",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div className={cls} style={style}>
			<table
				aria-label={caption ? undefined : label}
				aria-busy={loading || undefined}
				className="q-table__table"
				style={
					minWidth != null ? ({ "--_min-width": len(minWidth) } as React.CSSProperties) : undefined
				}
			>
				{caption && <caption className="q-table__caption">{caption}</caption>}
				<thead>
					<tr>
						{selectable && (
							<th className="q-table__head q-table__head--control">
								<Box
									on={all}
									mixed={some}
									onClick={() =>
										setSel(
											all
												? sel.filter((k) => !keys.includes(k))
												: Array.from(new Set([...sel, ...keys])),
										)
									}
									label="Select all rows"
								/>
							</th>
						)}
						{renderExpanded && (
							<th className="q-table__head q-table__head--control">
								<span className="q-sr-only">Details</span>
							</th>
						)}
						{columns.map((c) => {
							const on = srt && srt.key === c.key;
							return (
								<th
									key={c.key}
									aria-sort={on ? (srt!.dir === "asc" ? "ascending" : "descending") : undefined}
									className="q-table__head"
									style={colVars(c)}
								>
									{c.sortable ? (
										<button type="button" onClick={() => clickSort(c)} className="q-table__sort">
											{c.header}
											<span aria-hidden="true">
												{on ? (srt!.dir === "asc" ? "\u2191" : "\u2193") : "\u2195"}
											</span>
										</button>
									) : (
										c.header
									)}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody ref={body}>
					{loading ? (
						Array.from({ length: loadingRows }, (_, i) => (
							<tr key={`s${i}`}>
								{Array.from({ length: columns.length + extra }, (_, j) => (
									<td key={j} className="q-table__skeleton-cell">
										<span
											className={`q-table__skeleton${j === 0 ? " q-table__skeleton--first" : ""}`}
										/>
									</td>
								))}
							</tr>
						))
					) : rows.length === 0 ? (
						<tr>
							<td colSpan={columns.length + extra} className="q-table__empty">
								{emptyText}
							</td>
						</tr>
					) : (
						rows.map((r, i) => {
							const k = keyOf(r, i);
							return (
								<TR
									key={k}
									row={r}
									cols={columns}
									i={i}
									striped={striped}
									selectable={selectable}
									isSel={sel.includes(k)}
									onSel={() => setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k])}
									expandable={!!renderExpanded}
									isOpen={open.includes(k)}
									onOpen={() => toggleOpen(k)}
									onRowClick={onRowClick}
									renderExpanded={renderExpanded}
									name={nameOf(r, k)}
									id={`${uid}x${i}`}
								/>
							);
						})
					)}
				</tbody>
				{!loading && (hasColFooter || footer != null) && (
					<tfoot>
						{hasColFooter && (
							<tr>
								{Array.from({ length: extra }, (_, j) => (
									<td key={`c${j}`} className="q-table__foot q-table__foot--control" />
								))}
								{spans(columns, (c) => c.footerColSpan).map(({ c, span }) => (
									<td
										key={c.key}
										colSpan={span}
										style={colVars(c)}
										className={[
											"q-table__foot",
											c.nowrap && "q-table__foot--nowrap",
											c.align === "right" && "q-table__foot--numeric",
										]
											.filter(Boolean)
											.join(" ")}
									>
										{typeof c.footer === "function" ? c.footer(rows) : c.footer}
									</td>
								))}
							</tr>
						)}
						{footer != null && (
							<tr>
								<td colSpan={columns.length + extra} className="q-table__foot">
									{footer}
								</td>
							</tr>
						)}
					</tfoot>
				)}
			</table>
		</div>
	);
}
