import React from "react";
import "./Tag.scss";

/**
 * Mono caps pill for stacks, categories and filters. Removable and selectable.
 * @startingPoint section="Primitives" subtitle="Mono pills — removable, selectable" viewport="700x180"
 */
export interface TagProps {
	children?: React.ReactNode;
	tone?: "default" | "ink";
	/** quiet addition: semantic status colour, from the theme's --q-status-* tokens */
	status?: "info" | "success" | "warning" | "error";
	size?: "sm" | "md";
	icon?: React.ReactNode;
	/** Small Avatar (size 'xs') rendered flush left */
	avatar?: React.ReactNode;
	/** Shows a × that calls this */
	onRemove?: () => void;
	/** Toggle chip; selected = ink fill */
	selectable?: boolean;
	selected?: boolean;
	defaultSelected?: boolean;
	onSelect?: (selected: boolean) => void;
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

const STATUSES: unknown[] = ["info", "success", "warning", "error"];

export function Tag({
	children,
	tone = "default",
	status,
	size = "md",
	icon,
	avatar,
	onRemove,
	selectable = false,
	selected,
	defaultSelected = false,
	onSelect,
	disabled = false,
	className,
	style,
}: TagProps) {
	const [inner, setInner] = React.useState(defaultSelected);
	const [leaving, setLeaving] = React.useState(false);
	const on = selected ?? inner;
	const El = selectable ? "button" : "span";
	const click = () => {
		if (!selectable || disabled) return;
		setInner(!on);
		onSelect?.(!on);
	};
	// Fade out, then hand the removal to the parent (immediately under reduced motion).
	const remove = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		if (leaving) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		setLeaving(true);
		setTimeout(
			() => {
				setLeaving(false);
				onRemove!();
			},
			reduce ? 0 : 160,
		);
	};
	const removeName = `Remove${typeof children === "string" || typeof children === "number" ? ` ${children}` : ""}`;
	const cls = [
		"q-tag",
		size === "sm" && "q-tag--sm",
		tone === "ink" && "q-tag--ink",
		STATUSES.includes(status) && `q-tag--${status}`,
		selectable && "q-tag--selectable",
		avatar && "q-tag--with-avatar",
		disabled && "q-tag--disabled",
		leaving && "q-anim-fade",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<El
			onClick={click}
			disabled={selectable ? disabled : undefined}
			aria-pressed={selectable ? on : undefined}
			type={selectable ? "button" : undefined}
			className={cls}
			data-state={leaving ? "closing" : undefined}
			style={style}
		>
			{avatar}
			{icon && (
				<span aria-hidden="true" className="q-tag__icon">
					{icon}
				</span>
			)}
			{children}
			{onRemove && (
				<button
					type="button"
					aria-label={removeName}
					disabled={disabled}
					onClick={remove}
					className="q-tag__remove"
				>
					{"×"}
				</button>
			)}
		</El>
	);
}
