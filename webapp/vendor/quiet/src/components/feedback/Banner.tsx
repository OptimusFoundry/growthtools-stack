import React from "react";
import "./Banner.scss";

/**
 * Full-width page-level strip above the header or app content.
 * @startingPoint section="Feedback" subtitle="Page-level strips" viewport="900x320"
 */
export interface BannerProps {
	/** ink = one-line ink strip · paper = paper-2 · outline = ink hairlines on white */
	variant?: "ink" | "paper" | "outline";
	status?: "info" | "success" | "warning" | "error";
	title?: React.ReactNode;
	children?: React.ReactNode;
	action?: React.ReactNode;
	dismissible?: boolean;
	onDismiss?: () => void;
	/** Landmark name when there is no title; defaults to "Notice" */
	label?: string;
	className?: string;
	style?: React.CSSProperties;
}

const GLYPH: Record<string, string> = { info: "i", success: "✓", warning: "!", error: "!" };
const VARIANTS: string[] = ["paper", "ink", "outline"];

export function Banner({
	variant = "paper",
	status = "info",
	title,
	children,
	action,
	onDismiss,
	dismissible = true,
	label,
	className,
	style,
}: BannerProps) {
	// quiet: dismiss collapses the strip's height (0 rest · 1 wrapped · 2 collapsing · 3 gone).
	const [leave, setLeave] = React.useState(0);
	const id = React.useId();
	// The latest onDismiss runs when the collapse ends; a new handler identity doesn't restart the timer.
	const dismissed = React.useEffectEvent(() => onDismiss?.());
	React.useEffect(() => {
		if (leave === 1) {
			let r = requestAnimationFrame(() => {
				r = requestAnimationFrame(() => setLeave(2));
			});
			return () => cancelAnimationFrame(r);
		}
		if (leave !== 2) return;
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const t = setTimeout(
			() => {
				setLeave(3);
				dismissed();
			},
			reduce ? 0 : 280,
		);
		return () => clearTimeout(t);
	}, [leave]);
	if (leave === 3) return null;
	const cls = [
		"q-banner",
		VARIANTS.includes(variant) && `q-banner--${variant}`,
		GLYPH[status] && `q-banner--${status}`,
		className,
	]
		.filter(Boolean)
		.join(" ");
	const box = (
		<div
			role={status === "error" ? "alert" : "region"}
			aria-labelledby={title ? id : undefined}
			aria-label={title ? undefined : label || "Notice"}
			className={cls}
			style={style}
		>
			<div className="q-banner__inner">
				<span aria-hidden="true" className="q-banner__glyph">
					{GLYPH[status]}
				</span>
				<div className="q-banner__text">
					{title && (
						<strong id={id} className="q-banner__title">
							{title}
						</strong>
					)}
					{title && children ? " " : ""}
					{children && <span className="q-banner__body">{children}</span>}
				</div>
				{action}
				{dismissible && (
					<button
						type="button"
						aria-label="Dismiss banner"
						onClick={() => setLeave((l) => l || 1)}
						className="q-banner__dismiss"
					>
						{"×"}
					</button>
				)}
			</div>
		</div>
	);
	return leave ? (
		<div className="q-collapse" data-open={leave === 1 ? "true" : "false"}>
			<div
				className="q-collapse-inner q-banner__collapse"
				data-open={leave === 1 ? "true" : "false"}
				inert
			>
				{box}
			</div>
		</div>
	) : (
		box
	);
}
