import type React from "react";
import "./Rule.scss";

/**
 * 1px hairline divider (the Divider). Soft or ink; solid, dashed or dotted; optional mono label; horizontal or vertical.
 * @startingPoint section="Layout" subtitle="Hairlines — labelled, vertical, dashed" viewport="700x200"
 */
export interface RuleProps {
	tone?: "soft" | "ink";
	variant?: "solid" | "dashed" | "dotted";
	orientation?: "horizontal" | "vertical";
	/** Mono caps label set into the line */
	label?: React.ReactNode;
	labelAlign?: "center" | "start";
	className?: string;
	style?: React.CSSProperties;
}

export function Rule({
	tone = "soft",
	variant = "solid",
	orientation = "horizontal",
	label,
	labelAlign = "center",
	className,
	style,
}: RuleProps) {
	const name = typeof label === "string" ? label : undefined;
	const vertical = orientation === "vertical";
	const cls = [
		"q-rule",
		vertical && "q-rule--vertical",
		label && "q-rule--labelled",
		tone === "ink" && "q-rule--ink",
		(variant === "dashed" || variant === "dotted") && `q-rule--${variant}`,
		className,
	]
		.filter(Boolean)
		.join(" ");
	const lab = label && <span className="q-rule__label">{label}</span>;
	if (vertical) {
		if (!label)
			return <span role="separator" aria-orientation="vertical" className={cls} style={style} />;
		return (
			<span
				role="separator"
				aria-orientation="vertical"
				aria-label={name}
				className={cls}
				style={style}
			>
				<span className="q-rule__line" />
				{lab}
				<span className="q-rule__line" />
			</span>
		);
	}
	if (!label) return <hr className={cls} style={style} />;
	return (
		<div role="separator" aria-label={name} className={cls} style={style}>
			{labelAlign !== "start" && <span className="q-rule__line" />}
			{lab}
			<span className="q-rule__line" />
		</div>
	);
}
