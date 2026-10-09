import React from "react";
import { useLinkElement } from "../../lib/link";
import "./Breadcrumb.scss";

/**
 * Mono caps trail separated by /. Collapses the middle into … .
 * @startingPoint section="Navigation" subtitle="Mono path trail" viewport="700x160"
 */
export interface BreadcrumbProps {
	items: Array<{
		label: React.ReactNode;
		href?: string;
		onClick?: () => void;
		icon?: React.ReactNode;
	}>;
	separator?: React.ReactNode;
	/** Collapse to first + … + last (maxItems-1) */
	maxItems?: number;
	size?: "sm" | "md" | "lg";
	/** Accessible name for the nav landmark. Defaults to "Breadcrumb: <current page>" */
	label?: string;
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

type BreadcrumbItem = BreadcrumbProps["items"][number];

function Crumb({ it, current }: { it: BreadcrumbItem; current: boolean }) {
	const cls = `q-breadcrumb__crumb${it.href || it.onClick ? " q-breadcrumb__crumb--action" : ""}`;
	const inner = (
		<>
			{it.icon}
			{it.label}
		</>
	);
	const A = useLinkElement(it.href);
	if (current)
		return (
			<span aria-current="page" className={cls}>
				{inner}
			</span>
		);
	if (it.href)
		return (
			<A href={it.href} className={cls}>
				{inner}
			</A>
		);
	return (
		<button type="button" onClick={it.onClick} className={cls}>
			{inner}
		</button>
	);
}

export function Breadcrumb({
	items = [],
	separator = "/",
	maxItems,
	size = "md",
	label,
	"aria-label": ariaLabel,
	className,
	style,
}: BreadcrumbProps) {
	const [expanded, setExpanded] = React.useState(false);
	const olRef = React.useRef<HTMLOListElement>(null);
	const reveal = React.useRef(false);
	let list: Array<
		(BreadcrumbItem & { _i: number; _more?: undefined }) | { _more: true; _i?: undefined }
	> = items.map((it, i) => ({ ...it, _i: i }));
	const hidden = maxItems && items.length > maxItems ? items.length - maxItems : 0;
	if (hidden && !expanded)
		list = [list[0]!, { _more: true }, ...list.slice(items.length - (maxItems! - 1))];
	// After "…" expands, move focus to the first revealed crumb so keyboard users keep their place.
	React.useEffect(() => {
		if (!expanded || !reveal.current || !olRef.current) return;
		reveal.current = false;
		const el =
			olRef.current.children[1] &&
			(olRef.current.children[1].lastElementChild as HTMLElement | null);
		if (el) {
			if (el.tagName === "SPAN") el.tabIndex = -1;
			el.focus();
		}
	}, [expanded]);
	// Distinct default name per trail (the current page), so several breadcrumbs on one page stay distinguishable.
	const last = items[items.length - 1];
	const name =
		ariaLabel ??
		label ??
		(last && typeof last.label === "string" ? `Breadcrumb: ${last.label}` : "Breadcrumb");
	return (
		<nav
			aria-label={name}
			className={[
				"q-breadcrumb",
				(size === "sm" || size === "lg") && `q-breadcrumb--${size}`,
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={style}
		>
			<ol ref={olRef} className="q-breadcrumb__list">
				{list.map((it, i) => (
					<li key={it._more ? "more" : it._i} className="q-breadcrumb__item">
						{i > 0 && (
							<span aria-hidden="true" className="q-breadcrumb__separator">
								{separator}
							</span>
						)}
						{it._more ? (
							<button
								type="button"
								aria-label={`Show ${hidden} more ${hidden === 1 ? "item" : "items"}`}
								aria-expanded={false}
								onClick={() => {
									reveal.current = true;
									setExpanded(true);
								}}
								className="q-breadcrumb__more"
							>
								{"…"}
							</button>
						) : (
							<Crumb it={it} current={it._i === items.length - 1} />
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
