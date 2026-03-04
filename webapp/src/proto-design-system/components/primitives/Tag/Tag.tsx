import { X } from "lucide-react";
import type { ReactNode } from "react";
import { forwardRef, useCallback, useState } from "react";
import { cn } from "../../../utils/cn";
import styles from "./Tag.module.scss";

export type TagVariant =
	| "default"
	| "primary"
	| "secondary"
	| "success"
	| "warning"
	| "error"
	| "info";
export type TagSize = "sm" | "md" | "lg";

export interface TagProps {
	/** Tag content */
	children: ReactNode;
	/** Visual variant */
	variant?: TagVariant;
	/** Size of the tag */
	size?: TagSize;
	/** Whether the tag is selectable */
	selectable?: boolean;
	/** Whether the tag is selected (controlled) */
	selected?: boolean;
	/** Default selected state (uncontrolled) */
	defaultSelected?: boolean;
	/** Callback when selection changes */
	onSelectChange?: (selected: boolean) => void;
	/** Whether the tag can be removed */
	removable?: boolean;
	/** Callback when remove button is clicked */
	onRemove?: () => void;
	/** Whether the tag is disabled */
	disabled?: boolean;
	/** Left icon */
	leftIcon?: ReactNode;
	/** Avatar or image URL */
	avatar?: string;
	/** Additional className */
	className?: string;
}

/**
 * Tag component for displaying labels, categories, or removable items.
 *
 * @example
 * ```tsx
 * <Tag>Default</Tag>
 * <Tag variant="primary" removable onRemove={() => {}}>Removable</Tag>
 * <Tag selectable>Selectable</Tag>
 * ```
 */
export const Tag = forwardRef<HTMLDivElement, TagProps>(
	(
		{
			children,
			variant = "default",
			size = "md",
			selectable = false,
			selected: controlledSelected,
			defaultSelected = false,
			onSelectChange,
			removable = false,
			onRemove,
			disabled = false,
			leftIcon,
			avatar,
			className,
		},
		ref,
	) => {
		const [internalSelected, setInternalSelected] = useState(defaultSelected);

		const isControlled = controlledSelected !== undefined;
		const isSelected = isControlled ? controlledSelected : internalSelected;

		const handleClick = useCallback(() => {
			if (disabled || !selectable) return;

			const newSelected = !isSelected;
			if (!isControlled) {
				setInternalSelected(newSelected);
			}
			onSelectChange?.(newSelected);
		}, [disabled, selectable, isSelected, isControlled, onSelectChange]);

		const handleRemove = useCallback(
			(event: React.MouseEvent) => {
				event.stopPropagation();
				if (disabled) return;
				onRemove?.();
			},
			[disabled, onRemove],
		);

		const handleKeyDown = useCallback(
			(event: React.KeyboardEvent) => {
				if (disabled) return;

				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					if (selectable) {
						handleClick();
					}
				} else if (event.key === "Delete" || event.key === "Backspace") {
					if (removable) {
						onRemove?.();
					}
				}
			},
			[disabled, selectable, removable, handleClick, onRemove],
		);

		const tagClasses = cn(
			styles.tag,
			styles[variant],
			styles[size],
			selectable && styles.selectable,
			isSelected && styles.selected,
			disabled && styles.disabled,
			className,
		);

		return (
			<div
				ref={ref}
				className={tagClasses}
				onClick={selectable ? handleClick : undefined}
				onKeyDown={handleKeyDown}
				tabIndex={disabled ? -1 : selectable || removable ? 0 : undefined}
				role={selectable ? "button" : undefined}
				aria-pressed={selectable ? isSelected : undefined}
				aria-disabled={disabled}
			>
				{avatar && <img src={avatar} alt="" className={styles.avatar} />}
				{leftIcon && !avatar && <span className={styles.icon}>{leftIcon}</span>}
				<span className={styles.text}>{children}</span>
				{removable && (
					<button
						type="button"
						className={styles.removeButton}
						onClick={handleRemove}
						disabled={disabled}
						aria-label="Remove tag"
						tabIndex={-1}
					>
						<X />
					</button>
				)}
			</div>
		);
	},
);

Tag.displayName = "Tag";
