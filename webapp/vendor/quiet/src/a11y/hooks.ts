// Shared behaviour for the a11y + motion layer added on top of the Optimus Foundry components.
// Components import from here instead of re-implementing focus, keyboard and presence logic.
import {
	type KeyboardEvent,
	type Ref,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { TokenName } from "../styles/tokens.generated";

const FOCUSABLE =
	'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

export function focusables(root: HTMLElement | null): HTMLElement[] {
	if (!root) return [];
	return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
		(el) => !el.hasAttribute("inert") && el.getClientRects().length > 0,
	);
}

/**
 * While active: moves focus into `ref`, keeps Tab inside it, restores focus on deactivate.
 * It takes hold in a layout effect, in the commit that shows `ref`: as a passive effect it can run
 * after the first click on the new surface (a scrim mousedown has already moved focus to <body>)
 * and would capture <body> as the element to restore. The restore stays in a passive cleanup:
 * a layout cleanup runs inside React's commit, which re-focuses the element that had focus before
 * the commit (still inside the closing surface) and so undoes it.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
	const previous = useRef<HTMLElement | null>(null);
	useLayoutEffect(() => {
		if (!active) return;
		const root = ref.current;
		previous.current = document.activeElement as HTMLElement | null;
		const first = focusables(root)[0];
		if (root && !root.contains(document.activeElement))
			(first ?? root).focus({ preventScroll: true });
		const onKey = (e: globalThis.KeyboardEvent) => {
			if (e.key !== "Tab" || !root) return;
			const items = focusables(root);
			if (items.length === 0) {
				e.preventDefault();
				return;
			}
			const head = items[0] as HTMLElement;
			const tail = items[items.length - 1] as HTMLElement;
			if (
				e.shiftKey &&
				(document.activeElement === head || !root.contains(document.activeElement))
			) {
				e.preventDefault();
				tail.focus();
			} else if (!e.shiftKey && document.activeElement === tail) {
				e.preventDefault();
				head.focus();
			}
		};
		document.addEventListener("keydown", onKey, true);
		return () => document.removeEventListener("keydown", onKey, true);
	}, [active, ref]);
	useEffect(() => {
		if (!active) return;
		return () => {
			const el = previous.current;
			if (el?.isConnected) el.focus({ preventScroll: true });
		};
	}, [active]);
}

/** Calls `onEscape` on Escape while active. */
export function useEscape(active: boolean, onEscape: (() => void) | undefined) {
	const cb = useRef(onEscape);
	cb.current = onEscape;
	useEffect(() => {
		if (!active) return;
		const onKey = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape") cb.current?.();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [active]);
}

/** Calls `onOutside` for pointer downs outside every given ref while active. */
export function useOutside(
	refs: RefObject<HTMLElement | null>[],
	active: boolean,
	onOutside: () => void,
) {
	const cb = useRef(onOutside);
	cb.current = onOutside;
	useEffect(() => {
		if (!active) return;
		const onDown = (e: PointerEvent) => {
			if (refs.every((r) => !r.current?.contains(e.target as Node))) cb.current();
		};
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	}, [active, refs]);
}

/**
 * Arrow-key focus movement between items matching `selector` inside the container
 * (roving tabindex pattern). Returns an onKeyDown handler for the container.
 */
export function rovingKeyDown(
	selector: string,
	orientation: "horizontal" | "vertical" | "both" = "horizontal",
	{ activate = false }: { activate?: boolean } = {},
) {
	return (e: KeyboardEvent<Element>) => {
		const next = ["ArrowRight", "ArrowDown"].filter((k) =>
			orientation === "both"
				? true
				: orientation === "horizontal"
					? k === "ArrowRight"
					: k === "ArrowDown",
		);
		const prev = ["ArrowLeft", "ArrowUp"].filter((k) =>
			orientation === "both"
				? true
				: orientation === "horizontal"
					? k === "ArrowLeft"
					: k === "ArrowUp",
		);
		const items = [...e.currentTarget.querySelectorAll<HTMLElement>(selector)].filter(
			(el) => !(el as HTMLButtonElement).disabled && el.getAttribute("aria-disabled") !== "true",
		);
		const i = items.indexOf(document.activeElement as HTMLElement);
		let to = -1;
		if (next.includes(e.key)) to = (i + 1) % items.length;
		else if (prev.includes(e.key)) to = (i - 1 + items.length) % items.length;
		else if (e.key === "Home") to = 0;
		else if (e.key === "End") to = items.length - 1;
		const target = items[to];
		if (!target) return;
		e.preventDefault();
		target.focus();
		if (activate) target.click();
	};
}

/**
 * Keeps an element mounted while its exit animation plays.
 * `state` is "open" | "closing"; render while `mounted`, set data-state={state}.
 */
export function usePresence(open: boolean, exitMs = 160) {
	const [mounted, setMounted] = useState(open);
	const [state, setState] = useState<"open" | "closing">(open ? "open" : "closing");
	useEffect(() => {
		if (open) {
			setMounted(true);
			setState("open");
			return;
		}
		if (!mounted) return;
		setState("closing");
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const t = setTimeout(() => setMounted(false), reduce ? 0 : exitMs);
		return () => clearTimeout(t);
	}, [open, exitMs, mounted]);
	return { mounted, state };
}

/** Reads a motion token for the Web Animations API: durations in ms, easings as strings. */
export function motionToken(el: Element, name: TokenName): string | number {
	const raw = getComputedStyle(el).getPropertyValue(name).trim();
	const ms = raw.match(/^([\d.]+)(m?s)$/);
	if (ms) return Number(ms[1]) * (ms[2] === "s" ? 1000 : 1);
	return raw;
}

/**
 * While active: everything outside `ref`'s branch is inert and the page doesn't scroll.
 * A layout effect, so the background is inert from the commit that shows the modal, and released
 * before useFocusTrap's (passive) restore returns focus to it.
 */
export function useModalBackground(ref: RefObject<HTMLElement | null>, active: boolean) {
	useLayoutEffect(() => {
		if (!active || !ref.current) return;
		const done: HTMLElement[] = [];
		for (let n = ref.current; n.parentElement && n !== document.body; n = n.parentElement)
			for (const sib of n.parentElement.children)
				if (sib instanceof HTMLElement && sib !== n && !sib.inert && sib.tagName !== "SCRIPT") {
					sib.inert = true;
					done.push(sib);
				}
		const overflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			for (const sib of done) sib.inert = false;
			document.body.style.overflow = overflow;
		};
	}, [active, ref]);
}

/** One callback ref that feeds both refs, so a component can keep its own ref and forward the caller's. */
export function useMergedRef<T>(own: Ref<T> | undefined, forwarded: Ref<T> | undefined) {
	return useCallback(
		(node: T | null) => {
			for (const r of [own, forwarded]) {
				if (typeof r === "function") r(node);
				else if (r) (r as RefObject<T | null>).current = node;
			}
		},
		[own, forwarded],
	);
}
