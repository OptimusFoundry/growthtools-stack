import { Search } from "lucide-react";
import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "../../../utils/cn";
import styles from "./CommandPalette.module.scss";

export interface CommandItem {
	/** Unique ID */
	id: string;
	/** Display label */
	label: string;
	/** Optional description */
	description?: string;
	/** Optional icon */
	icon?: ReactNode;
	/** Optional keyboard shortcut */
	shortcut?: string[];
	/** Optional group */
	group?: string;
	/** Disabled state */
	disabled?: boolean;
	/** Action handler */
	onSelect?: () => void;
}

export interface CommandPaletteProps {
	/** Whether the palette is open */
	isOpen: boolean;
	/** Close callback */
	onClose: () => void;
	/** Command items */
	items: CommandItem[];
	/** Placeholder text */
	placeholder?: string;
	/** Empty state text */
	emptyText?: string;
	/** Filter function */
	filterFn?: (item: CommandItem, query: string) => boolean;
	/** Additional className */
	className?: string;
}

const defaultFilterFn = (item: CommandItem, query: string): boolean => {
	const searchQuery = query.toLowerCase();
	return (
		item.label.toLowerCase().includes(searchQuery) ||
		(item.description?.toLowerCase().includes(searchQuery) ?? false)
	);
};

/**
 * CommandPalette component for keyboard-driven command execution.
 * Uses native dialog element for accessibility.
 *
 * @example
 * ```tsx
 * <CommandPalette
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   items={[
 *     { id: "1", label: "Go to Dashboard", onSelect: () => navigate("/") },
 *     { id: "2", label: "Settings", shortcut: ["⌘", "S"] },
 *   ]}
 * />
 * ```
 */
export function CommandPalette({
	isOpen,
	onClose,
	items,
	placeholder = "Type a command or search...",
	emptyText = "No results found",
	filterFn = defaultFilterFn,
	className,
}: CommandPaletteProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Filter items based on query
	const filteredItems = useMemo(() => {
		if (!query) return items.filter((item) => !item.disabled);
		return items.filter((item) => !item.disabled && filterFn(item, query));
	}, [items, query, filterFn]);

	// Group items
	const groupedItems = useMemo(() => {
		const groups = new Map<string | undefined, CommandItem[]>();

		for (const item of filteredItems) {
			const group = item.group;
			if (!groups.has(group)) {
				groups.set(group, []);
			}
			groups.get(group)?.push(item);
		}

		return groups;
	}, [filteredItems]);

	// Handle dialog open/close
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (isOpen) {
			dialog.showModal();
			setQuery("");
			setSelectedIndex(0);
			setTimeout(() => inputRef.current?.focus(), 0);
		} else {
			dialog.close();
		}
	}, [isOpen]);

	// Handle native close event
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleClose = () => onClose();
		dialog.addEventListener("close", handleClose);
		return () => dialog.removeEventListener("close", handleClose);
	}, [onClose]);

	// Reset selection when query changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on query change
	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	const handleSelect = useCallback(
		(item: CommandItem) => {
			item.onSelect?.();
			onClose();
		},
		[onClose],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setSelectedIndex((prev) =>
						prev < filteredItems.length - 1 ? prev + 1 : 0,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setSelectedIndex((prev) =>
						prev > 0 ? prev - 1 : filteredItems.length - 1,
					);
					break;
				case "Enter":
					e.preventDefault();
					if (filteredItems[selectedIndex]) {
						handleSelect(filteredItems[selectedIndex]);
					}
					break;
				case "Escape":
					e.preventDefault();
					onClose();
					break;
			}
		},
		[filteredItems, selectedIndex, handleSelect, onClose],
	);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent<HTMLDialogElement>) => {
			if (e.target === dialogRef.current) {
				onClose();
			}
		},
		[onClose],
	);

	let flatIndex = -1;

	return (
		<dialog
			ref={dialogRef}
			className={cn(styles.dialog, className)}
			onClick={handleBackdropClick}
			onKeyDown={(e) => {
				if (e.key === "Escape") e.stopPropagation();
			}}
		>
			<div className={styles.palette} onKeyDown={handleKeyDown}>
				<div className={styles.searchWrapper}>
					<Search className={styles.searchIcon} />
					<input
						ref={inputRef}
						type="text"
						className={styles.input}
						placeholder={placeholder}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						aria-label="Search commands"
						aria-autocomplete="list"
						aria-controls="command-list"
					/>
				</div>

				<div id="command-list" className={styles.list} aria-label="Commands">
					{filteredItems.length === 0 ? (
						<div className={styles.empty}>{emptyText}</div>
					) : (
						Array.from(groupedItems.entries()).map(([group, groupItems]) => (
							<div key={group ?? "ungrouped"} className={styles.group}>
								{group && <div className={styles.groupLabel}>{group}</div>}
								{groupItems.map((item) => {
									flatIndex++;
									const isSelected = flatIndex === selectedIndex;
									const currentIndex = flatIndex;

									return (
										<button
											key={item.id}
											type="button"
											aria-current={isSelected ? "true" : undefined}
											className={cn(styles.item, isSelected && styles.selected)}
											onClick={() => handleSelect(item)}
											onMouseEnter={() => setSelectedIndex(currentIndex)}
										>
											{item.icon && (
												<span className={styles.itemIcon}>{item.icon}</span>
											)}
											<div className={styles.itemContent}>
												<span className={styles.itemLabel}>{item.label}</span>
												{item.description && (
													<span className={styles.itemDescription}>
														{item.description}
													</span>
												)}
											</div>
											{item.shortcut && (
												<div className={styles.shortcut}>
													{item.shortcut.map((key) => (
														<kbd key={key} className={styles.kbd}>
															{key}
														</kbd>
													))}
												</div>
											)}
										</button>
									);
								})}
							</div>
						))
					)}
				</div>

				<div className={styles.footer}>
					<span className={styles.hint}>
						<kbd className={styles.kbd}>↑↓</kbd> to navigate
					</span>
					<span className={styles.hint}>
						<kbd className={styles.kbd}>↵</kbd> to select
					</span>
					<span className={styles.hint}>
						<kbd className={styles.kbd}>esc</kbd> to close
					</span>
				</div>
			</div>
		</dialog>
	);
}

CommandPalette.displayName = "CommandPalette";
