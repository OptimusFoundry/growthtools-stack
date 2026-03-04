import { TrendingDown, TrendingUp } from "lucide-react";
import { motion, useSpring, useTransform } from "motion/react";
import { type ReactNode, useEffect } from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./StatCard.module.scss";

export type StatCardVariant = "default" | "outlined" | "filled";
export type TrendDirection = "up" | "down" | "neutral";

export interface StatCardProps {
	/** Stat label/title */
	label: string;
	/** Stat value */
	value: ReactNode;
	/** Numeric value for count-up animation (overrides value when provided) */
	numericValue?: number;
	/** Format function for numeric value (e.g., to add currency symbol) */
	formatValue?: (value: number) => string;
	/** Previous value or comparison */
	previousValue?: string;
	/** Trend direction */
	trend?: TrendDirection;
	/** Trend percentage */
	trendValue?: string;
	/** Optional icon */
	icon?: ReactNode;
	/** Visual variant */
	variant?: StatCardVariant;
	/** Additional description */
	description?: string;
	/** Click handler */
	onClick?: () => void;
	/** Additional className */
	className?: string;
}

// Animated number display component
function AnimatedValue({
	value,
	formatValue,
}: {
	value: number;
	formatValue?: (value: number) => string;
}) {
	const prefersReducedMotion = useReducedMotion();

	const springValue = useSpring(0, {
		stiffness: 100,
		damping: 20,
		mass: 1,
	});

	const displayValue = useTransform(springValue, (latest) => {
		const rounded = Math.round(latest);
		return formatValue ? formatValue(rounded) : rounded.toLocaleString();
	});

	useEffect(() => {
		if (prefersReducedMotion) {
			springValue.jump(value);
		} else {
			springValue.set(value);
		}
	}, [value, springValue, prefersReducedMotion]);

	return <motion.span>{displayValue}</motion.span>;
}

/**
 * StatCard component for displaying statistics and metrics.
 *
 * @example
 * ```tsx
 * <StatCard
 *   label="Total Revenue"
 *   value="$45,231.89"
 *   trend="up"
 *   trendValue="+12.5%"
 *   description="vs last month"
 * />
 *
 * // With animated count-up
 * <StatCard
 *   label="Users"
 *   numericValue={1234}
 *   trend="up"
 *   trendValue="+5%"
 * />
 * ```
 */
export function StatCard({
	label,
	value,
	numericValue,
	formatValue,
	previousValue,
	trend,
	trendValue,
	icon,
	variant = "default",
	description,
	onClick,
	className,
}: StatCardProps) {
	const Component = onClick ? "button" : "div";

	// Use animated value if numericValue is provided
	const displayValue =
		numericValue !== undefined ? (
			<AnimatedValue value={numericValue} formatValue={formatValue} />
		) : (
			value
		);

	return (
		<Component
			className={cn(
				styles.card,
				styles[variant],
				onClick && styles.clickable,
				className,
			)}
			onClick={onClick}
			type={onClick ? "button" : undefined}
		>
			<div className={styles.header}>
				<span className={styles.label}>{label}</span>
				{icon && <span className={styles.icon}>{icon}</span>}
			</div>

			<div className={styles.valueRow}>
				<span className={styles.value}>{displayValue}</span>
				{trend && trendValue && (
					<span className={cn(styles.trend, styles[`trend-${trend}`])}>
						{trend === "up" && <TrendingUp />}
						{trend === "down" && <TrendingDown />}
						{trendValue}
					</span>
				)}
			</div>

			{(description || previousValue) && (
				<div className={styles.footer}>
					{previousValue && (
						<span className={styles.previousValue}>{previousValue}</span>
					)}
					{description && (
						<span className={styles.description}>{description}</span>
					)}
				</div>
			)}
		</Component>
	);
}

StatCard.displayName = "StatCard";
