import { motion, type Variants } from "motion/react";
import { forwardRef } from "react";
import { useMotionConfig } from "../../../hooks/useMotionConfig";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Button.module.scss";
import type { ButtonProps } from "./Button.types";

const buttonVariants: Variants = {
	idle: { scale: 1 },
	hover: { scale: 1.02 },
	tap: { scale: 0.98 },
};

/**
 * Button component with multiple variants, sizes, and states.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="ghost" leftIcon={<IconPlus />}>Add item</Button>
 * <Button isLoading>Submitting...</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			variant = "default",
			size = "md",
			isLoading = false,
			isFullWidth = false,
			isIconOnly = false,
			leftIcon,
			rightIcon,
			children,
			className,
			disabled,
			type = "button",
			onClick,
			onFocus,
			onBlur,
			onKeyDown,
			onKeyUp,
			onMouseEnter,
			onMouseLeave,
			style,
			id,
			name,
			form,
			formAction,
			formMethod,
			formTarget,
			formNoValidate,
			formEncType,
			tabIndex,
			"aria-label": ariaLabel,
			"aria-labelledby": ariaLabelledBy,
			"aria-describedby": ariaDescribedBy,
			"aria-expanded": ariaExpanded,
			"aria-haspopup": ariaHaspopup,
			"aria-controls": ariaControls,
			"aria-pressed": ariaPressed,
			...rest
		},
		ref,
	) => {
		const prefersReducedMotion = useReducedMotion();
		const { springConfig } = useMotionConfig();

		const isDisabled = disabled || isLoading;

		const buttonClasses = cn(
			styles.button,
			styles[variant],
			styles[size],
			isFullWidth && styles.fullWidth,
			isIconOnly && styles.iconOnly,
			isLoading && styles.loading,
			className,
		);

		// Filter out undefined values from rest props
		const filteredRest = Object.fromEntries(
			Object.entries(rest).filter(([, v]) => v !== undefined),
		);

		return (
			<motion.button
				ref={ref}
				type={type}
				className={buttonClasses}
				variants={prefersReducedMotion ? undefined : buttonVariants}
				initial="idle"
				whileHover={isDisabled ? undefined : "hover"}
				whileTap={isDisabled ? undefined : "tap"}
				transition={springConfig}
				disabled={isDisabled}
				aria-disabled={isDisabled}
				aria-busy={isLoading}
				aria-label={ariaLabel}
				aria-labelledby={ariaLabelledBy}
				aria-describedby={ariaDescribedBy}
				aria-expanded={ariaExpanded}
				aria-haspopup={ariaHaspopup}
				aria-controls={ariaControls}
				aria-pressed={ariaPressed}
				onClick={onClick}
				onFocus={onFocus}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
				onKeyUp={onKeyUp}
				onMouseEnter={onMouseEnter}
				onMouseLeave={onMouseLeave}
				style={style}
				id={id}
				name={name}
				form={form}
				formAction={formAction}
				formMethod={formMethod}
				formTarget={formTarget}
				formNoValidate={formNoValidate}
				formEncType={formEncType}
				tabIndex={tabIndex}
				{...filteredRest}
			>
				{isLoading && <span className={styles.spinner} aria-hidden="true" />}
				<span className={styles.content}>
					{leftIcon && (
						<span className={styles.icon} aria-hidden="true">
							{leftIcon}
						</span>
					)}
					{children}
					{rightIcon && (
						<span className={styles.icon} aria-hidden="true">
							{rightIcon}
						</span>
					)}
				</span>
			</motion.button>
		);
	},
);

Button.displayName = "Button";
