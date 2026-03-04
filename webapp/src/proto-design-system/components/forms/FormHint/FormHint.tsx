import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./FormHint.module.scss";

export type FormHintVariant = "default" | "error" | "success";

export interface FormHintProps {
	/** Hint text content */
	children: ReactNode;
	/** Visual variant */
	variant?: FormHintVariant;
	/** Show icon prefix */
	showIcon?: boolean;
	/** Custom icon (overrides default) */
	icon?: ReactNode;
	/** Associated input ID for aria-describedby */
	id?: string;
	/** Hidden state */
	hidden?: boolean;
	/** Additional className */
	className?: string;
}

const defaultIcons: Record<FormHintVariant, ReactNode> = {
	default: <Info size={14} />,
	error: <AlertCircle size={14} />,
	success: <CheckCircle2 size={14} />,
};

/**
 * FormHint component for displaying helper text, errors, or success messages.
 *
 * @example
 * ```tsx
 * <FormHint>Enter your email address</FormHint>
 * <FormHint variant="error" showIcon>This field is required</FormHint>
 * <FormHint variant="success" showIcon>Username is available</FormHint>
 * ```
 */
export function FormHint({
	children,
	variant = "default",
	showIcon = false,
	icon,
	id,
	hidden = false,
	className,
}: FormHintProps) {
	if (hidden) return null;

	const iconElement = icon ?? (showIcon ? defaultIcons[variant] : null);

	return (
		<p
			id={id}
			className={cn(styles.hint, styles[variant], className)}
			role={variant === "error" ? "alert" : undefined}
		>
			{iconElement && <span className={styles.icon}>{iconElement}</span>}
			<span className={styles.text}>{children}</span>
		</p>
	);
}

FormHint.displayName = "FormHint";
