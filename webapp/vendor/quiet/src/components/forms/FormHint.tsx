import React from "react";
import "./FormHint.scss";

/**
 * Helper / error / success line under a field. Mono 11px.
 * @startingPoint section="Forms" subtitle="Helper, error, success" viewport="600x160"
 */
export interface FormHintProps {
	variant?: "default" | "error" | "success";
	/** true = default glyph (i ! ✓); node = custom; false = none */
	icon?: boolean | React.ReactNode;
	hidden?: boolean;
	id?: string;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export function FormHint({
	variant = "default",
	icon,
	hidden = false,
	id,
	children,
	className,
	style,
}: FormHintProps) {
	// Fade in only when the hint appears or changes variant after the first render.
	const first = React.useRef(hidden || !children ? "" : variant).current;
	if (hidden || !children) return null;
	const glyph =
		icon === true || (icon === undefined && variant !== "default")
			? ({ error: "!", success: "\u2713", default: "i" } as Record<string, string>)[variant]
			: icon || null;
	const cls = [
		"q-form-hint",
		`q-form-hint--${variant}`,
		variant !== first && "q-anim-fade",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<span
			key={variant}
			id={id}
			role={variant === "error" ? "alert" : undefined}
			className={cls}
			data-state="open"
			style={style}
		>
			{glyph && (
				<span aria-hidden="true" className="q-form-hint__glyph">
					{glyph}
				</span>
			)}
			<span>{children}</span>
		</span>
	);
}
