import { type RefObject, useEffect, useRef } from "react";

/**
 * Hook to detect clicks outside of a referenced element
 */
export function useClickOutside<T extends HTMLElement>(
	callback: () => void,
	enabled = true,
): RefObject<T | null> {
	const ref = useRef<T | null>(null);

	useEffect(() => {
		if (!enabled) return;

		const handleClick = (event: MouseEvent | TouchEvent) => {
			const target = event.target as Node;

			if (ref.current && !ref.current.contains(target)) {
				callback();
			}
		};

		// Use mousedown/touchstart for immediate response
		document.addEventListener("mousedown", handleClick);
		document.addEventListener("touchstart", handleClick);

		return () => {
			document.removeEventListener("mousedown", handleClick);
			document.removeEventListener("touchstart", handleClick);
		};
	}, [callback, enabled]);

	return ref;
}
