import { motion } from "motion/react";
import {
	createContext,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Tabs.module.scss";

export type TabsVariant = "line" | "enclosed" | "pill";
export type TabsSize = "sm" | "md" | "lg";

interface IndicatorPosition {
	left: number;
	width: number;
}

interface TabsContextValue {
	activeTab: string;
	setActiveTab: (id: string) => void;
	variant: TabsVariant;
	size: TabsSize;
	baseId: string;
	registerTab: (id: string, element: HTMLButtonElement | null) => void;
	indicatorPosition: IndicatorPosition | null;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
	const context = useContext(TabsContext);
	if (!context) {
		throw new Error("Tabs components must be used within a Tabs provider");
	}
	return context;
}

export interface TabsProps {
	/** Default active tab */
	defaultTab?: string;
	/** Controlled active tab */
	activeTab?: string;
	/** Tab change callback */
	onTabChange?: (tabId: string) => void;
	/** Visual variant */
	variant?: TabsVariant;
	/** Size */
	size?: TabsSize;
	/** Children */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

export function Tabs({
	defaultTab,
	activeTab: controlledActiveTab,
	onTabChange,
	variant = "line",
	size = "md",
	children,
	className,
}: TabsProps) {
	const [internalActiveTab, setInternalActiveTab] = useState(defaultTab ?? "");
	const [indicatorPosition, setIndicatorPosition] =
		useState<IndicatorPosition | null>(null);
	const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const tabListRef = useRef<HTMLDivElement | null>(null);
	const baseId = useId();

	const isControlled = controlledActiveTab !== undefined;
	const activeTab = isControlled ? controlledActiveTab : internalActiveTab;

	const setActiveTab = useCallback(
		(id: string) => {
			if (!isControlled) {
				setInternalActiveTab(id);
			}
			onTabChange?.(id);
		},
		[isControlled, onTabChange],
	);

	const registerTab = useCallback(
		(id: string, element: HTMLButtonElement | null) => {
			if (element) {
				tabRefs.current.set(id, element);
			} else {
				tabRefs.current.delete(id);
			}
		},
		[],
	);

	// Calculate indicator position when active tab changes
	useEffect(() => {
		if (variant !== "line") {
			setIndicatorPosition(null);
			return;
		}

		const activeElement = tabRefs.current.get(activeTab);
		const tabList = tabListRef.current;

		if (activeElement && tabList) {
			const tabListRect = tabList.getBoundingClientRect();
			const tabRect = activeElement.getBoundingClientRect();

			setIndicatorPosition({
				left: tabRect.left - tabListRect.left,
				width: tabRect.width,
			});
		}
	}, [activeTab, variant]);

	// Store tabListRef setter for TabList to use
	const setTabListRef = useCallback((el: HTMLDivElement | null) => {
		tabListRef.current = el;
	}, []);

	return (
		<TabsContext.Provider
			value={{
				activeTab,
				setActiveTab,
				variant,
				size,
				baseId,
				registerTab,
				indicatorPosition,
			}}
		>
			<TabsContextInternal.Provider value={{ setTabListRef }}>
				<div className={cn(styles.tabs, className)}>{children}</div>
			</TabsContextInternal.Provider>
		</TabsContext.Provider>
	);
}

// Internal context for TabList ref
interface TabsContextInternalValue {
	setTabListRef: (el: HTMLDivElement | null) => void;
}

const TabsContextInternal = createContext<TabsContextInternalValue | null>(
	null,
);

export interface TabListProps {
	/** Tab triggers */
	children: ReactNode;
	/** Additional className */
	className?: string;
	/** Aria label for the tab list */
	"aria-label"?: string;
}

export function TabList({
	children,
	className,
	"aria-label": ariaLabel,
}: TabListProps) {
	const { variant, size, indicatorPosition } = useTabsContext();
	const internalContext = useContext(TabsContextInternal);
	const tabListRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();

	// Register ref with parent
	useEffect(() => {
		internalContext?.setTabListRef(tabListRef.current);
		return () => internalContext?.setTabListRef(null);
	}, [internalContext]);

	const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
		const tabList = tabListRef.current;
		if (!tabList) return;

		const tabs = Array.from(
			tabList.querySelectorAll<HTMLButtonElement>(
				'[role="tab"]:not([disabled])',
			),
		);
		const currentIndex = tabs.findIndex(
			(tab) => tab === document.activeElement,
		);

		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowLeft":
				nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
				break;
			case "ArrowRight":
				nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
				break;
			case "Home":
				nextIndex = 0;
				break;
			case "End":
				nextIndex = tabs.length - 1;
				break;
			case "Enter":
			case " ":
				// Ensure Enter/Space activates the focused tab
				if (document.activeElement instanceof HTMLButtonElement) {
					e.preventDefault();
					document.activeElement.click();
				}
				return;
		}

		const nextTab = nextIndex !== null ? tabs[nextIndex] : undefined;
		if (nextTab) {
			e.preventDefault();
			nextTab.focus();
			// Auto-activate on arrow key navigation for better UX
			nextTab.click();
		}
	}, []);

	// Show animated indicator for line variant
	const showIndicator = variant === "line" && indicatorPosition !== null;

	return (
		<div
			ref={tabListRef}
			role="tablist"
			aria-label={ariaLabel}
			className={cn(
				styles.tabList,
				styles[variant],
				styles[`size-${size}`],
				className,
			)}
			onKeyDown={handleKeyDown}
		>
			{children}
			{showIndicator && (
				<motion.div
					className={styles.indicator}
					initial={false}
					animate={{
						left: indicatorPosition.left,
						width: indicatorPosition.width,
					}}
					transition={
						prefersReducedMotion
							? { duration: 0 }
							: { type: "spring", stiffness: 400, damping: 30 }
					}
				/>
			)}
		</div>
	);
}

export interface TabProps {
	/** Tab ID */
	id: string;
	/** Tab label */
	children: ReactNode;
	/** Disabled state */
	disabled?: boolean;
	/** Icon before label */
	icon?: ReactNode;
	/** Additional className */
	className?: string;
}

export function Tab({
	id,
	children,
	disabled = false,
	icon,
	className,
}: TabProps) {
	const { activeTab, setActiveTab, baseId, registerTab } = useTabsContext();
	const buttonRef = useRef<HTMLButtonElement>(null);
	const isActive = activeTab === id;

	// Register tab element for indicator position calculation
	useEffect(() => {
		registerTab(id, buttonRef.current);
		return () => registerTab(id, null);
	}, [id, registerTab]);

	return (
		<button
			ref={buttonRef}
			type="button"
			role="tab"
			id={`${baseId}-tab-${id}`}
			aria-selected={isActive}
			aria-controls={`${baseId}-panel-${id}`}
			tabIndex={isActive ? 0 : -1}
			disabled={disabled}
			className={cn(
				styles.tab,
				isActive && styles.active,
				disabled && styles.disabled,
				className,
			)}
			onClick={() => setActiveTab(id)}
		>
			{icon && <span className={styles.icon}>{icon}</span>}
			{children}
		</button>
	);
}

export interface TabPanelsProps {
	/** Tab panels */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

export function TabPanels({ children, className }: TabPanelsProps) {
	return <div className={cn(styles.tabPanels, className)}>{children}</div>;
}

export interface TabPanelProps {
	/** Panel ID (must match Tab id) */
	id: string;
	/** Panel content */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

export function TabPanel({ id, children, className }: TabPanelProps) {
	const { activeTab, baseId } = useTabsContext();
	const isActive = activeTab === id;

	if (!isActive) return null;

	return (
		<div
			role="tabpanel"
			id={`${baseId}-panel-${id}`}
			aria-labelledby={`${baseId}-tab-${id}`}
			className={cn(styles.tabPanel, className)}
		>
			{children}
		</div>
	);
}

Tabs.displayName = "Tabs";
TabList.displayName = "TabList";
Tab.displayName = "Tab";
TabPanels.displayName = "TabPanels";
TabPanel.displayName = "TabPanel";
