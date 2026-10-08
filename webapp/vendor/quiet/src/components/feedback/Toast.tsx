import React from "react";
import "./Toast.scss";

/**
 * Rounded notification with a soft hairline and shadow. Variants mark status with a dot or glyph.
 * @startingPoint section="Feedback" subtitle="Transient notifications" viewport="600x360"
 */
export interface ToastProps {
	title?: React.ReactNode;
	/** Body sentence */
	description?: React.ReactNode;
	/** Mono caps metadata line */
	meta?: React.ReactNode;
	variant?: "default" | "neutral" | "success" | "warning" | "error";
	/** Legacy: live = molten dot, neutral = ink dot */
	status?: "live" | "neutral";
	action?: React.ReactNode;
	/** Omit to make it not closable */
	onClose?: () => void;
	/** ms before it closes itself (needs onClose); paused while hovered or focused */
	duration?: number;
	className?: string;
	style?: React.CSSProperties;
}

const MARK: Record<string, React.ReactNode> = {
	default: <span className="q-toast__dot" />,
	neutral: <span className="q-toast__dot" />,
	success: <span className="q-toast__glyph">{"✓"}</span>,
	warning: <span className="q-toast__dot" />,
	error: <span className="q-toast__glyph">!</span>,
};

export function Toast({
	title,
	meta,
	description,
	variant,
	status = "live",
	action,
	onClose,
	duration,
	className,
	style,
}: ToastProps) {
	// quiet: rise in on mount, fade out before onClose; an auto-dismiss timer pauses while hovered or focused.
	const [closing, setClosing] = React.useState(false);
	const [paused, setPaused] = React.useState(false);
	const close = () => {
		if (closing) return;
		setClosing(true);
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		setTimeout(
			() => {
				setClosing(false);
				onClose?.();
			},
			reduce ? 0 : 160,
		);
	};
	// The timer restarts only on duration/pause/closing; a new onClose identity (an inline handler each render) must not reset it.
	const closable = React.useEffectEvent(() => !!onClose);
	const autoClose = React.useEffectEvent(() => close());
	React.useEffect(() => {
		if (!duration || !closable() || paused || closing) return;
		const t = setTimeout(() => autoClose(), duration);
		return () => clearTimeout(t);
	}, [duration, paused, closing]);
	const kind = variant || (status === "neutral" ? "neutral" : "default");
	const cls = [
		"q-toast",
		MARK[kind] && `q-toast--${kind}`,
		closing ? "q-anim-fade" : "q-anim-rise",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div
			role={kind === "error" ? "alert" : "status"}
			className={cls}
			data-state={closing ? "closing" : "open"}
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
			onFocus={() => setPaused(true)}
			onBlur={() => setPaused(false)}
			style={style}
		>
			<span aria-hidden="true" className="q-toast__mark">
				{MARK[kind]}
			</span>
			<div className="q-toast__content">
				{title && <div className="q-toast__title">{title}</div>}
				{description && <div className="q-toast__description">{description}</div>}
				{meta && <div className="q-toast__meta">{meta}</div>}
				{action && <div className="q-toast__action">{action}</div>}
			</div>
			{onClose && (
				<button
					type="button"
					onClick={close}
					aria-label="Dismiss notification"
					className="q-toast__close"
				>
					{"×"}
				</button>
			)}
		</div>
	);
}
