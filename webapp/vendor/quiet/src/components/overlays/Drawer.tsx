import React from "react";
import { useEscape, useFocusTrap, useModalBackground, usePresence } from "../../a11y/hooks";
import "./Drawer.scss";

/**
 * Side sheet. Full height, rounded inner corners (--radius-xl), soft shadow, slow ease-in-out slide.
 * @startingPoint section="Overlays" subtitle="Side sheets" viewport="900x560"
 */
export interface DrawerProps {
	open: boolean;
	onClose?: () => void;
	eyebrow?: React.ReactNode;
	title?: React.ReactNode;
	accent?: React.ReactNode;
	description?: React.ReactNode;
	children?: React.ReactNode;
	footer?: React.ReactNode;
	side?: "right" | "left";
	size?: "sm" | "md" | "lg" | number;
	dismissible?: boolean;
}

const SIZES: string[] = ["sm", "md", "lg"];

export function Drawer({
	open,
	onClose,
	eyebrow,
	title,
	accent,
	description,
	children,
	footer,
	side = "right",
	size = "md",
	dismissible = true,
}: DrawerProps) {
	const { mounted, state } = usePresence(open, 160);
	const live = open && mounted;
	const scrim = React.useRef<HTMLDivElement>(null);
	const box = React.useRef<HTMLElement>(null);
	const id = React.useId();
	useModalBackground(scrim, live);
	useFocusTrap(box, live);
	useEscape(live && dismissible, onClose);
	if (!mounted) return null;
	const right = side !== "left";
	const named = SIZES.includes(size as string);
	return (
		<div
			ref={scrim}
			className={`q-drawer q-anim-fade q-drawer--${right ? "right" : "left"}`}
			data-state={state}
			onClick={dismissible ? onClose : undefined}
		>
			<aside
				ref={box}
				role="dialog"
				aria-modal="true"
				aria-labelledby={title ? `${id}-t` : undefined}
				aria-describedby={description ? `${id}-d` : undefined}
				tabIndex={-1}
				className={
					"q-drawer__panel " +
					(right ? "q-anim-slide-right" : "q-anim-slide-left") +
					(named ? ` q-drawer__panel--${size}` : "")
				}
				data-state={state}
				onClick={(e) => e.stopPropagation()}
				style={
					named
						? undefined
						: ({
								"--_max-width": typeof size === "number" ? `${size}px` : size,
							} as React.CSSProperties)
				}
			>
				<header className="q-drawer__header">
					<div className="q-drawer__heading">
						{eyebrow && <div className="q-drawer__eyebrow">{eyebrow}</div>}
						{title && (
							<div id={`${id}-t`} className="q-drawer__title">
								{title}
								{accent && (
									<>
										{" "}
										<em>{accent}</em>
									</>
								)}
								<span className="q-drawer__dot">.</span>
							</div>
						)}
						{description && (
							<div id={`${id}-d`} className="q-drawer__description">
								{description}
							</div>
						)}
					</div>
					{dismissible && (
						<button
							type="button"
							onClick={onClose}
							aria-label="Close drawer"
							className="q-drawer__close"
						>
							{"×"}
						</button>
					)}
				</header>
				<div className="q-drawer__body">{children}</div>
				{footer && <footer className="q-drawer__footer">{footer}</footer>}
			</aside>
		</div>
	);
}
