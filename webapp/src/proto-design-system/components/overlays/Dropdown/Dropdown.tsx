import { Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Dropdown.module.scss";

export type DropdownSize = "sm" | "md" | "lg";
export type DropdownVariant = "default" | "outline" | "ghost";

export interface DropdownItem {
	/** Unique identifier */
	id: string;
	/** Display label */
	label: ReactNode;
	/** Description/sublabel */
	description?: string;
	/** Leading icon */
	icon?: ReactNode;
	/** Disabled state */
	disabled?: boolean;
	/** Danger/destructive action */
	danger?: boolean;
	/** Divider after this item */
	divider?: boolean;
}

export interface DropdownProps {
	/** Dropdown items */
	items: DropdownItem[];
	/** Selected item ID */
	value?: string;
	/** Selection change handler */
	onChange?: (id: string) => void;
	/** Trigger content */
	trigger?: ReactNode;
	/** Placeholder text */
	placeholder?: string;
	/** Dropdown size */
	size?: DropdownSize;
	/** Dropdown variant */
	variant?: DropdownVariant;
	/** Disabled state */
	disabled?: boolean;
	/** Full width */
	fullWidth?: boolean;
	/** Align dropdown menu */
	align?: "start" | "end";
	/** Additional className */
	className?: string;
}

/**
 * Dropdown component for selecting from a list of options.
 *
 * @example
 * ```tsx
 * <Dropdown
 *   items={[
 *     { id: "edit", label: "Edit", icon: <EditIcon /> },
 *     { id: "delete", label: "Delete", danger: true },
 *   ]}
 *   value={selected}
 *   onChange={setSelected}
 *   placeholder="Select action..."
 * />
 * ```
 */
export function Dropdown({
	items,
	value,
	onChange,
	trigger,
	placeholder = "Select...",
	size = "md",
	variant = "default",
	disabled = false,
	fullWidth = false,
	align = "start",
	className,
}: DropdownProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(-1);
	const containerRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLUListElement>(null);
	const prefersReducedMotion = useReducedMotion();

	const selectedItem = items.find((item) => item.id === value);
	const enabledItems = items.filter((item) => !item.disabled);

	// Animation variants
	const menuVariants = {
		hidden: { opacity: 0, scale: 0.95, y: -4 },
		visible: { opacity: 1, scale: 1, y: 0 },
	};

	const transition = prefersReducedMotion
		? { duration: 0 }
		: { duration: 0.15, ease: [0, 0, 0.2, 1] };

	// Handle click outside
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent | TouchEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("touchstart", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("touchstart", handleClickOutside);
		};
	}, [isOpen]);

	// Reset focus when opening - only highlight selected item, not first item
	useEffect(() => {
		if (isOpen) {
			const selectedIndex = items.findIndex((item) => item.id === value);
			setFocusedIndex(selectedIndex >= 0 ? selectedIndex : -1);
		} else {
			setFocusedIndex(-1);
		}
	}, [isOpen, items, value]);

	// Focus menu item when focusedIndex changes
	useEffect(() => {
		if (isOpen && focusedIndex >= 0 && menuRef.current) {
			const menuItems = menuRef.current.querySelectorAll(
				'[role="menuitem"]:not([aria-disabled="true"])',
			);
			const item = menuItems[focusedIndex] as HTMLElement | undefined;
			item?.focus();
		}
	}, [isOpen, focusedIndex]);

	const handleToggle = useCallback(() => {
		if (!disabled) {
			setIsOpen((prev) => !prev);
		}
	}, [disabled]);

	const handleSelect = useCallback(
		(id: string) => {
			onChange?.(id);
			setIsOpen(false);
		},
		[onChange],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (disabled) return;

			switch (e.key) {
				case "Enter":
				case " ":
					e.preventDefault();
					if (!isOpen) {
						setIsOpen(true);
					} else if (focusedIndex >= 0) {
						const item = enabledItems[focusedIndex];
						if (item) {
							handleSelect(item.id);
						}
					}
					break;
				case "Escape":
					e.preventDefault();
					setIsOpen(false);
					break;
				case "ArrowDown":
					e.preventDefault();
					if (!isOpen) {
						setIsOpen(true);
					} else {
						setFocusedIndex((prev) =>
							prev < enabledItems.length - 1 ? prev + 1 : 0,
						);
					}
					break;
				case "ArrowUp":
					e.preventDefault();
					if (!isOpen) {
						setIsOpen(true);
					} else {
						setFocusedIndex((prev) =>
							prev > 0 ? prev - 1 : enabledItems.length - 1,
						);
					}
					break;
				case "Tab":
					if (isOpen) {
						e.preventDefault();
						if (e.shiftKey) {
							// Shift+Tab: move to previous item
							setFocusedIndex((prev) =>
								prev > 0 ? prev - 1 : enabledItems.length - 1,
							);
						} else {
							// Tab: move to next item
							setFocusedIndex((prev) =>
								prev < enabledItems.length - 1 ? prev + 1 : 0,
							);
						}
					}
					break;
				case "Home":
					e.preventDefault();
					if (isOpen) {
						setFocusedIndex(0);
					}
					break;
				case "End":
					e.preventDefault();
					if (isOpen) {
						setFocusedIndex(enabledItems.length - 1);
					}
					break;
			}
		},
		[disabled, isOpen, focusedIndex, enabledItems, handleSelect],
	);

	const handleItemKeyDown = useCallback(
		(e: KeyboardEvent, item: DropdownItem) => {
			switch (e.key) {
				case "Enter":
				case " ":
					e.preventDefault();
					if (!item.disabled) {
						handleSelect(item.id);
					}
					break;
				case "Tab":
					e.preventDefault();
					if (e.shiftKey) {
						setFocusedIndex((prev) =>
							prev > 0 ? prev - 1 : enabledItems.length - 1,
						);
					} else {
						setFocusedIndex((prev) =>
							prev < enabledItems.length - 1 ? prev + 1 : 0,
						);
					}
					break;
				case "ArrowDown":
					e.preventDefault();
					setFocusedIndex((prev) =>
						prev < enabledItems.length - 1 ? prev + 1 : 0,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setFocusedIndex((prev) =>
						prev > 0 ? prev - 1 : enabledItems.length - 1,
					);
					break;
				case "Escape":
					e.preventDefault();
					setIsOpen(false);
					break;
				case "Home":
					e.preventDefault();
					setFocusedIndex(0);
					break;
				case "End":
					e.preventDefault();
					setFocusedIndex(enabledItems.length - 1);
					break;
			}
		},
		[handleSelect, enabledItems.length],
	);

	return (
		<div
			ref={containerRef}
			className={cn(
				styles.dropdown,
				styles[`size-${size}`],
				fullWidth && styles.fullWidth,
				className,
			)}
		>
			<button
				type="button"
				className={cn(
					styles.trigger,
					styles[variant],
					isOpen && styles.open,
					disabled && styles.disabled,
				)}
				onClick={handleToggle}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
			>
				{trigger || (
					<span className={styles.triggerContent}>
						{selectedItem?.icon && (
							<span className={styles.triggerIcon}>{selectedItem.icon}</span>
						)}
						<span
							className={cn(
								styles.triggerLabel,
								!selectedItem && styles.placeholder,
							)}
						>
							{selectedItem?.label || placeholder}
						</span>
						<ChevronDown
							className={cn(styles.chevron, isOpen && styles.rotated)}
						/>
					</span>
				)}
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.ul
						ref={menuRef}
						className={cn(styles.menu, styles[`align-${align}`])}
						role="listbox"
						aria-activedescendant={
							focusedIndex >= 0
								? `dropdown-item-${enabledItems[focusedIndex]?.id}`
								: undefined
						}
						variants={menuVariants}
						initial="hidden"
						animate="visible"
						exit="hidden"
						transition={transition}
					>
						{items.map((item, index) => {
							const isSelected = item.id === value;
							const isFocused = enabledItems.indexOf(item) === focusedIndex;

							return (
								<li key={item.id}>
									<button
										type="button"
										id={`dropdown-item-${item.id}`}
										className={cn(
											styles.item,
											isSelected && styles.selected,
											isFocused && styles.focused,
											item.disabled && styles.disabled,
											item.danger && styles.danger,
											item.description && styles.hasDescription,
										)}
										role="menuitem"
										aria-selected={isSelected}
										aria-disabled={item.disabled}
										onClick={() => !item.disabled && handleSelect(item.id)}
										onKeyDown={(e) => handleItemKeyDown(e, item)}
										tabIndex={isFocused ? 0 : -1}
									>
										{item.icon && (
											<span className={styles.itemIcon}>{item.icon}</span>
										)}
										<span className={styles.itemContent}>
											<span className={styles.itemLabel}>{item.label}</span>
											{item.description && (
												<span className={styles.itemDescription}>
													{item.description}
												</span>
											)}
										</span>
										{isSelected && <Check className={styles.checkIcon} />}
									</button>
									{item.divider && index < items.length - 1 && (
										<div className={styles.divider} role="separator" />
									)}
								</li>
							);
						})}
					</motion.ul>
				)}
			</AnimatePresence>
		</div>
	);
}

Dropdown.displayName = "Dropdown";
