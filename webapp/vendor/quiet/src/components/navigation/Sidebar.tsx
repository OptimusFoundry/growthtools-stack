import React from "react";
import { useEscape, useFocusTrap, useModalBackground, usePresence } from "../../a11y/hooks";
import { useLinkElement } from "../../lib/link";
import "./Sidebar.scss";

/**
 * App side navigation. Groups with mono labels, paper-2 active row, collapsible to a 64px rail, auto-collapse below a breakpoint (or, in a SidebarProvider, an off-canvas drawer).
 * @startingPoint section="Navigation" subtitle="App side navigation" viewport="900x560"
 */
export interface SidebarProps {
	items?: Array<{
		label: React.ReactNode;
		value?: string;
		href?: string;
		icon?: React.ReactNode;
		badge?: React.ReactNode /** Spoken text for the badge, e.g. "14 open" */;
		badgeLabel?: string;
		disabled?: boolean;
		active?: boolean;
		onClick?: () => void;
	}>;
	/** Use instead of items for labelled sections. `collapsible` turns the label into a disclosure button (`defaultOpen` defaults to true) */
	groups?: Array<{
		label?: React.ReactNode;
		items: NonNullable<SidebarProps["items"]>;
		collapsible?: boolean;
		defaultOpen?: boolean;
	}>;
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
	header?: React.ReactNode;
	footer?: React.ReactNode;
	collapsed?: boolean;
	defaultCollapsed?: boolean;
	onCollapsedChange?: (collapsed: boolean) => void;
	/** Shows the ← / → toggle */
	collapsible?: boolean;
	compact?: boolean;
	dividers?: boolean;
	width?: number;
	collapsedWidth?: number;
	/** Auto-collapse below this viewport width (px). Inside a SidebarProvider, the provider's `breakpoint` applies instead */
	breakpoint?: number;
	/** Below the breakpoint: collapse to the rail, or become an off-canvas drawer opened by a SidebarTrigger. Defaults to `drawer` inside a SidebarProvider, `rail` outside one */
	mobile?: "rail" | "drawer";
	/** Accessible name for the nav landmark. Defaults to "Sidebar: <group labels>" or "Sidebar" */
	label?: string;
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

/** Shares the mobile drawer's state between a Sidebar and a SidebarTrigger placed anywhere (e.g. a top bar). */
export interface SidebarProviderProps {
	/** Below this viewport width (px) the Sidebar becomes a drawer. Default 768 */
	breakpoint?: number;
	/** Drawer open (controlled) */
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: React.ReactNode;
}

/** Opens the mobile drawer. Renders only while the Sidebar is in drawer mode (below the breakpoint). */
export interface SidebarTriggerProps {
	/** Accessible name. Default "Open navigation" */
	"aria-label"?: string;
	/** Replaces the default ≡ glyph */
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export interface SidebarState {
	/** Viewport is below the breakpoint */
	isMobile: boolean;
	/** Mobile drawer is open */
	open: boolean;
	setOpen: (open: boolean) => void;
	close: () => void;
	/** Opens/closes the drawer on mobile; collapses/expands the rail on desktop */
	toggle: () => void;
	/** Desktop rail is collapsed */
	collapsed: boolean;
}
/** Sidebar state, inside a SidebarProvider or a Sidebar's own header/footer. Throws elsewhere. */

type SidebarItem = NonNullable<SidebarProps["items"]>[number];
type SidebarGroup = {
	label?: React.ReactNode;
	items: SidebarItem[];
	collapsible?: boolean;
	defaultOpen?: boolean;
};
type SidebarRail = {
	collapsed: boolean;
	drawer: boolean;
	toggle: (() => void) | null;
	panelId: string | undefined;
};
interface SidebarContextValue extends SidebarState {
	drawer: boolean;
	panelId: string | undefined;
	register: React.Dispatch<React.SetStateAction<SidebarRail>>;
	scoped: boolean;
}

const px = (v: number | string) => (typeof v === "number" ? `${v}px` : v);
const below = (bp: number) => typeof window !== "undefined" && bp > 0 && window.innerWidth < bp;
const UNREGISTERED: SidebarRail = {
	collapsed: false,
	drawer: false,
	toggle: null,
	panelId: undefined,
};

// quiet: shared state between a Sidebar and a SidebarTrigger that lives elsewhere (a top bar).
const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
	breakpoint = 768,
	open,
	defaultOpen = false,
	onOpenChange,
	children,
	_scoped = false,
}: SidebarProviderProps & { _scoped?: boolean }) {
	const [isMobile, setIsMobile] = React.useState(() => below(breakpoint));
	React.useEffect(() => {
		const f = () => setIsMobile(below(breakpoint));
		f();
		window.addEventListener("resize", f);
		return () => window.removeEventListener("resize", f);
	}, [breakpoint]);
	const [innerOpen, setInnerOpen] = React.useState(defaultOpen);
	const [rail, register] = React.useState(UNREGISTERED);
	const drawer = isMobile && rail.drawer;
	const wanted = open ?? innerOpen;
	const isOpen = drawer && wanted;
	const change = React.useRef(onOpenChange);
	change.current = onOpenChange;
	const setOpen = React.useCallback((v: boolean) => {
		setInnerOpen(v);
		change.current?.(v);
	}, []);
	// Growing past the breakpoint closes the drawer, so it doesn't reopen on the next shrink.
	const wantedRef = React.useRef(wanted);
	wantedRef.current = wanted;
	React.useEffect(() => {
		if (!isMobile && wantedRef.current) setOpen(false);
	}, [isMobile, setOpen]);
	const value = React.useMemo(
		() => ({
			isMobile,
			open: isOpen,
			setOpen,
			close: () => setOpen(false),
			collapsed: !drawer && rail.collapsed,
			toggle: () => (drawer ? setOpen(!isOpen) : rail.toggle?.()),
			drawer,
			panelId: rail.panelId,
			register,
			scoped: _scoped,
		}),
		[isMobile, isOpen, setOpen, drawer, rail, _scoped],
	);
	return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarState {
	const ctx = React.useContext(SidebarContext);
	if (!ctx) throw new Error("useSidebar() must be used inside <SidebarProvider> or a <Sidebar>");
	const { isMobile, open, setOpen, close, toggle, collapsed } = ctx;
	return { isMobile, open, setOpen, close, toggle, collapsed };
}

export function SidebarTrigger({
	"aria-label": ariaLabel = "Open navigation",
	children,
	className,
	style,
}: SidebarTriggerProps) {
	const ctx = React.useContext(SidebarContext);
	if (!ctx?.drawer) return null;
	return (
		<button
			type="button"
			aria-label={ariaLabel}
			aria-expanded={ctx.open}
			aria-controls={ctx.open ? ctx.panelId : undefined}
			onClick={ctx.toggle}
			className={["q-sidebar-trigger", className].filter(Boolean).join(" ")}
			style={style}
		>
			{children ?? <span aria-hidden="true">{"≡"}</span>}
		</button>
	);
}

function SideItem({
	it,
	on,
	collapsed,
	onPick,
}: {
	it: SidebarItem;
	on?: boolean;
	collapsed: boolean;
	onPick: (value: string) => void;
}) {
	const off = it.disabled;
	const A = useLinkElement(it.href);
	const El: React.ElementType = it.href && !off ? A : "button";
	return (
		<El
			href={it.href}
			className="q-sidebar__item"
			type={El === "button" ? "button" : undefined}
			disabled={El === "button" ? off : undefined}
			title={collapsed ? (typeof it.label === "string" ? it.label : undefined) : undefined}
			aria-current={on ? "page" : undefined}
			onClick={(e: React.MouseEvent) => {
				if (off) return;
				if (!it.href) e.preventDefault();
				it.onClick?.();
				onPick((it.value ?? it.label) as string);
			}}
		>
			<span
				aria-hidden="true"
				className={it.icon ? "q-sidebar__icon" : "q-sidebar__icon q-sidebar__icon--initials"}
			>
				{it.icon ??
					(collapsed
						? String(typeof it.label === "string" ? it.label : "")
								.slice(0, 2)
								.toUpperCase()
						: null)}
			</span>
			{!collapsed && <span className="q-sidebar__label">{it.label}</span>}
			{!collapsed && it.badge != null && (
				<span aria-hidden="true" className="q-sidebar__badge">
					{it.badge}
				</span>
			)}
			{/* Badges are announced as "Projects (14)" (or badgeLabel); in the rail the label is announced too. */}
			{(collapsed || it.badge != null) && (
				<span className="q-sr-only">
					{collapsed ? it.label : null}
					{it.badge != null ? `${(collapsed ? " (" : "(") + (it.badgeLabel ?? it.badge)})` : null}
				</span>
			)}
		</El>
	);
}

// quiet: without a SidebarProvider the Sidebar scopes its own, so useSidebar() works in its slots.
export function Sidebar(props: SidebarProps) {
	const ctx = React.useContext(SidebarContext);
	if (ctx) return <SidebarView {...props} />;
	return (
		<SidebarProvider breakpoint={props.breakpoint ?? 0} _scoped>
			<SidebarView {...props} />
		</SidebarProvider>
	);
}

function SidebarView({
	items,
	groups,
	value,
	defaultValue,
	onChange,
	header,
	footer,
	collapsed,
	defaultCollapsed = false,
	onCollapsedChange,
	collapsible = false,
	compact = false,
	dividers = false,
	width,
	collapsedWidth,
	mobile,
	label,
	"aria-label": ariaLabel,
	className,
	style,
}: SidebarProps) {
	const ctx = React.useContext(SidebarContext)!;
	const mode = mobile ?? (ctx.scoped ? "rail" : "drawer");
	const drawer = mode === "drawer" && ctx.isMobile;
	const [innerVal, setInnerVal] = React.useState<string | undefined>(defaultValue);
	const [innerCol, setInnerCol] = React.useState(defaultCollapsed);
	const isCol = !drawer && (collapsed ?? (innerCol || ctx.isMobile));
	const cur = value ?? innerVal;
	const pick = (v: string) => {
		setInnerVal(v);
		onChange?.(v);
		if (drawer) ctx.close();
	};
	const toggle = () => {
		setInnerCol(!isCol);
		onCollapsedChange?.(!isCol);
	};
	const gs: SidebarGroup[] = groups || [{ items: items || [] }];
	const uid = React.useId();
	const [shut, setShut] = React.useState(() =>
		gs.map((g) => !!g.collapsible && g.defaultOpen === false),
	);

	const toggleRef = React.useRef(toggle);
	toggleRef.current = toggle;
	const { register } = ctx;
	React.useLayoutEffect(() => {
		register({
			collapsed: isCol,
			drawer: mode === "drawer",
			toggle: () => toggleRef.current(),
			panelId: `${uid}panel`,
		});
	}, [register, isCol, mode, uid]);
	React.useEffect(() => () => register(UNREGISTERED), [register]);

	const { mounted, state } = usePresence(drawer && ctx.open, 160);
	const live = drawer && ctx.open && mounted;
	const wrap = React.useRef<HTMLDivElement>(null);
	const panel = React.useRef<HTMLDivElement>(null);
	// Same order as Drawer: the background is released before focus returns to the trigger.
	useModalBackground(wrap, live);
	useFocusTrap(panel, live);
	useEscape(live, ctx.close);

	// Distinct default landmark name from the group labels, e.g. "Sidebar: Workspace, Account".
	const gl = gs.map((g) => g.label).filter((l) => typeof l === "string");
	const name = ariaLabel ?? label ?? (gl.length ? `Sidebar: ${gl.join(", ")}` : "Sidebar");
	if (drawer && !mounted) return null;
	const nav = (
		<nav
			aria-label={name}
			className={[
				"q-sidebar",
				isCol && "q-sidebar--collapsed",
				compact && "q-sidebar--compact",
				dividers && "q-sidebar--dividers",
				drawer && "q-sidebar--drawer",
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				...(width != null ? { "--_width": px(width) } : null),
				...(collapsedWidth != null ? { "--_collapsed-width": px(collapsedWidth) } : null),
				...style,
			}}
		>
			{(header || collapsible || drawer) && (
				<div className="q-sidebar__header">
					{!isCol && header}
					{drawer ? (
						<button
							type="button"
							aria-label="Close navigation"
							onClick={ctx.close}
							className="q-sidebar__toggle"
						>
							{"×"}
						</button>
					) : (
						collapsible && (
							<button
								type="button"
								aria-label={isCol ? "Expand sidebar" : "Collapse sidebar"}
								onClick={toggle}
								className="q-sidebar__toggle"
							>
								{isCol ? "→" : "←"}
							</button>
						)
					)}
				</div>
			)}
			<div className="q-sidebar__body">
				{gs.map((g, gi) => (
					<div key={gi} className="q-sidebar__group">
						{g.label &&
							!isCol &&
							(g.collapsible ? (
								<button
									type="button"
									id={`${uid}g${gi}`}
									aria-expanded={!shut[gi]}
									aria-controls={`${uid}l${gi}`}
									onClick={() => setShut((sh) => sh.map((x, j) => (j === gi ? !x : x)))}
									className="q-sidebar__group-label"
								>
									{g.label}
									<span aria-hidden="true" className="q-sidebar__chevron">
										{"▾"}
									</span>
								</button>
							) : (
								<div id={`${uid}g${gi}`} className="q-sidebar__group-label">
									{g.label}
								</div>
							))}
						{(() => {
							const ul = (
								<ul
									id={`${uid}l${gi}`}
									aria-labelledby={g.label && !isCol ? `${uid}g${gi}` : undefined}
									className="q-sidebar__list"
								>
									{g.items.map((it, i) => (
										<li key={i}>
											<SideItem
												it={it}
												on={(it.value ?? it.label) === cur || it.active}
												collapsed={isCol}
												onPick={pick}
											/>
										</li>
									))}
								</ul>
							);
							return g.collapsible && !isCol ? (
								<div className="q-collapse" data-open={String(!shut[gi])}>
									<div className="q-collapse-inner" inert={shut[gi] ? true : undefined}>
										{ul}
									</div>
								</div>
							) : (
								ul
							);
						})()}
					</div>
				))}
			</div>
			{footer && !isCol && <div className="q-sidebar__footer">{footer}</div>}
		</nav>
	);
	if (!drawer) return nav;
	return (
		<div ref={wrap} className="q-sidebar-drawer">
			<div
				className="q-sidebar-drawer__scrim q-anim-fade"
				data-state={state}
				onClick={ctx.close}
				aria-hidden="true"
			/>
			<div
				ref={panel}
				id={`${uid}panel`}
				role="dialog"
				aria-modal="true"
				aria-label={name}
				tabIndex={-1}
				className="q-sidebar-drawer__panel q-anim-slide-left"
				data-state={state}
			>
				{nav}
			</div>
		</div>
	);
}
