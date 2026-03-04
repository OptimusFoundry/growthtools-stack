import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Alert.module.scss";

export type AlertVariant = "info" | "success" | "warning" | "error";

export interface AlertProps {
	/** Alert variant */
	variant?: AlertVariant;
	/** Alert title */
	title?: string;
	/** Alert content */
	children: ReactNode;
	/** Show icon */
	icon?: boolean;
	/** Custom icon */
	customIcon?: ReactNode;
	/** Dismissible alert */
	dismissible?: boolean;
	/** Dismiss callback */
	onDismiss?: () => void;
	/** Additional className */
	className?: string;
}

const variantIcons: Record<AlertVariant, ReactNode> = {
	info: <Info />,
	success: <CheckCircle />,
	warning: <AlertCircle />,
	error: <XCircle />,
};

/**
 * Alert component for displaying important messages.
 *
 * @example
 * ```tsx
 * <Alert variant="success" title="Success!">
 *   Your changes have been saved.
 * </Alert>
 * ```
 */
export function Alert({
	variant = "info",
	title,
	children,
	icon = true,
	customIcon,
	dismissible = false,
	onDismiss,
	className,
}: AlertProps) {
	const iconElement = customIcon || variantIcons[variant];
	const prefersReducedMotion = useReducedMotion();

	// Animation variants - fade in with slight scale
	const alertVariants = {
		hidden: { opacity: 0, scale: 0.98, y: -8 },
		visible: { opacity: 1, scale: 1, y: 0 },
	};

	const transition = prefersReducedMotion
		? { duration: 0 }
		: { duration: 0.2, ease: [0, 0, 0.2, 1] };

	return (
		<motion.div
			className={cn(styles.alert, styles[variant], className)}
			role="alert"
			variants={alertVariants}
			initial="hidden"
			animate="visible"
			exit="hidden"
			transition={transition}
		>
			{icon && <div className={styles.icon}>{iconElement}</div>}
			<div className={styles.content}>
				{title && <div className={styles.title}>{title}</div>}
				<div className={styles.message}>{children}</div>
			</div>
			{dismissible && (
				<button
					type="button"
					className={styles.dismiss}
					onClick={onDismiss}
					aria-label="Dismiss alert"
				>
					<X />
				</button>
			)}
		</motion.div>
	);
}

Alert.displayName = "Alert";
