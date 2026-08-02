import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { useMotionTokens } from "../../../context/MotionProvider";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./DropdownMenu.module.scss";

// Hoisted to module scope so a parent re-render doesn't hand AnimatePresence
// a new object identity mid-exit and restart the animation — see Banner.tsx.
const menuVariants = {
	hidden: { opacity: 0, scale: 0.95, y: -4 },
	visible: { opacity: 1, scale: 1, y: 0 },
};

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
	/**
	 * Whether the menu is open. Defaults to `true` — most callers (e.g.
	 * `Popover`) already mount/unmount `DropdownMenu` conditionally and
	 * animate that transition themselves, so an unset `open` renders
	 * unconditionally, matching prior behavior. Pass it explicitly when
	 * `DropdownMenu` is mounted once and toggled in place, so its own
	 * enter/exit animation has something to react to.
	 */
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
	(
		{ items, size = "md", caption, className, open = true, onItemClick },
		ref,
	) => {
		const [focusedIndex, setFocusedIndex] = useState(-1);
		const menuRef = useRef<HTMLDivElement>(null);
		const prefersReducedMotion = useReducedMotion();
		const motionTokens = useMotionTokens();

		const transition = prefersReducedMotion
			? { duration: 0 }
			: { duration: motionTokens.duration.fast, ease: motionTokens.easeOut };

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
			<AnimatePresence>
				{open && (
					<motion.div
						ref={ref}
						className={cn(
							styles.dropdownMenu,
							styles[`size-${size}`],
							className,
						)}
						role="menu"
						onKeyDown={handleKeyDown}
						variants={menuVariants}
						initial="hidden"
						animate="visible"
						exit="hidden"
						transition={transition}
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
												<span className={styles.dividerLabel}>
													{item.label}
												</span>
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
					</motion.div>
				)}
			</AnimatePresence>
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
				styles[`size-${size}`],
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
