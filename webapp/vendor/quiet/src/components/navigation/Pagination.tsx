import React from "react";
import "./Pagination.scss";

/**
 * Page navigation with mono, zero-padded numbers in circles.
 * @startingPoint section="Navigation" subtitle="Page controls" viewport="700x180"
 */
export interface PaginationProps {
	page?: number;
	defaultPage?: number;
	/** Total pages */
	total: number;
	onChange?: (page: number) => void;
	siblings?: number;
	showFirstLast?: boolean;
	variant?: "default" | "outline" | "ghost";
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	/** Accessible name for the nav landmark. Defaults to "Pagination, page <n> of <total>" */
	label?: string;
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

const VARIANTS: string[] = ["default", "outline", "ghost"];
function range(page: number, total: number, siblings: number) {
	const out: Array<number | "l" | "r"> = [];
	const lo = Math.max(2, page - siblings),
		hi = Math.min(total - 1, page + siblings);
	out.push(1);
	if (lo > 2) out.push("l");
	for (let i = lo; i <= hi; i++) out.push(i);
	if (hi < total - 1) out.push("r");
	if (total > 1) out.push(total);
	return out;
}

function PageBtn({
	children,
	on,
	disabled,
	onClick,
	label,
}: {
	children: React.ReactNode;
	on?: boolean;
	disabled: boolean;
	onClick: () => void;
	label: string;
}) {
	return (
		<button
			type="button"
			className="q-pagination__page"
			aria-label={label}
			aria-current={on ? "page" : undefined}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

export function Pagination({
	page,
	defaultPage = 1,
	total = 1,
	onChange,
	siblings = 1,
	showFirstLast = true,
	variant = "default",
	size = "md",
	disabled = false,
	label,
	"aria-label": ariaLabel,
	className,
	style,
}: PaginationProps) {
	const [inner, setInner] = React.useState(defaultPage);
	const cur = page ?? inner;
	const go = (p: number) => {
		if (p < 1 || p > total || p === cur) return;
		setInner(p);
		onChange?.(p);
	};
	const b = (k: string | number, ch: React.ReactNode, p: number, lab: string, on?: boolean) => (
		<PageBtn
			key={k}
			on={on}
			label={lab}
			disabled={disabled || (!on && (p < 1 || p > total || p === cur))}
			onClick={() => go(p)}
		>
			{ch}
		</PageBtn>
	);
	return (
		<nav
			aria-label={ariaLabel ?? label ?? `Pagination, page ${cur} of ${total}`}
			className={[
				"q-pagination",
				`q-pagination--${VARIANTS.includes(variant) ? variant : "default"}`,
				(size === "sm" || size === "lg") && `q-pagination--${size}`,
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={style}
		>
			{showFirstLast && b("f", "\u00ab", 1, "First page")}
			{b("p", "\u2190", cur - 1, "Previous page")}
			{range(cur, total, siblings).map((p) =>
				typeof p === "string" ? (
					<span key={p} aria-hidden="true" className="q-pagination__ellipsis">
						{"\u2026"}
					</span>
				) : (
					b(p, String(p).padStart(2, "0"), p, `Page ${p}`, p === cur)
				),
			)}
			{b("n", "\u2192", cur + 1, "Next page")}
			{showFirstLast && b("l", "\u00bb", total, "Last page")}
		</nav>
	);
}
