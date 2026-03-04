import { Check, ChevronDown, X } from "lucide-react";
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
import styles from "./MultiSelect.module.scss";

export type MultiSelectSize = "sm" | "md" | "lg";
export type MultiSelectVariant = "default" | "outline";

export interface MultiSelectItem {
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
	/** Divider after this item */
	divider?: boolean;
}

export interface MultiSelectProps {
	/** MultiSelect items */
	items: MultiSelectItem[];
	/** Selected item IDs */
	value?: Set<string>;
	/** Selection change handler */
	onChange?: (ids: Set<string>) => void;
	/** Placeholder text */
	placeholder?: string;
	/** MultiSelect size */
	size?: MultiSelectSize;
	/** MultiSelect variant */
	variant?: MultiSelectVariant;
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
 * MultiSelect component for selecting multiple options from a list.
 *
 * @example
 * ```tsx
 * <MultiSelect
 *   items={[
 *     { id: "react", label: "React" },
 *     { id: "vue", label: "Vue" },
 *     { id: "angular", label: "Angular" },
 *   ]}
 *   value={selectedIds}
 *   onChange={setSelectedIds}
 *   placeholder="Select frameworks..."
 * />
 * ```
 */
export function MultiSelect({
	items,
	value = new Set(),
	onChange,
	placeholder = "Select...",
	size = "md",
	variant = "default",
	disabled = false,
	fullWidth = false,
	align = "start",
	className,
}: MultiSelectProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(-1);
	const containerRef = useRef<HTMLDivElement>(null);
	const menuRef = useRef<HTMLUListElement>(null);

	const selectedItems = items.filter((item) => value.has(item.id));
	const enabledItems = items.filter((item) => !item.disabled);
	const prefersReducedMotion = useReducedMotion();

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

	// Reset focus when opening
	useEffect(() => {
		if (!isOpen) {
			setFocusedIndex(-1);
		}
	}, [isOpen]);

	// Focus menu item when focusedIndex changes
	useEffect(() => {
		if (isOpen && focusedIndex >= 0 && menuRef.current) {
			const menuItems = menuRef.current.querySelectorAll(
				'[role="option"]:not([aria-disabled="true"])',
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
			const newValue = new Set(value);
			if (newValue.has(id)) {
				newValue.delete(id);
			} else {
				newValue.add(id);
			}
			onChange?.(newValue);
		},
		[value, onChange],
	);

	const handleClearAll = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onChange?.(new Set());
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
				case "Tab":
					if (isOpen) {
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
					}
					break;
			}
		},
		[disabled, isOpen, focusedIndex, enabledItems, handleSelect],
	);

	const handleItemKeyDown = useCallback(
		(e: KeyboardEvent, item: MultiSelectItem) => {
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
				styles.multiSelect,
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
				<span className={styles.triggerContent}>
					{/* Hidden placeholder to maintain consistent width */}
					<span className={styles.hiddenPlaceholder} aria-hidden="true">
						{placeholder}
					</span>
					{/* Visible content */}
					<span className={styles.visibleContent}>
						{selectedItems.length === 0 ? (
							<span className={styles.placeholder}>{placeholder}</span>
						) : (
							<span className={styles.label}>
								{selectedItems.length} selected
							</span>
						)}
					</span>
				</span>
				<span className={styles.actions}>
					<button
						type="button"
						className={cn(
							styles.clearButton,
							selectedItems.length === 0 && styles.clearButtonHidden,
						)}
						onClick={handleClearAll}
						aria-label="Clear all"
						tabIndex={selectedItems.length === 0 ? -1 : 0}
					>
						<X />
					</button>
					<ChevronDown
						className={cn(styles.chevron, isOpen && styles.rotated)}
					/>
				</span>
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.ul
						ref={menuRef}
						className={cn(styles.menu, styles[`align-${align}`])}
						role="listbox"
						aria-multiselectable="true"
						aria-activedescendant={
							focusedIndex >= 0
								? `multiselect-item-${enabledItems[focusedIndex]?.id}`
								: undefined
						}
						variants={menuVariants}
						initial="hidden"
						animate="visible"
						exit="hidden"
						transition={transition}
					>
						{items.map((item) => {
							const isSelected = value.has(item.id);
							const isFocused = enabledItems.indexOf(item) === focusedIndex;

							return (
								<li key={item.id}>
									<button
										type="button"
										id={`multiselect-item-${item.id}`}
										className={cn(
											styles.item,
											isSelected && styles.selected,
											isFocused && styles.focused,
											item.disabled && styles.disabled,
											item.description && styles.hasDescription,
										)}
										role="option"
										aria-selected={isSelected}
										aria-disabled={item.disabled}
										onClick={() => !item.disabled && handleSelect(item.id)}
										onKeyDown={(e) => handleItemKeyDown(e, item)}
										tabIndex={isFocused ? 0 : -1}
									>
										<span
											className={cn(
												styles.checkbox,
												isSelected && styles.checked,
											)}
										>
											{isSelected && <Check />}
										</span>
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
									</button>
									{item.divider && (
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

MultiSelect.displayName = "MultiSelect";
