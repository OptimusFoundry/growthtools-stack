import React from "react";
import "./Alert.scss";

/**
 * Inline, in-flow message box. Rounded (--radius-md), hairline; status reads through the ringed glyph.
 * @startingPoint section="Feedback" subtitle="Info · success · warning · error" viewport="700x420"
 */
export interface AlertProps {
	variant?: "info" | "success" | "warning" | "error";
	title?: React.ReactNode;
	children?: React.ReactNode;
	/** false hides it; node replaces it */
	icon?: false | React.ReactNode;
	/** e.g. an ArrowLink or small Button */
	action?: React.ReactNode;
	/** Shows × */
	onDismiss?: () => void;
	className?: string;
	style?: React.CSSProperties;
}

const GLYPH: Record<string, string> = { info: "i", success: "✓", warning: "!", error: "!" };

export function Alert({
	variant = "info",
	title,
	children,
	icon,
	action,
	onDismiss,
	className,
	style,
}: AlertProps) {
	// quiet: dismiss collapses the alert's height (0 rest · 1 wrapped · 2 collapsing · 3 gone), then calls onDismiss.
	const [leave, setLeave] = React.useState(0);
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
	const v = GLYPH[variant] ? variant : "info";
	const glyph = icon === false ? null : icon || <span className="q-alert__glyph">{GLYPH[v]}</span>;
	const box = (
		<div
			role={variant === "error" ? "alert" : "status"}
			className={["q-alert", `q-alert--${v}`, className].filter(Boolean).join(" ")}
			style={style}
		>
			{glyph && (
				<span aria-hidden="true" className="q-alert__icon">
					{glyph}
				</span>
			)}
			<div className="q-alert__content">
				{title && <div className="q-alert__title">{title}</div>}
				{children && <div className="q-alert__body">{children}</div>}
				{action && <div className="q-alert__actions">{action}</div>}
			</div>
			{onDismiss && (
				<button
					type="button"
					aria-label="Dismiss alert"
					onClick={() => setLeave((l) => l || 1)}
					className="q-alert__dismiss"
				>
					{"×"}
				</button>
			)}
		</div>
	);
	return leave ? (
		<div className="q-collapse" data-open={leave === 1 ? "true" : "false"}>
			<div
				className="q-collapse-inner q-alert__collapse"
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
