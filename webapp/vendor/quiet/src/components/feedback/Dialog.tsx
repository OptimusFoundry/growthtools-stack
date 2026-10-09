import React from "react";
import { useEscape, useFocusTrap, usePresence } from "../../a11y/hooks";
import "./Dialog.scss";

/**
 * Modal dialog. Rounded (--radius-xl), soft hairline, --shadow-3, ink scrim at 24%. Sizes, status icon, non-dismissible.
 * @startingPoint section="Overlays" subtitle="Modal dialogs" viewport="700x480"
 */
export interface DialogProps {
	open: boolean;
	onClose?: () => void;
	eyebrow?: React.ReactNode;
	title?: React.ReactNode;
	/** Italic phrase after the title; a molten period follows */
	accent?: React.ReactNode;
	/** 'info' | 'success' | 'warning' | 'error' or a glyph node — rendered in a 40px ring */
	icon?: "info" | "success" | "warning" | "error" | React.ReactNode;
	children?: React.ReactNode;
	actions?: React.ReactNode;
	size?: "sm" | "md" | "lg" | "xl";
	/** px; overrides size */
	width?: number;
	/** false = no Esc, no scrim click, no × */
	dismissible?: boolean;
	showClose?: boolean;
}

const SIZES: string[] = ["sm", "md", "lg", "xl"];
// quiet: while a modal is open, everything outside it is inert and the page doesn't scroll.
function useModalBackground(ref: React.RefObject<HTMLElement | null>, active: boolean) {
	React.useEffect(() => {
		if (!active || !ref.current) return;
		const done: HTMLElement[] = [];
		for (
			let n: HTMLElement = ref.current;
			n.parentElement && n !== document.body;
			n = n.parentElement!
		)
			for (const sib of n.parentElement.children as HTMLCollectionOf<HTMLElement>)
				if (sib !== n && !sib.inert && sib.tagName !== "SCRIPT") {
					sib.inert = true;
					done.push(sib);
				}
		const overflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			done.forEach((sib) => {
				sib.inert = false;
			});
			document.body.style.overflow = overflow;
		};
	}, [active, ref]);
}
const ICONS: Record<string, string> = { info: "i", success: "✓", warning: "!", error: "!" };

export function Dialog({
	open,
	onClose,
	eyebrow,
	title,
	accent,
	icon,
	children,
	actions,
	size,
	width,
	dismissible = true,
	showClose = true,
}: DialogProps) {
	const { mounted, state } = usePresence(open, 160);
	const live = open && mounted;
	const scrim = React.useRef<HTMLDivElement>(null);
	const box = React.useRef<HTMLDivElement>(null);
	const id = React.useId();
	useModalBackground(scrim, live);
	useFocusTrap(box, live);
	useEscape(live && dismissible, onClose);
	if (!mounted) return null;
	const ic = typeof icon === "string" && ICONS[icon] ? icon : null;
	const cls = [
		"q-dialog__panel",
		"q-anim-scale",
		`q-dialog__panel--${SIZES.includes(size as string) ? size : "md"}`,
	].join(" ");
	return (
		<div
			ref={scrim}
			className="q-dialog q-anim-fade"
			data-state={state}
			onClick={dismissible ? onClose : undefined}
		>
			<div
				ref={box}
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? `${id}-t` : undefined}
				aria-describedby={typeof children === "string" ? `${id}-d` : undefined}
				tabIndex={-1}
				className={cls}
				data-state={state}
				onClick={(e) => e.stopPropagation()}
				style={
					width
						? ({
								"--_max-width": typeof width === "number" ? `${width}px` : width,
							} as React.CSSProperties)
						: undefined
				}
			>
				<div className="q-dialog__header">
					<div className="q-dialog__heading">
						{icon && (
							<span
								aria-hidden="true"
								className={
									"q-dialog__icon" +
									(ic === "warning" || ic === "error" ? " q-dialog__icon--hot" : "")
								}
							>
								{ic ? ICONS[ic] : icon}
							</span>
						)}
						{eyebrow && <div className="q-dialog__eyebrow">{eyebrow}</div>}
						{title && (
							<div id={`${id}-t`} className="q-dialog__title">
								{title}
								{accent && (
									<>
										{" "}
										<em>{accent}</em>
									</>
								)}
								<span className="q-dialog__dot">.</span>
							</div>
						)}
					</div>
					{showClose && dismissible && (
						<button
							type="button"
							onClick={onClose}
							aria-label="Close dialog"
							className="q-dialog__close"
						>
							{"×"}
						</button>
					)}
				</div>
				{children && (
					<div id={`${id}-d`} className="q-dialog__body">
						{children}
					</div>
				)}
				{actions && <div className="q-dialog__actions">{actions}</div>}
			</div>
		</div>
	);
}
