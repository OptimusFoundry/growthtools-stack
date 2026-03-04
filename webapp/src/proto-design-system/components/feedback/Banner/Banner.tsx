import {
	AlertCircle,
	CheckCircle,
	Info,
	Sparkles,
	X,
	XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Banner.module.scss";

export type BannerType = "info" | "success" | "warning" | "error" | "feature";
export type BannerVariant = "filled" | "light" | "lighter" | "stroke";

export interface BannerProps {
	/** Banner type */
	type?: BannerType;
	/** Visual variant */
	variant?: BannerVariant;
	/** Title text */
	title: string;
	/** Description text */
	description?: string;
	/** Custom icon */
	icon?: ReactNode;
	/** Action element (button or link) */
	action?: ReactNode;
	/** Whether the banner can be dismissed */
	dismissible?: boolean;
	/** Callback when dismissed */
	onDismiss?: () => void;
	/** Enable enter/exit animations */
	animate?: boolean;
	/** Additional className */
	className?: string;
}

const typeIcons: Record<BannerType, ReactNode> = {
	info: <Info />,
	success: <CheckCircle />,
	warning: <AlertCircle />,
	error: <XCircle />,
	feature: <Sparkles />,
};

/**
 * Banner component for page-level notifications.
 *
 * @example
 * ```tsx
 * <Banner
 *   type="info"
 *   variant="filled"
 *   title="New feature available"
 *   description="Check out our latest update"
 * />
 * ```
 */
export function Banner({
	type = "info",
	variant = "light",
	title,
	description,
	icon,
	action,
	dismissible = true,
	onDismiss,
	animate = false,
	className,
}: BannerProps) {
	const prefersReducedMotion = useReducedMotion();

	// Animation variants - slide down with fade
	const bannerVariants = {
		hidden: { opacity: 0, y: -8 },
		visible: { opacity: 1, y: 0 },
	};

	const transition =
		prefersReducedMotion || !animate
			? { duration: 0 }
			: { duration: 0.2, ease: [0, 0, 0.2, 1] };

	const iconElement = icon || typeIcons[type];

	return (
		<motion.div
			className={cn(styles.banner, styles[type], styles[variant], className)}
			role="alert"
			variants={bannerVariants}
			initial={animate ? "hidden" : "visible"}
			animate="visible"
			exit="hidden"
			transition={transition}
		>
			<div className={styles.content}>
				<div className={styles.icon}>{iconElement}</div>
				<div className={styles.text}>
					<span className={styles.title}>{title}</span>
					{description && (
						<>
							<span className={styles.separator} aria-hidden="true">
								&bull;
							</span>
							<span className={styles.description}>{description}</span>
						</>
					)}
				</div>
				{action && <div className={styles.action}>{action}</div>}
			</div>
			{dismissible && (
				<button
					type="button"
					className={styles.dismissButton}
					onClick={onDismiss}
					aria-label="Dismiss banner"
				>
					<X />
				</button>
			)}
		</motion.div>
	);
}

Banner.displayName = "Banner";
