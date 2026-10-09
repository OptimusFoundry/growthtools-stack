import React from "react";
import { focusables, useEscape, useOutside, usePresence } from "../../a11y/hooks";
import "./Popover.scss";

/**
 * Click-triggered floating panel for rich content. Rounded (--radius-lg), soft hairline + shadow.
 * @startingPoint section="Overlays" subtitle="Floating panels" viewport="600x360"
 */
export interface PopoverProps {
	trigger: React.ReactNode;
	title?: React.ReactNode;
	children?: React.ReactNode;
	placement?: "top" | "bottom" | "left" | "right";
	align?: "start" | "center" | "end";
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	width?: number;
	/** Focus first focusable element on open */
	trapFocus?: boolean;
	/** Close on a pointer down outside the trigger and panel (default true) */
	closeOnClickOutside?: boolean;
	/** Close on Escape and return focus to the trigger (default true) */
	closeOnEscape?: boolean;
	/** Show a × button in the panel's corner (default false) */
	showClose?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

export function Popover({
	trigger,
	title,
	children,
	placement = "bottom",
	align = "center",
	open,
	defaultOpen = false,
	onOpenChange,
	width = 280,
	trapFocus = true,
	closeOnClickOutside = true,
	closeOnEscape = true,
	showClose = false,
	className,
	style,
}: PopoverProps) {
	const [inner, setInner] = React.useState(defaultOpen);
	const cur = open ?? inner;
	const ref = React.useRef<HTMLSpanElement>(null);
	const panel = React.useRef<HTMLDivElement>(null);
	const trig = React.useRef<HTMLSpanElement>(null);
	const refs = React.useMemo(() => [ref], []);
	const id = React.useId();
	const { mounted, state } = usePresence(cur, 160);
	const set = (v: boolean) => {
		setInner(v);
		onOpenChange?.(v);
	};
	// quiet: the real trigger (a button) carries the popup state; a non-interactive trigger becomes the button itself.
	const [btn, setBtn] = React.useState<HTMLElement | null>(null);
	React.useLayoutEffect(() => {
		const t = trig.current && (trig.current.firstElementChild as HTMLElement | null);
		setBtn(t?.matches('button,a[href],input,[role="button"]') ? t : null);
	});
	React.useLayoutEffect(() => {
		if (!btn) return;
		btn.setAttribute("aria-haspopup", "dialog");
		btn.setAttribute("aria-expanded", String(!!cur));
		if (cur && mounted) btn.setAttribute("aria-controls", id);
		else btn.removeAttribute("aria-controls");
	});
	const back = () => {
		const t = btn || trig.current;
		t?.focus();
	};
	const dismiss = () => {
		set(false);
		back();
	};
	useEscape(cur && closeOnEscape, dismiss);
	useOutside(refs, cur && closeOnClickOutside, () => set(false));
	// Focus moves in when the panel opens; toggling trapFocus while it's open must not pull focus back.
	const movesFocus = React.useEffectEvent(() => trapFocus);
	React.useEffect(() => {
		if (!cur || !mounted || !movesFocus() || !panel.current) return;
		const f = focusables(panel.current)[0];
		f?.focus();
	}, [cur, mounted]);
	const own: React.HTMLAttributes<HTMLSpanElement> = btn
		? {}
		: {
				role: "button",
				tabIndex: 0,
				"aria-haspopup": "dialog",
				"aria-expanded": !!cur,
				"aria-controls": cur && mounted ? id : undefined,
				onKeyDown: (e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						set(!cur);
					}
				},
			};
	return (
		<span ref={ref} className={className ? `q-popover ${className}` : "q-popover"} style={style}>
			<span ref={trig} onClick={() => set(!cur)} {...own} className="q-popover__trigger">
				{trigger}
			</span>
			{mounted && (
				<div
					ref={panel}
					id={id}
					role="dialog"
					aria-labelledby={title ? `${id}-t` : undefined}
					className={
						showClose
							? "q-popover__panel q-popover__panel--closable q-anim-fade"
							: "q-popover__panel q-anim-fade"
					}
					data-state={state}
					data-placement={placement}
					data-align={align}
					style={
						{ "--_width": typeof width === "number" ? `${width}px` : width } as React.CSSProperties
					}
				>
					{title && (
						<div id={`${id}-t`} className="q-popover__title">
							{title}
						</div>
					)}
					{children}
					{showClose && (
						<button type="button" onClick={dismiss} aria-label="Close" className="q-popover__close">
							{"×"}
						</button>
					)}
				</div>
			)}
		</span>
	);
}
