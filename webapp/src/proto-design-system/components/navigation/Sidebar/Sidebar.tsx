import {
	ChevronDown,
	ChevronRight,
	Menu,
	PanelLeftClose,
	PanelLeftOpen,
	X,
} from "lucide-react";
import {
	createContext,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { cn } from "../../../utils/cn";
import styles from "./Sidebar.module.scss";

export type SidebarVariant = "default" | "compact";

interface SidebarContextValue {
	collapsed: boolean;
	variant: SidebarVariant;
	isMobile: boolean;
	mobileOpen: boolean;
	toggleCollapsed: () => void;
	toggleMobileOpen: () => void;
	closeMobile: () => void;
	/** Internal marker to detect if we're inside a provider */
	_hasProvider?: boolean;
}

const SidebarContext = createContext<SidebarContextValue>({
	collapsed: false,
	variant: "default",
	isMobile: false,
	mobileOpen: false,
	toggleCollapsed: () => {
		/* noop */
	},
	toggleMobileOpen: () => {
		/* noop */
	},
	closeMobile: () => {
		/* noop */
	},
	_hasProvider: false,
});

function useSidebarContext() {
	return useContext(SidebarContext);
}

export { useSidebarContext };

/** Default breakpoint for mobile collapse (in pixels) */
const DEFAULT_MOBILE_BREAKPOINT = 768;

// =============================================================================
// SIDEBAR PROVIDER (for wrapping entire layout)
// =============================================================================

export interface SidebarProviderProps {
	/** Enable responsive behavior */
	responsive?: boolean;
	/** Custom breakpoint for mobile (default: 768px) */
	mobileBreakpoint?: number;
	/** Children to render */
	children: ReactNode;
}

/**
 * Provider for Sidebar context. Wrap your entire layout with this
 * to allow SidebarMobileTrigger to work from outside the Sidebar.
 */
export function SidebarProvider({
	responsive = false,
	mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
	children,
}: SidebarProviderProps) {
	const [collapsed, setCollapsed] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);

	const toggleCollapsed = useCallback(() => {
		setCollapsed((prev) => !prev);
	}, []);

	const toggleMobileOpen = useCallback(() => {
		setMobileOpen((prev) => !prev);
	}, []);

	const closeMobile = useCallback(() => {
		setMobileOpen(false);
	}, []);

	// Responsive behavior
	useEffect(() => {
		if (!responsive) return;

		const handleResize = () => {
			const mobile = window.innerWidth < mobileBreakpoint;
			setIsMobile(mobile);
			if (!mobile) {
				setMobileOpen(false);
			}
		};

		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [responsive, mobileBreakpoint]);

	// Close on escape
	useEffect(() => {
		if (!mobileOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeMobile();
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [mobileOpen, closeMobile]);

	// Prevent body scroll when mobile open
	useEffect(() => {
		if (mobileOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [mobileOpen]);

	const contextValue: SidebarContextValue = {
		collapsed: isMobile ? false : collapsed,
		variant: "default",
		isMobile,
		mobileOpen,
		toggleCollapsed,
		toggleMobileOpen,
		closeMobile,
		_hasProvider: true,
	};

	return (
		<SidebarContext.Provider value={contextValue}>
			{/* Backdrop for mobile */}
			{isMobile && mobileOpen && (
				<div
					className={styles.backdrop}
					onClick={closeMobile}
					aria-hidden="true"
				/>
			)}
			{children}
		</SidebarContext.Provider>
	);
}

export interface SidebarProps {
	/** Collapsed state (icon-only) - controlled mode */
	collapsed?: boolean;
	/** Callback when collapsed state changes */
	onCollapsedChange?: (collapsed: boolean) => void;
	/** Visual variant */
	variant?: SidebarVariant;
	/** Enable responsive auto-collapse on mobile */
	responsive?: boolean;
	/** Custom breakpoint for mobile collapse (default: 768px) */
	mobileBreakpoint?: number;
	/** Sidebar content */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * Sidebar component for vertical navigation.
 *
 * When used standalone (without SidebarProvider), manages its own state.
 * When used inside SidebarProvider, uses shared context for mobile drawer behavior.
 *
 * @example
 * ```tsx
 * // Standalone usage
 * <Sidebar responsive>
 *   <SidebarHeader>
 *     <SidebarLogo>Logo</SidebarLogo>
 *     <SidebarToggle />
 *   </SidebarHeader>
 *   <SidebarSection title="Main">
 *     <SidebarItem icon={<Home />} href="/">Home</SidebarItem>
 *   </SidebarSection>
 * </Sidebar>
 *
 * // With provider (for mobile trigger outside sidebar)
 * <SidebarProvider responsive>
 *   <Sidebar>...</Sidebar>
 *   <main>
 *     <SidebarMobileTrigger />
 *     Content
 *   </main>
 * </SidebarProvider>
 * ```
 */
export function Sidebar({
	collapsed: controlledCollapsed,
	onCollapsedChange,
	variant = "default",
	responsive = false,
	mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
	children,
	className,
}: SidebarProps) {
	// Check if we're inside a SidebarProvider
	const parentContext = useContext(SidebarContext);
	const hasProvider = parentContext._hasProvider === true;

	// Internal state for standalone mode (no provider)
	const [internalCollapsed, setInternalCollapsed] = useState(false);
	const [internalIsMobile, setInternalIsMobile] = useState(false);
	const [internalMobileOpen, setInternalMobileOpen] = useState(false);

	// Use controlled, parent context, or internal state
	const isControlled = controlledCollapsed !== undefined;
	const collapsed = isControlled
		? controlledCollapsed
		: hasProvider
			? parentContext.collapsed
			: internalCollapsed;
	const isMobile = hasProvider ? parentContext.isMobile : internalIsMobile;
	const mobileOpen = hasProvider
		? parentContext.mobileOpen
		: internalMobileOpen;

	const setCollapsed = useCallback(
		(value: boolean) => {
			if (!isControlled && !hasProvider) {
				setInternalCollapsed(value);
			}
			onCollapsedChange?.(value);
		},
		[isControlled, hasProvider, onCollapsedChange],
	);

	const toggleCollapsed = useCallback(() => {
		if (hasProvider) {
			parentContext.toggleCollapsed();
		} else {
			setCollapsed(!collapsed);
		}
	}, [hasProvider, parentContext, collapsed, setCollapsed]);

	const toggleMobileOpen = useCallback(() => {
		if (hasProvider) {
			parentContext.toggleMobileOpen();
		} else {
			setInternalMobileOpen((prev) => !prev);
		}
	}, [hasProvider, parentContext]);

	const closeMobile = useCallback(() => {
		if (hasProvider) {
			parentContext.closeMobile();
		} else {
			setInternalMobileOpen(false);
		}
	}, [hasProvider, parentContext]);

	// Responsive behavior (only when standalone)
	useEffect(() => {
		if (!responsive || hasProvider) return;

		const handleResize = () => {
			const mobile = window.innerWidth < mobileBreakpoint;
			setInternalIsMobile(mobile);
			if (!mobile) {
				setInternalMobileOpen(false);
			}
		};

		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [responsive, mobileBreakpoint, hasProvider]);

	// Close on escape (only when standalone)
	useEffect(() => {
		if (hasProvider || !internalMobileOpen) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setInternalMobileOpen(false);
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [hasProvider, internalMobileOpen]);

	// Prevent body scroll (only when standalone)
	useEffect(() => {
		if (hasProvider) return;
		if (internalMobileOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [hasProvider, internalMobileOpen]);

	const contextValue = {
		collapsed: isMobile ? false : collapsed,
		variant,
		isMobile,
		mobileOpen,
		toggleCollapsed,
		toggleMobileOpen,
		closeMobile,
	};

	// Render sidebar content
	const sidebarContent = <nav className={styles.nav}>{children}</nav>;

	// When using provider, just render the sidebar (provider handles backdrop)
	if (hasProvider) {
		if (isMobile) {
			return (
				<aside
					className={cn(
						styles.sidebar,
						styles[variant],
						styles.mobile,
						mobileOpen && styles.mobileOpen,
						className,
					)}
					aria-hidden={!mobileOpen}
				>
					{sidebarContent}
				</aside>
			);
		}
		return (
			<aside
				className={cn(
					styles.sidebar,
					styles[variant],
					collapsed && styles.collapsed,
					className,
				)}
			>
				{sidebarContent}
			</aside>
		);
	}

	// Standalone mode: manage own context
	// Mobile: completely hidden until opened as overlay
	if (responsive && isMobile) {
		return (
			<SidebarContext.Provider value={contextValue}>
				{mobileOpen && (
					<div
						className={styles.backdrop}
						onClick={closeMobile}
						aria-hidden="true"
					/>
				)}
				<aside
					className={cn(
						styles.sidebar,
						styles[variant],
						styles.mobile,
						mobileOpen && styles.mobileOpen,
						className,
					)}
					aria-hidden={!mobileOpen}
				>
					{sidebarContent}
				</aside>
			</SidebarContext.Provider>
		);
	}

	// Desktop: normal sidebar behavior
	return (
		<SidebarContext.Provider value={contextValue}>
			<aside
				className={cn(
					styles.sidebar,
					styles[variant],
					collapsed && styles.collapsed,
					className,
				)}
			>
				{sidebarContent}
			</aside>
		</SidebarContext.Provider>
	);
}

export interface SidebarHeaderProps {
	/** Header content */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * Header section for the sidebar, typically contains logo and toggle button.
 */
export function SidebarHeader({ children, className }: SidebarHeaderProps) {
	const { collapsed } = useSidebarContext();

	return (
		<div
			className={cn(
				styles.header,
				collapsed && styles.headerCollapsed,
				className,
			)}
		>
			{children}
		</div>
	);
}

export interface SidebarLogoProps {
	/** Logo content (hidden when collapsed) */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * Logo component that auto-hides when sidebar is collapsed.
 */
export function SidebarLogo({ children, className }: SidebarLogoProps) {
	const { collapsed } = useSidebarContext();

	if (collapsed) return null;

	return <div className={cn(styles.logo, className)}>{children}</div>;
}

export interface SidebarToggleProps {
	/** Additional className */
	className?: string;
}

/**
 * Toggle button for collapsing/expanding the sidebar.
 * On mobile, this becomes a close button.
 */
export function SidebarToggle({ className }: SidebarToggleProps) {
	const { collapsed, isMobile, toggleCollapsed, closeMobile } =
		useSidebarContext();

	// On mobile, show close button
	if (isMobile) {
		return (
			<button
				type="button"
				className={cn(styles.toggle, className)}
				onClick={closeMobile}
				aria-label="Close menu"
			>
				<X />
			</button>
		);
	}

	return (
		<button
			type="button"
			className={cn(styles.toggle, className)}
			onClick={toggleCollapsed}
			aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
			aria-expanded={!collapsed}
		>
			{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
		</button>
	);
}

export interface SidebarMobileTriggerProps {
	/** Additional className */
	className?: string;
}

/**
 * Hamburger menu button for opening the sidebar on mobile.
 * Place this in your main content header.
 * Only renders when sidebar is in responsive mobile mode.
 */
export function SidebarMobileTrigger({ className }: SidebarMobileTriggerProps) {
	const { isMobile, toggleMobileOpen } = useSidebarContext();

	// Only render on mobile
	if (!isMobile) return null;

	return (
		<button
			type="button"
			className={cn(styles.mobileTrigger, className)}
			onClick={toggleMobileOpen}
			aria-label="Open menu"
		>
			<Menu />
		</button>
	);
}

export interface SidebarSectionProps {
	/** Section title */
	title?: string;
	/** Section items */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

export function SidebarSection({
	title,
	children,
	className,
}: SidebarSectionProps) {
	const { collapsed } = useSidebarContext();
	const sectionRef = useRef<HTMLDivElement>(null);

	const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
		const section = sectionRef.current;
		if (!section) return;

		// Get all focusable items (buttons and links) within the section
		const items = Array.from(
			section.querySelectorAll<HTMLElement>(
				"a:not([disabled]), button:not([disabled])",
			),
		);
		const currentIndex = items.findIndex(
			(item) => item === document.activeElement,
		);

		if (currentIndex === -1) return;

		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				nextIndex = (currentIndex + 1) % items.length;
				break;
			case "ArrowUp":
				e.preventDefault();
				nextIndex = (currentIndex - 1 + items.length) % items.length;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = items.length - 1;
				break;
		}

		if (nextIndex !== null) {
			const nextItem = items[nextIndex];
			if (nextItem) {
				nextItem.focus();
			}
		}
	}, []);

	return (
		<div
			className={cn(styles.section, className)}
			ref={sectionRef}
			onKeyDown={handleKeyDown}
		>
			{title && !collapsed && (
				<div className={styles.sectionTitle}>{title}</div>
			)}
			<div className={styles.sectionItems}>{children}</div>
		</div>
	);
}

export interface SidebarItemProps {
	/** Item icon */
	icon?: ReactNode;
	/** Item href (renders as link) */
	href?: string;
	/** Active state */
	active?: boolean;
	/** Disabled state */
	disabled?: boolean;
	/** Badge content */
	badge?: ReactNode;
	/** Item content */
	children: ReactNode;
	/** Click handler */
	onClick?: () => void;
	/** Additional className */
	className?: string;
	/** Custom link component for client-side routing (e.g., TanStack Router's Link) */
	LinkComponent?: React.ComponentType<{
		to: string;
		className?: string;
		"aria-current"?: "page" | undefined;
		onClick?: () => void;
		children: ReactNode;
	}>;
}

export function SidebarItem({
	icon,
	href,
	active = false,
	disabled = false,
	badge,
	children,
	onClick,
	className,
	LinkComponent,
}: SidebarItemProps) {
	const { collapsed, isMobile, closeMobile } = useSidebarContext();

	const handleClick = useCallback(() => {
		onClick?.();
		if (isMobile && href) {
			// Delay close to allow navigation to start smoothly
			requestAnimationFrame(() => {
				closeMobile();
			});
		}
	}, [isMobile, closeMobile, onClick, href]);

	const content = (
		<>
			{icon && <span className={styles.itemIcon}>{icon}</span>}
			{!collapsed && (
				<>
					<span className={styles.itemLabel}>{children}</span>
					{badge && <span className={styles.itemBadge}>{badge}</span>}
				</>
			)}
		</>
	);

	const itemClass = cn(
		styles.item,
		active && styles.active,
		disabled && styles.disabled,
		className,
	);

	if (href && !disabled) {
		// Use custom LinkComponent for client-side routing if provided
		if (LinkComponent) {
			return (
				<LinkComponent
					to={href}
					className={itemClass}
					aria-current={active ? "page" : undefined}
					onClick={handleClick}
				>
					{content}
				</LinkComponent>
			);
		}

		return (
			<a
				href={href}
				className={itemClass}
				aria-current={active ? "page" : undefined}
				onClick={handleClick}
			>
				{content}
			</a>
		);
	}

	return (
		<button
			type="button"
			className={itemClass}
			onClick={handleClick}
			disabled={disabled}
		>
			{content}
		</button>
	);
}

export interface SidebarGroupProps {
	/** Group icon */
	icon?: ReactNode;
	/** Group label */
	label: ReactNode;
	/** Default expanded state */
	defaultExpanded?: boolean;
	/** Group items */
	children: ReactNode;
	/** Additional className */
	className?: string;
}

export function SidebarGroup({
	icon,
	label,
	defaultExpanded = false,
	children,
	className,
}: SidebarGroupProps) {
	const [expanded, setExpanded] = useState(defaultExpanded);
	const { collapsed } = useSidebarContext();

	if (collapsed) {
		return <>{children}</>;
	}

	return (
		<div className={cn(styles.group, className)}>
			<button
				type="button"
				className={styles.groupButton}
				onClick={() => setExpanded(!expanded)}
				aria-expanded={expanded}
			>
				{icon && <span className={styles.itemIcon}>{icon}</span>}
				<span className={styles.itemLabel}>{label}</span>
				<span className={styles.groupChevron}>
					{expanded ? <ChevronDown /> : <ChevronRight />}
				</span>
			</button>
			{expanded && <div className={styles.groupItems}>{children}</div>}
		</div>
	);
}

export interface SidebarDividerProps {
	/** Additional className */
	className?: string;
}

export function SidebarDivider({ className }: SidebarDividerProps) {
	return <hr className={cn(styles.divider, className)} />;
}

Sidebar.displayName = "Sidebar";
SidebarHeader.displayName = "SidebarHeader";
SidebarLogo.displayName = "SidebarLogo";
SidebarToggle.displayName = "SidebarToggle";
SidebarMobileTrigger.displayName = "SidebarMobileTrigger";
SidebarSection.displayName = "SidebarSection";
SidebarItem.displayName = "SidebarItem";
SidebarGroup.displayName = "SidebarGroup";
SidebarDivider.displayName = "SidebarDivider";
