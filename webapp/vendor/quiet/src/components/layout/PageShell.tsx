import React from "react";
import "./PageShell.scss";

/**
 * Page frame: max width, gutters, header slot, and a 1 / 2 / 3 / sidebar column layout that stacks under 720px.
 * @startingPoint section="Layout" subtitle="Page column layouts" viewport="900x420"
 */
export interface PageShellProps {
	layout?: "single" | "half" | "third" | "sidebar" | "sidebar-right";
	/** 880px max instead of 1280 */
	narrow?: boolean;
	/** Usually a PageHero */
	header?: React.ReactNode;
	/** One child per column */
	children?: React.ReactNode;
	gap?: number;
	animated?: boolean;
	/** Root element; pass 'main' when the shell is the page's main landmark */
	as?: "div" | "main" | "section" | "article";
	className?: string;
	style?: React.CSSProperties;
}

const LAYOUTS: string[] = ["single", "half", "third", "sidebar", "sidebar-right"];

export function PageShell({
	layout = "single",
	narrow = false,
	header,
	children,
	gap,
	animated = false,
	as = "div",
	className,
	style,
}: PageShellProps) {
	const Tag = as as React.ElementType;
	const kids = React.Children.toArray(children);
	const [stack, setStack] = React.useState(false);
	const ref = React.useRef<HTMLElement>(null);
	React.useEffect(() => {
		if (!ref.current || typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(([e]) => setStack(e!.contentRect.width < 720));
		ro.observe(ref.current);
		return () => ro.disconnect();
	}, []);
	const mode = stack || !LAYOUTS.includes(layout) ? "single" : layout;
	const cls = [
		"q-page-shell",
		`q-page-shell--${mode}`,
		narrow && "q-page-shell--narrow",
		animated && "q-page-shell--animated",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<Tag
			ref={ref}
			className={cls}
			style={{
				...(gap != null && { "--_gap": typeof gap === "number" ? `${gap}px` : gap }),
				...style,
			}}
		>
			{header}
			<div className="q-page-shell__body">
				{kids.map((c, i) => (
					<div
						key={i}
						className="q-page-shell__column"
						style={animated ? ({ "--_i": i } as React.CSSProperties) : undefined}
					>
						{c}
					</div>
				))}
			</div>
		</Tag>
	);
}
