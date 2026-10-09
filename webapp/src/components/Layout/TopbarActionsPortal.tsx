/**
 * TopbarActionsPortal — lets a descendant page render content into the
 * parent Topbar's actions strip without lifting page-level state.
 *
 * Why a portal: per-tab actions (Save, Publish, etc.) belong in the Topbar
 * for visual consistency, but the state those buttons reflect (`saving`,
 * `hasUnsavedChanges`, …) lives in the page component. A portal renders
 * the affordance where design wants it while state stays where it
 * logically belongs.
 *
 * Wiring (three pieces, all coordinated by the route layout):
 *
 *   1. The route layout wraps the Topbar AND the page content in a
 *      <TopbarActionsProvider>. Both must be inside it so the portal
 *      target (registered by Topbar) and consumers (in the page) share
 *      the same context instance. This is the gotcha — Topbar and Outlet
 *      are typically siblings, so a provider INSIDE Topbar wouldn't reach
 *      the Outlet's descendants.
 *
 *   2. Topbar internally renders <TopbarActionsTargetSlot /> in the place
 *      it wants the portaled buttons to appear. That component registers
 *      its DOM element with the context.
 *
 *   3. Any descendant page renders <TopbarActionsPortal>{children}</…>;
 *      `children` get rendered into the Topbar slot via React.createPortal.
 *      Safe to drop into any subtree — if no provider is mounted (e.g. a
 *      route with no Topbar), the portal renders nothing.
 */

import { createContext, type ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";

interface TargetRef {
	target: HTMLElement | null;
	setTarget: (el: HTMLElement | null) => void;
}

const TopbarActionsTargetContext = createContext<TargetRef | null>(null);

interface TopbarActionsProviderProps {
	children: ReactNode;
}

/**
 * Wrap the route layout (Topbar + Outlet/content) in this so the portal
 * target registered by Topbar is reachable from the page descendants.
 */
export function TopbarActionsProvider({
	children,
}: TopbarActionsProviderProps) {
	const [target, setTarget] = useState<HTMLElement | null>(null);
	return (
		<TopbarActionsTargetContext.Provider value={{ target, setTarget }}>
			{children}
		</TopbarActionsTargetContext.Provider>
	);
}

interface TopbarActionsTargetSlotProps {
	className?: string;
}

/**
 * Used by Topbar internally to register its DOM slot as the portal target.
 * Renders an empty div with the given className; pages portal their action
 * buttons into this div.
 */
export function TopbarActionsTargetSlot({
	className,
}: TopbarActionsTargetSlotProps) {
	const ctx = useContext(TopbarActionsTargetContext);
	return (
		<div
			ref={(el) => {
				ctx?.setTarget(el);
			}}
			className={className}
		/>
	);
}

interface TopbarActionsPortalProps {
	children: ReactNode;
}

/**
 * Render children into the Topbar's portal slot. Renders nothing if no
 * Topbar (no provider) is mounted.
 */
export function TopbarActionsPortal({ children }: TopbarActionsPortalProps) {
	const ctx = useContext(TopbarActionsTargetContext);
	if (!ctx?.target) return null;
	return createPortal(children, ctx.target);
}
