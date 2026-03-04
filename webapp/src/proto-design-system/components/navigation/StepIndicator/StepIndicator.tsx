import { Check } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "../../../utils/cn";
import styles from "./StepIndicator.module.scss";

export type StepStatus = "pending" | "active" | "completed" | "error";
export type StepIndicatorOrientation = "horizontal" | "vertical";
export type StepIndicatorSize = "sm" | "md" | "lg";

export interface StepData {
	/** Unique identifier */
	id: string;
	/** Step label */
	label: string;
	/** Optional description */
	description?: string;
	/** Step status */
	status?: StepStatus;
	/** Whether the step is clickable */
	clickable?: boolean;
}

export interface StepIndicatorProps {
	/** Array of steps */
	steps: StepData[];
	/** Current active step index (0-based) */
	currentStep?: number;
	/** Orientation */
	orientation?: StepIndicatorOrientation;
	/** Size variant */
	size?: StepIndicatorSize;
	/** Callback when a step is clicked */
	onStepClick?: (stepIndex: number, step: StepData) => void;
	/** Additional className */
	className?: string;
}

/**
 * StepIndicator component for displaying progress through a sequence.
 *
 * @example
 * ```tsx
 * <StepIndicator
 *   steps={[
 *     { id: '1', label: 'Account' },
 *     { id: '2', label: 'Profile' },
 *     { id: '3', label: 'Complete' },
 *   ]}
 *   currentStep={1}
 * />
 * ```
 */
export const StepIndicator = forwardRef<HTMLDivElement, StepIndicatorProps>(
	(
		{
			steps,
			currentStep = 0,
			orientation = "horizontal",
			size = "md",
			onStepClick,
			className,
		},
		ref,
	) => {
		const getStepStatus = (index: number, step: StepData): StepStatus => {
			if (step.status) return step.status;
			if (index < currentStep) return "completed";
			if (index === currentStep) return "active";
			return "pending";
		};

		return (
			<div
				ref={ref}
				className={cn(
					styles.stepIndicator,
					styles[orientation],
					styles[size],
					className,
				)}
				role="navigation"
				aria-label="Progress"
			>
				<ol className={styles.list}>
					{steps.map((step, index) => {
						const status = getStepStatus(index, step);
						const isClickable = step.clickable !== false && onStepClick;
						const isLast = index === steps.length - 1;

						return (
							<li key={step.id} className={cn(styles.step, styles[status])}>
								<div className={styles.stepContent}>
									<button
										type="button"
										className={cn(
											styles.stepButton,
											isClickable && styles.clickable,
										)}
										onClick={() => isClickable && onStepClick(index, step)}
										disabled={!isClickable}
										aria-current={status === "active" ? "step" : undefined}
									>
										<span className={styles.indicator}>
											{status === "completed" ? (
												<Check className={styles.checkIcon} />
											) : (
												<span className={styles.number}>{index + 1}</span>
											)}
										</span>
										<span className={styles.labelWrapper}>
											<span className={styles.label}>{step.label}</span>
											{step.description && (
												<span className={styles.description}>
													{step.description}
												</span>
											)}
										</span>
									</button>
								</div>
								{!isLast && (
									<div className={styles.connector} aria-hidden="true" />
								)}
							</li>
						);
					})}
				</ol>
			</div>
		);
	},
);

StepIndicator.displayName = "StepIndicator";
