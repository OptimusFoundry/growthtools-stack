import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { memo, type ReactNode, useMemo } from "react";
import { createPortal } from "react-dom";
import { useMotionTokens } from "../../../context/MotionProvider";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Toast.module.scss";

// Animation target values - slide in from right with fade. Passed directly
// as `initial`/`animate`/`exit` target-value objects below (not Motion's
// named `variants` prop), which skips variant-name string resolution
// entirely. Still hoisted to module scope so the object reference is stable
// across renders; motion re-evaluates/restarts an in-progress transition if
// it receives a brand new target-value/`transition` object on every parent
// re-render.
const TOAST_VARIANTS = {
	hidden: { opacity: 0, x: 24, scale: 0.95 },
	visible: { opacity: 1, x: 0, scale: 1 },
} as const;

const TOAST_TRANSITION_REDUCED = { duration: 0 } as const;

export type ToastVariant = "default" | "success" | "warning" | "error";
export type ToastPosition =
	| "top-right"
	| "top-left"
	| "bottom-right"
	| "bottom-left"
	| "top-center"
	| "bottom-center";

export interface ToastProps {
	/** Toast variant */
	variant?: ToastVariant;
	/** Toast title */
	title?: string;
	/** Toast content */
	children: ReactNode;
	/** Show close button */
	closable?: boolean;
	/** Close callback */
	onClose?: () => void;
	/** Action button */
	action?: ReactNode;
	/** Additional className */
	className?: string;
}

const variantIcons: Record<ToastVariant, ReactNode> = {
	default: <Info />,
	success: <CheckCircle />,
	warning: <AlertCircle />,
	error: <XCircle />,
};

/**
 * Toast component for transient notifications.
 *
 * @example
 * ```tsx
 * <Toast variant="success" title="Saved!">
 *   Your changes have been saved.
 * </Toast>
 * ```
 */
export const Toast = memo(function Toast({
	variant = "default",
	title,
	children,
	closable = true,
	onClose,
	action,
	className,
}: ToastProps) {
	const prefersReducedMotion = useReducedMotion();
	const motionTokens = useMotionTokens();

	const transition = useMemo(
		() =>
			prefersReducedMotion
				? TOAST_TRANSITION_REDUCED
				: {
						duration: motionTokens.duration.normal,
						ease: motionTokens.easeOut,
					},
		[prefersReducedMotion, motionTokens],
	);

	return (
		<motion.output
			className={cn(styles.toast, styles[variant], className)}
			aria-live="polite"
			initial={TOAST_VARIANTS.hidden}
			animate={TOAST_VARIANTS.visible}
			exit={TOAST_VARIANTS.hidden}
			transition={transition}
		>
			<div className={styles.icon}>{variantIcons[variant]}</div>
			<div className={styles.content}>
				{title && <div className={styles.title}>{title}</div>}
				<div className={styles.message}>{children}</div>
			</div>
			{action && <div className={styles.action}>{action}</div>}
			{closable && (
				<button
					type="button"
					className={styles.close}
					onClick={onClose}
					aria-label="Close notification"
				>
					<X />
				</button>
			)}
		</motion.output>
	);
});

Toast.displayName = "Toast";

// Toast Container for positioning
export interface ToastContainerProps {
	/** Position of toasts */
	position?: ToastPosition;
	/** Toast items */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

export function ToastContainer({
	position = "bottom-right",
	children,
	className,
}: ToastContainerProps) {
	if (typeof document === "undefined") return null;

	return createPortal(
		<div className={cn(styles.container, styles[position], className)}>
			{children}
		</div>,
		document.body,
	);
}

ToastContainer.displayName = "ToastContainer";
