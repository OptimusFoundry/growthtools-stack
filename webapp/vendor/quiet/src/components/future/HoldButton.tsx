import React from "react";
import { Button, type ButtonProps } from "../core/Button";
import "./HoldButton.scss";

/**
 * Hold-to-confirm button for irreversible or wide-reaching actions. Pointer, Space or Enter must be
 * held for `duration`; a molten hairline fills along the bottom edge as you hold. Releasing early
 * springs back. Progress is exposed as a progressbar beside the button.
 * Other Button props pass through, except the ones the hold itself drives.
 * @startingPoint section="Future" subtitle="Hold to confirm" viewport="600x140"
 */
export interface HoldButtonProps
	extends Omit<
		ButtonProps,
		| "children"
		| "variant"
		| "size"
		| "disabled"
		| "className"
		| "style"
		| "leftIcon"
		| "onClick"
		| "onPointerDown"
		| "onPointerUp"
		| "onPointerCancel"
		| "onLostPointerCapture"
		| "onKeyDown"
		| "onKeyUp"
		| "onBlur"
		| "aria-describedby"
		| "aria-disabled"
	> {
	children?: React.ReactNode;
	/** Fires once, when the hold completes */
	onConfirm?: () => void;
	/** How long to hold, in ms (default 900) */
	duration?: number;
	/** Controlled confirmed state; uncontrolled by default */
	confirmed?: boolean;
	/** Label once confirmed, e.g. "Paused · undo for 24h" */
	confirmedLabel?: React.ReactNode;
	/** Accessible hint announced with the button */
	hint?: string;
	variant?: "primary" | "secondary" | "outline" | "destructive";
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

// Hold-to-confirm: the only control that asks for effort. Pointer, Space or Enter must be held for
// `duration` ms; letting go early springs back. A molten hairline along the bottom edge fills as
// you hold — the heat, never a fill of the button itself.
export function HoldButton({
	children,
	onConfirm,
	duration = 900,
	confirmed: confirmedProp,
	confirmedLabel = "Confirmed",
	hint = "Press and hold to confirm",
	variant = "primary",
	size = "md",
	disabled = false,
	className,
	style,
	...rest
}: HoldButtonProps) {
	const [progress, setProgress] = React.useState(0);
	const [inner, setInner] = React.useState(false);
	const confirmed = confirmedProp ?? inner;
	const raf = React.useRef(0);
	const t0 = React.useRef(0);
	const uid = React.useId();

	const stop = () => {
		cancelAnimationFrame(raf.current);
		raf.current = 0;
		if (!confirmed) setProgress(0);
	};
	const start = () => {
		if (confirmed || disabled || raf.current) return;
		t0.current = performance.now();
		const tick = (now: number) => {
			const p = Math.min(1, (now - t0.current) / duration);
			setProgress(p);
			if (p < 1) raf.current = requestAnimationFrame(tick);
			else {
				raf.current = 0;
				setInner(true);
				onConfirm?.();
			}
		};
		raf.current = requestAnimationFrame(tick);
	};
	React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

	const isKey = (e: React.KeyboardEvent) => e.key === " " || e.key === "Enter";
	const holding = progress > 0 && !confirmed;
	const pct = Math.round(progress * 100);
	const cls = ["q-hold-button", confirmed && "q-hold-button--confirmed", className]
		.filter(Boolean)
		.join(" ");
	return (
		<span className={cls} style={{ "--_hold": progress, ...style } as React.CSSProperties}>
			<Button
				{...rest}
				variant={confirmed ? "secondary" : variant}
				size={size}
				disabled={disabled}
				className="q-hold-button__button"
				data-holding={holding || undefined}
				aria-describedby={confirmed ? undefined : `${uid}h`}
				aria-disabled={confirmed || undefined}
				onPointerDown={(e: React.PointerEvent<HTMLElement>) => {
					if (e.button === 0) {
						e.currentTarget.setPointerCapture?.(e.pointerId);
						start();
					}
				}}
				onPointerUp={stop}
				onPointerCancel={stop}
				onLostPointerCapture={stop}
				onKeyDown={(e: React.KeyboardEvent) => {
					if (isKey(e)) {
						e.preventDefault();
						if (!e.repeat) start();
					}
				}}
				onKeyUp={(e: React.KeyboardEvent) => {
					if (isKey(e)) {
						e.preventDefault();
						stop();
					}
				}}
				onBlur={stop}
				onClick={(e: React.MouseEvent) => e.preventDefault()}
				leftIcon={confirmed ? <span aria-hidden="true">{"✓"}</span> : undefined}
			>
				{confirmed ? confirmedLabel : children}
				{!confirmed && (
					<span aria-hidden="true" className="q-hold-button__hint">
						hold
					</span>
				)}
				{!confirmed && <span aria-hidden="true" className="q-hold-button__heat" />}
			</Button>
			<span id={`${uid}h`} className="q-sr-only">
				{hint}
			</span>
			{/* Progress for assistive tech: a button can't carry a value, so it sits beside it. */}
			{holding && (
				<span
					role="progressbar"
					aria-label="Hold progress"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={pct}
					className="q-sr-only"
				/>
			)}
			<span role="status" className="q-sr-only">
				{confirmed ? confirmedLabel : ""}
			</span>
		</span>
	);
}
