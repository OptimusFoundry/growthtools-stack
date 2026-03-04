import { ChevronDown } from "lucide-react";
import {
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useRef,
	useState,
} from "react";
import { cn } from "../../../utils/cn";
import styles from "./Accordion.module.scss";

export interface AccordionItemData {
	/** Unique identifier for the item */
	id: string;
	/** Title displayed in the header */
	title: string;
	/** Optional description text */
	description?: string;
	/** Content to display when expanded */
	content: ReactNode;
	/** Whether the item is disabled */
	disabled?: boolean;
	/** Optional icon to display on the left */
	icon?: ReactNode;
}

export interface AccordionProps {
	/** Array of accordion items */
	items: AccordionItemData[];
	/** Allow multiple items to be expanded simultaneously */
	multiple?: boolean;
	/** Default expanded item IDs */
	defaultExpanded?: string[];
	/** Controlled expanded state */
	expanded?: string[];
	/** Callback when expansion changes */
	onExpandedChange?: (expanded: string[]) => void;
	/** Additional className */
	className?: string;
}

/**
 * Accordion component for collapsible content panels.
 *
 * @example
 * ```tsx
 * <Accordion
 *   items={[
 *     { id: '1', title: 'Section 1', content: <p>Content 1</p> },
 *     { id: '2', title: 'Section 2', content: <p>Content 2</p> },
 *   ]}
 * />
 * ```
 */
export function Accordion({
	items,
	multiple = false,
	defaultExpanded = [],
	expanded: controlledExpanded,
	onExpandedChange,
	className,
}: AccordionProps) {
	const [internalExpanded, setInternalExpanded] =
		useState<string[]>(defaultExpanded);
	const headerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

	const isControlled = controlledExpanded !== undefined;
	const expandedItems = isControlled ? controlledExpanded : internalExpanded;

	const enabledItems = items.filter((item) => !item.disabled);

	const handleToggle = useCallback(
		(id: string) => {
			const newExpanded = expandedItems.includes(id)
				? expandedItems.filter((itemId) => itemId !== id)
				: multiple
					? [...expandedItems, id]
					: [id];

			if (!isControlled) {
				setInternalExpanded(newExpanded);
			}
			onExpandedChange?.(newExpanded);
		},
		[expandedItems, multiple, isControlled, onExpandedChange],
	);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLButtonElement>, itemId: string) => {
			const currentIndex = enabledItems.findIndex((item) => item.id === itemId);
			if (currentIndex === -1) return;

			let targetIndex: number | null = null;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					targetIndex = (currentIndex + 1) % enabledItems.length;
					break;
				case "ArrowUp":
					e.preventDefault();
					targetIndex =
						(currentIndex - 1 + enabledItems.length) % enabledItems.length;
					break;
				case "Home":
					e.preventDefault();
					targetIndex = 0;
					break;
				case "End":
					e.preventDefault();
					targetIndex = enabledItems.length - 1;
					break;
			}

			if (targetIndex !== null) {
				const targetItem = enabledItems[targetIndex];
				if (targetItem) {
					headerRefs.current.get(targetItem.id)?.focus();
				}
			}
		},
		[enabledItems],
	);

	const setHeaderRef = useCallback(
		(id: string, el: HTMLButtonElement | null) => {
			if (el) {
				headerRefs.current.set(id, el);
			} else {
				headerRefs.current.delete(id);
			}
		},
		[],
	);

	return (
		<div className={cn(styles.accordion, className)}>
			{items.map((item) => (
				<AccordionItem
					key={item.id}
					item={item}
					isExpanded={expandedItems.includes(item.id)}
					onToggle={() => handleToggle(item.id)}
					onKeyDown={(e) => handleKeyDown(e, item.id)}
					headerRef={(el) => setHeaderRef(item.id, el)}
				/>
			))}
		</div>
	);
}

interface AccordionItemProps {
	item: AccordionItemData;
	isExpanded: boolean;
	onToggle: () => void;
	onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
	headerRef: (el: HTMLButtonElement | null) => void;
}

function AccordionItem({
	item,
	isExpanded,
	onToggle,
	onKeyDown,
	headerRef,
}: AccordionItemProps) {
	return (
		<div
			className={cn(
				styles.item,
				isExpanded && styles.expanded,
				item.disabled && styles.disabled,
			)}
		>
			<button
				ref={headerRef}
				type="button"
				className={styles.header}
				onClick={() => !item.disabled && onToggle()}
				onKeyDown={onKeyDown}
				aria-expanded={isExpanded}
				aria-disabled={item.disabled}
				disabled={item.disabled}
			>
				{item.icon && <span className={styles.icon}>{item.icon}</span>}
				<div className={styles.titleWrapper}>
					<span className={styles.title}>{item.title}</span>
					{item.description && (
						<span className={styles.description}>{item.description}</span>
					)}
				</div>
				<ChevronDown
					className={cn(styles.chevron, isExpanded && styles.chevronExpanded)}
				/>
			</button>
			<div className={styles.panel} role="region" aria-hidden={!isExpanded}>
				<div className={styles.content}>{item.content}</div>
			</div>
		</div>
	);
}

Accordion.displayName = "Accordion";
