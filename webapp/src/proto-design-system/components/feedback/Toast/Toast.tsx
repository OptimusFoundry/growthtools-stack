import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Toast.module.scss";

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
export function Toast({
	variant = "default",
	title,
	children,
	closable = true,
	onClose,
	action,
	className,
}: ToastProps) {
	const prefersReducedMotion = useReducedMotion();

	// Animation variants - slide in from right with fade
	const toastVariants = {
		hidden: { opacity: 0, x: 24, scale: 0.95 },
		visible: { opacity: 1, x: 0, scale: 1 },
	};

	const transition = prefersReducedMotion
		? { duration: 0 }
		: { duration: 0.2, ease: [0, 0, 0.2, 1] };

	return (
		<motion.output
			className={cn(styles.toast, styles[variant], className)}
			aria-live="polite"
			variants={toastVariants}
			initial="hidden"
			animate="visible"
			exit="hidden"
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
}

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
	return (
		<div className={cn(styles.container, styles[position], className)}>
			{children}
		</div>
	);
}

ToastContainer.displayName = "ToastContainer";
