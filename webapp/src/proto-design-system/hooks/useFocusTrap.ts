import { type RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTORS = [
	"a[href]",
	"area[href]",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"button:not([disabled])",
	"[tabindex]:not([tabindex='-1'])",
	"[contenteditable]",
].join(", ");

/**
 * Hook to trap focus within a container (for modals, dialogs, etc.)
 */
export function useFocusTrap<T extends HTMLElement>(
	enabled = true,
): RefObject<T | null> {
	const containerRef = useRef<T | null>(null);
	const previousActiveElement = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!enabled) return;

		const container = containerRef.current;
		if (!container) return;

		// Store the previously focused element
		previousActiveElement.current = document.activeElement as HTMLElement;

		// Get all focusable elements
		const getFocusableElements = (): HTMLElement[] => {
			return Array.from(
				container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
			).filter(
				(el) => el.offsetParent !== null, // Filter out hidden elements
			);
		};

		// Focus the first element
		const focusableElements = getFocusableElements();
		if (focusableElements.length > 0) {
			focusableElements[0]?.focus();
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return;

			const focusable = getFocusableElements();
			if (focusable.length === 0) return;

			const firstElement = focusable[0];
			const lastElement = focusable[focusable.length - 1];

			// Shift + Tab
			if (event.shiftKey) {
				if (document.activeElement === firstElement) {
					event.preventDefault();
					lastElement?.focus();
				}
			}
			// Tab
			else {
				if (document.activeElement === lastElement) {
					event.preventDefault();
					firstElement?.focus();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);

			// Restore focus to the previously focused element
			if (previousActiveElement.current) {
				previousActiveElement.current.focus();
			}
		};
	}, [enabled]);

	return containerRef;
}
