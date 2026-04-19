import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Drawer.module.scss";

function useIsDesktop(): boolean {
	const [desktop, setDesktop] = useState(() => {
		if (typeof window === "undefined") return true;
		return window.matchMedia("(min-width: 768px)").matches;
	});
	useEffect(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);
	return desktop;
}

export type DrawerSize = "sm" | "md" | "lg";

export interface DrawerProps {
	/** Whether the drawer is open */
	isOpen: boolean;
	/** Close callback */
	onClose: () => void;
	/** Drawer title */
	title?: string;
	/** Drawer description */
	description?: string;
	/** Width (desktop). Maps to CSS variable for the side drawer. */
	size?: DrawerSize;
	/** Show close button in header */
	showCloseButton?: boolean;
	/** Dismissible on backdrop click / Escape */
	dismissible?: boolean;
	/** Body content */
	children: ReactNode;
	/** Footer content (usually action buttons) */
	footer?: ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * Drawer — side panel on desktop, bottom sheet on mobile.
 *
 * @example
 * ```tsx
 * <Drawer
 *   isOpen={scheduleOpen}
 *   onClose={() => setScheduleOpen(false)}
 *   title="Schedule post"
 *   footer={<Button onClick={confirm}>Schedule</Button>}
 * >
 *   <DatePicker value={date} onChange={setDate} />
 * </Drawer>
 * ```
 */
export function Drawer({
	isOpen,
	onClose,
	title,
	description,
	size = "md",
	showCloseButton = true,
	dismissible = true,
	children,
	footer,
	className,
}: DrawerProps) {
	const prefersReducedMotion = useReducedMotion();
	const isDesktop = useIsDesktop();

	const handleBackdropClick = useCallback(() => {
		if (dismissible) onClose();
	}, [dismissible, onClose]);

	// Escape to close
	useEffect(() => {
		if (!isOpen || !dismissible) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [isOpen, dismissible, onClose]);

	// Lock body scroll while open
	useEffect(() => {
		if (!isOpen) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [isOpen]);

	if (typeof document === "undefined") return null;

	const motionProps = prefersReducedMotion
		? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
		: undefined;

	return createPortal(
		<AnimatePresence>
			{isOpen && (
				<div className={styles.root}>
					<motion.button
						type="button"
						className={styles.backdrop}
						aria-label="Close drawer"
						onClick={handleBackdropClick}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
					/>
					<motion.aside
						className={cn(styles.panel, styles[`size-${size}`], className)}
						role="dialog"
						aria-modal="true"
						aria-label={title}
						{...(motionProps ??
							(isDesktop
								? {
										initial: { x: "100%", y: 0 },
										animate: { x: 0, y: 0 },
										exit: { x: "100%", y: 0 },
									}
								: {
										initial: { y: "100%", x: 0 },
										animate: { y: 0, x: 0 },
										exit: { y: "100%", x: 0 },
									}))}
						transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] as const }}
					>
						{(title || showCloseButton) && (
							<header className={styles.header}>
								<div className={styles.titleBlock}>
									{title && <h2 className={styles.title}>{title}</h2>}
									{description && (
										<p className={styles.description}>{description}</p>
									)}
								</div>
								{showCloseButton && (
									<button
										type="button"
										className={styles.closeBtn}
										onClick={onClose}
										aria-label="Close"
									>
										<X size={18} aria-hidden />
									</button>
								)}
							</header>
						)}
						<div className={styles.body}>{children}</div>
						{footer && <footer className={styles.footer}>{footer}</footer>}
					</motion.aside>
				</div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
