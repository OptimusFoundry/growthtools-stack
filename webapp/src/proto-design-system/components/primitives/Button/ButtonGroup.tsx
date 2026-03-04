import type { HTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import { cn } from "../../../utils/cn";
import type { ButtonSize } from "./Button.types";
import styles from "./ButtonGroup.module.scss";

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
	/** Button group content (Button or LinkButton components) */
	children: ReactNode;
	/** Size applied to all buttons in the group */
	size?: ButtonSize;
	/** Orientation of the button group */
	orientation?: "horizontal" | "vertical";
	/** Whether buttons should be visually connected */
	isAttached?: boolean;
	/** Whether the group should take full width */
	isFullWidth?: boolean;
	/** Spacing between buttons when not attached */
	spacing?: "sm" | "md" | "lg";
}

/**
 * ButtonGroup component - groups buttons together with consistent spacing.
 *
 * @example
 * ```tsx
 * <ButtonGroup>
 *   <Button>Left</Button>
 *   <Button>Center</Button>
 *   <Button>Right</Button>
 * </ButtonGroup>
 *
 * <ButtonGroup isAttached>
 *   <Button variant="outline">Bold</Button>
 *   <Button variant="outline">Italic</Button>
 *   <Button variant="outline">Underline</Button>
 * </ButtonGroup>
 * ```
 */
export const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
	(
		{
			children,
			size,
			orientation = "horizontal",
			isAttached = false,
			isFullWidth = false,
			spacing = "sm",
			className,
			role = "group",
			...props
		},
		ref,
	) => {
		const groupClasses = cn(
			styles.group,
			styles[orientation],
			styles[`spacing-${spacing}`],
			isAttached && styles.attached,
			isFullWidth && styles.fullWidth,
			size && styles[`size-${size}`],
			className,
		);

		return (
			<div ref={ref} role={role} className={groupClasses} {...props}>
				{children}
			</div>
		);
	},
);

ButtonGroup.displayName = "ButtonGroup";
