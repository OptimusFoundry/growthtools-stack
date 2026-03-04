import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../../utils/cn";
import styles from "./DropdownMenu.module.scss";

export type MenuItemState = "default" | "active" | "disabled";
export type MenuItemSize = "sm" | "md" | "lg";

export interface MenuItemData {
	/** Unique identifier */
	id: string;
	/** Item label */
	label: string;
	/** Optional sublabel */
	sublabel?: string;
	/** Item state */
	state?: MenuItemState;
	/** Left icon */
	leftIcon?: ReactNode;
	/** Right icon */
	rightIcon?: ReactNode;
	/** Show checkbox */
	checkbox?: boolean;
	/** Checkbox checked state */
	checked?: boolean;
	/** Keyboard shortcut */
	shortcut?: string;
	/** Click handler */
	onClick?: () => void;
}

export interface MenuDivider {
	type: "divider";
	/** Optional label for the divider */
	label?: string;
}

export type MenuItem = MenuItemData | MenuDivider;

export interface DropdownMenuProps {
	/** Array of menu items */
	items: MenuItem[];
	/** Size variant */
	size?: MenuItemSize;
	/** Caption text at the bottom */
	caption?: string;
	/** Additional className */
	className?: string;
	/** Whether the menu is open (for positioning) */
	open?: boolean;
	/** Callback when an item is clicked */
	onItemClick?: (item: MenuItemData) => void;
}

function isMenuDivider(item: MenuItem): item is MenuDivider {
	return "type" in item && item.type === "divider";
}

/**
 * DropdownMenu component for displaying a list of actions.
 *
 * @example
 * ```tsx
 * <DropdownMenu
 *   items={[
 *     { id: '1', label: 'Edit', leftIcon: <Edit /> },
 *     { type: 'divider' },
 *     { id: '2', label: 'Delete', state: 'disabled' },
 *   ]}
 * />
 * ```
 */
export const DropdownMenu = forwardRef<HTMLDivElement, DropdownMenuProps>(
	({ items, size = "md", caption, className, onItemClick }, ref) => {
		const [focusedIndex, setFocusedIndex] = useState(-1);
		const menuRef = useRef<HTMLDivElement>(null);

		const clickableItems = items.filter(
			(item) => !isMenuDivider(item) && item.state !== "disabled",
		);

		const handleKeyDown = useCallback(
			(event: React.KeyboardEvent) => {
				switch (event.key) {
					case "ArrowDown":
						event.preventDefault();
						setFocusedIndex((prev) => {
							const nextIndex = prev + 1;
							return nextIndex >= clickableItems.length ? 0 : nextIndex;
						});
						break;
					case "ArrowUp":
						event.preventDefault();
						setFocusedIndex((prev) => {
							const nextIndex = prev - 1;
							return nextIndex < 0 ? clickableItems.length - 1 : nextIndex;
						});
						break;
					case "Enter":
					case " ":
						event.preventDefault();
						if (focusedIndex >= 0 && focusedIndex < clickableItems.length) {
							const item = clickableItems[focusedIndex] as MenuItemData;
							item.onClick?.();
							onItemClick?.(item);
						}
						break;
					case "Escape":
						event.preventDefault();
						setFocusedIndex(-1);
						break;
				}
			},
			[clickableItems, focusedIndex, onItemClick],
		);

		useEffect(() => {
			if (focusedIndex >= 0) {
				const buttons = menuRef.current?.querySelectorAll(
					"button:not([disabled])",
				);
				if (buttons?.[focusedIndex]) {
					(buttons[focusedIndex] as HTMLButtonElement).focus();
				}
			}
		}, [focusedIndex]);

		return (
			<div
				ref={ref}
				className={cn(styles.dropdownMenu, styles[size], className)}
				role="menu"
				onKeyDown={handleKeyDown}
			>
				<div ref={menuRef} className={styles.items}>
					{items.map((item, index) => {
						if (isMenuDivider(item)) {
							return (
								<div
									key={`divider-${index}`}
									className={styles.divider}
									role="separator"
								>
									{item.label && (
										<span className={styles.dividerLabel}>{item.label}</span>
									)}
								</div>
							);
						}

						return (
							<DropdownMenuItem
								key={item.id}
								item={item}
								size={size}
								onClick={() => {
									item.onClick?.();
									onItemClick?.(item);
								}}
							/>
						);
					})}
				</div>
				{caption && (
					<div className={styles.caption} role="note">
						{caption}
					</div>
				)}
			</div>
		);
	},
);

interface DropdownMenuItemProps {
	item: MenuItemData;
	size: MenuItemSize;
	onClick: () => void;
}

function DropdownMenuItem({ item, size, onClick }: DropdownMenuItemProps) {
	const isDisabled = item.state === "disabled";
	const isActive = item.state === "active";

	const handleClick = useCallback(() => {
		if (!isDisabled) {
			onClick();
		}
	}, [isDisabled, onClick]);

	return (
		<button
			type="button"
			className={cn(
				styles.item,
				styles[size],
				isActive && styles.active,
				isDisabled && styles.disabled,
			)}
			onClick={handleClick}
			disabled={isDisabled}
			role="menuitem"
			aria-disabled={isDisabled}
		>
			{item.checkbox && (
				<span className={cn(styles.checkbox, item.checked && styles.checked)}>
					{item.checked && <Check />}
				</span>
			)}
			{item.leftIcon && (
				<span className={styles.leftIcon}>{item.leftIcon}</span>
			)}
			<span className={styles.labelWrapper}>
				<span className={styles.label}>{item.label}</span>
				{item.sublabel && (
					<span className={styles.sublabel}>{item.sublabel}</span>
				)}
			</span>
			{item.shortcut && (
				<span className={styles.shortcut}>{item.shortcut}</span>
			)}
			{item.rightIcon && (
				<span className={styles.rightIcon}>{item.rightIcon}</span>
			)}
		</button>
	);
}

DropdownMenu.displayName = "DropdownMenu";
