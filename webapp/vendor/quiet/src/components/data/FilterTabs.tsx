import React from "react";
import { rovingKeyDown } from "../../a11y/hooks";
import "./FilterTabs.scss";

/**
 * Pill filter row with mono counts. Active is ink-filled.
 * @startingPoint section="Data" subtitle="Pill filters with counts" viewport="700x140"
 */
export interface FilterTabsProps {
	items: Array<
		| string
		| {
				value: string;
				label: React.ReactNode;
				count?: number;
				icon?: React.ReactNode;
				disabled?: boolean;
		  }
	>;
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	size?: "sm" | "md";
	showCounts?: boolean;
	/** Accessible name of the radio group; default 'Filter' */
	label?: string;
	className?: string;
	style?: React.CSSProperties;
}

type FilterTabsItem = Exclude<FilterTabsProps["items"][number], string>;

function FT({
	it,
	on,
	focusable,
	size,
	showCounts,
	onPick,
}: {
	it: FilterTabsItem;
	on: boolean;
	focusable: boolean;
	size: string;
	showCounts: boolean;
	onPick: (value: string) => void;
}) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={on}
			tabIndex={focusable ? 0 : -1}
			disabled={it.disabled}
			onClick={() => onPick(it.value)}
			className={`q-filter-tabs__tab${size === "sm" ? " q-filter-tabs__tab--sm" : ""}`}
		>
			{it.icon && (
				<span aria-hidden="true" className="q-filter-tabs__icon">
					{it.icon}
				</span>
			)}
			{it.label}
			{showCounts && it.count != null && (
				<>
					<span className="q-filter-tabs__count">{it.count}</span>
					<span className="q-sr-only">{it.count === 1 ? " item" : " items"}</span>
				</>
			)}
		</button>
	);
}

export function FilterTabs({
	items = [],
	value,
	defaultValue,
	onChange,
	size = "md",
	showCounts = true,
	label = "Filter",
	className,
	style,
}: FilterTabsProps) {
	const list: FilterTabsItem[] = items.map((i) =>
		typeof i === "string" ? { value: i, label: i } : i,
	);
	const [inner, setInner] = React.useState<string | undefined>(defaultValue ?? list[0]?.value);
	const cur = value ?? inner;
	const pick = (v: string) => {
		setInner(v);
		onChange?.(v);
	};
	const stop =
		list.find((it) => it.value === cur && !it.disabled) || list.find((it) => !it.disabled);
	return (
		<div
			role="radiogroup"
			aria-label={label}
			onKeyDown={rovingKeyDown('[role="radio"]', "both", { activate: true })}
			className={["q-filter-tabs", className].filter(Boolean).join(" ")}
			style={style}
		>
			{list.map((it) => (
				<FT
					key={it.value}
					it={it}
					on={it.value === cur}
					focusable={it === stop}
					size={size}
					showCounts={showCounts}
					onPick={pick}
				/>
			))}
		</div>
	);
}
