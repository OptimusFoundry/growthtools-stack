import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	cloneElement,
	isValidElement,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Popover.module.scss";

export type PopoverPlacement = "top" | "bottom" | "left" | "right";
export type PopoverAlign = "start" | "center" | "end";

export interface PopoverProps {
	/** Trigger element */
	trigger: ReactNode;
	/** Popover content */
	children: ReactNode;
	/** Placement relative to trigger */
	placement?: PopoverPlacement;
	/** Alignment relative to trigger */
	align?: PopoverAlign;
	/** Show close button */
	showClose?: boolean;
	/** Popover title */
	title?: ReactNode;
	/** Controlled open state */
	open?: boolean;
	/** Open state change handler */
	onOpenChange?: (open: boolean) => void;
	/** Close on click outside */
	closeOnClickOutside?: boolean;
	/** Close on escape key */
	closeOnEscape?: boolean;
	/** Trap focus inside popover */
	trapFocus?: boolean;
	/** Additional className for popover */
	className?: string;
	/** Additional className for trigger wrapper */
	triggerClassName?: string;
}

/**
 * Popover component for displaying floating content.
 *
 * @example
 * ```tsx
 * <Popover
 *   trigger={<Button>Open popover</Button>}
 *   title="Popover Title"
 * >
 *   <p>Popover content goes here.</p>
 * </Popover>
 * ```
 */
export function Popover({
	trigger,
	children,
	placement = "bottom",
	align = "center",
	showClose = false,
	title,
	open: controlledOpen,
	onOpenChange,
	closeOnClickOutside = true,
	closeOnEscape = true,
	trapFocus = true,
	className,
	triggerClassName,
}: PopoverProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = controlledOpen !== undefined;
	const isOpen = isControlled ? controlledOpen : internalOpen;
	const prefersReducedMotion = useReducedMotion();

	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLElement>(null);

	// Animation configuration based on placement
	const getAnimationVariants = () => {
		const offset = 4;
		const variants = {
			top: { hidden: { opacity: 0, y: offset }, visible: { opacity: 1, y: 0 } },
			bottom: {
				hidden: { opacity: 0, y: -offset },
				visible: { opacity: 1, y: 0 },
			},
			left: {
				hidden: { opacity: 0, x: offset },
				visible: { opacity: 1, x: 0 },
			},
			right: {
				hidden: { opacity: 0, x: -offset },
				visible: { opacity: 1, x: 0 },
			},
		};
		return variants[placement];
	};

	const contentVariants = getAnimationVariants();
	const transition = prefersReducedMotion
		? { duration: 0 }
		: { duration: 0.15, ease: [0, 0, 0.2, 1] };

	const setOpen = useCallback(
		(value: boolean) => {
			if (!isControlled) {
				setInternalOpen(value);
			}
			onOpenChange?.(value);
		},
		[isControlled, onOpenChange],
	);

	const handleToggle = useCallback(() => {
		setOpen(!isOpen);
	}, [isOpen, setOpen]);

	const handleClose = useCallback(() => {
		setOpen(false);
	}, [setOpen]);

	// Close on click outside
	useEffect(() => {
		if (!closeOnClickOutside || !isOpen) return;

		const handleClickOutside = (e: MouseEvent | TouchEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				handleClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("touchstart", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("touchstart", handleClickOutside);
		};
	}, [closeOnClickOutside, isOpen, handleClose]);

	// Focus trap - focus first element when opening
	useEffect(() => {
		if (!trapFocus || !isOpen || !contentRef.current) return;

		const focusableElements = contentRef.current.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);

		if (focusableElements.length > 0) {
			focusableElements[0]?.focus();
		}
	}, [trapFocus, isOpen]);

	// Handle escape key
	useEffect(() => {
		if (!closeOnEscape || !isOpen) return;

		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape") {
				handleClose();
				triggerRef.current?.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [closeOnEscape, isOpen, handleClose]);

	// Handle trigger keyboard events
	const handleTriggerKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleToggle();
			}
		},
		[handleToggle],
	);

	// Clone trigger to add props
	const renderTrigger = () => {
		if (!isValidElement(trigger)) {
			return (
				<button
					type="button"
					className={cn(styles.triggerWrapper, triggerClassName)}
					onClick={handleToggle}
					onKeyDown={handleTriggerKeyDown}
					aria-expanded={isOpen}
					aria-haspopup="dialog"
				>
					{trigger}
				</button>
			);
		}

		return cloneElement(
			trigger as React.ReactElement<Record<string, unknown>>,
			{
				ref: triggerRef,
				onClick: (e: React.MouseEvent) => {
					handleToggle();
					const originalOnClick = (
						trigger as React.ReactElement<Record<string, unknown>>
					).props?.onClick;
					if (typeof originalOnClick === "function") {
						originalOnClick(e);
					}
				},
				onKeyDown: (e: KeyboardEvent) => {
					handleTriggerKeyDown(e);
					const originalOnKeyDown = (
						trigger as React.ReactElement<Record<string, unknown>>
					).props?.onKeyDown;
					if (typeof originalOnKeyDown === "function") {
						originalOnKeyDown(e);
					}
				},
				"aria-expanded": isOpen,
				"aria-haspopup": "dialog",
			},
		);
	};

	return (
		<div ref={containerRef} className={styles.popover}>
			{renderTrigger()}

			<AnimatePresence>
				{isOpen && (
					<motion.div
						ref={contentRef}
						className={cn(
							styles.content,
							styles[`placement-${placement}`],
							styles[`align-${align}`],
							className,
						)}
						role="dialog"
						aria-modal={trapFocus}
						variants={contentVariants}
						initial="hidden"
						animate="visible"
						exit="hidden"
						transition={transition}
					>
						{(title || showClose) && (
							<div className={styles.header}>
								{title && <div className={styles.title}>{title}</div>}
								{showClose && (
									<button
										type="button"
										className={styles.closeButton}
										onClick={handleClose}
										aria-label="Close popover"
									>
										<X />
									</button>
								)}
							</div>
						)}
						<div className={styles.body}>{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

Popover.displayName = "Popover";
