/**
 * Accessibility utilities
 */

/**
 * Generate a unique ID for accessibility purposes
 */
let idCounter = 0;
export function generateId(prefix = "proto"): string {
	idCounter += 1;
	return `${prefix}-${idCounter}`;
}

/**
 * Announce a message to screen readers
 */
export function announce(
	message: string,
	priority: "polite" | "assertive" = "polite",
): void {
	const announcement = document.createElement("div");
	announcement.setAttribute("role", "status");
	announcement.setAttribute("aria-live", priority);
	announcement.setAttribute("aria-atomic", "true");
	announcement.className = "sr-only";
	announcement.textContent = message;

	document.body.appendChild(announcement);

	// Remove after announcement
	setTimeout(() => {
		document.body.removeChild(announcement);
	}, 1000);
}

/**
 * Check if an element is visible (not hidden by CSS)
 */
export function isVisible(element: HTMLElement): boolean {
	return !!(
		element.offsetWidth ||
		element.offsetHeight ||
		element.getClientRects().length
	);
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	const focusableSelectors = [
		"a[href]",
		"area[href]",
		"input:not([disabled])",
		"select:not([disabled])",
		"textarea:not([disabled])",
		"button:not([disabled])",
		"[tabindex]:not([tabindex='-1'])",
		"[contenteditable]",
	].join(", ");

	return Array.from(
		container.querySelectorAll<HTMLElement>(focusableSelectors),
	).filter(isVisible);
}

/**
 * Check if the user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if the user prefers dark color scheme
 */
export function prefersDarkMode(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Check if the user prefers high contrast
 */
export function prefersHighContrast(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-contrast: more)").matches;
}

/**
 * ARIA attribute helpers
 */
export const aria = {
	/** Mark an element as expanded/collapsed */
	expanded: (isExpanded: boolean) => ({ "aria-expanded": isExpanded }),

	/** Mark an element as selected */
	selected: (isSelected: boolean) => ({ "aria-selected": isSelected }),

	/** Mark an element as checked */
	checked: (isChecked: boolean | "mixed") => ({ "aria-checked": isChecked }),

	/** Mark an element as disabled */
	disabled: (isDisabled: boolean) => ({ "aria-disabled": isDisabled }),

	/** Mark an element as hidden */
	hidden: (isHidden: boolean) => ({ "aria-hidden": isHidden }),

	/** Mark an element as busy/loading */
	busy: (isBusy: boolean) => ({ "aria-busy": isBusy }),

	/** Mark an element as invalid */
	invalid: (isInvalid: boolean) => ({ "aria-invalid": isInvalid }),

	/** Provide a label for an element */
	label: (label: string) => ({ "aria-label": label }),

	/** Reference another element as the label */
	labelledBy: (id: string) => ({ "aria-labelledby": id }),

	/** Reference another element as the description */
	describedBy: (id: string) => ({ "aria-describedby": id }),

	/** Indicate current page/step */
	current: (
		value: "page" | "step" | "location" | "date" | "time" | "true" | "false",
	) => ({
		"aria-current": value,
	}),
};
