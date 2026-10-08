import React from "react";
import { createPortal } from "react-dom";
import type { ToastProps } from "./Toast";
import { Toast } from "./Toast";
import "./Toaster.scss";

/**
 * Fixed, portalled stack for Toasts raised with `toast()`. Mount one near the app root; extra
 * Toasters stay inert, so toasts never render twice. The stack is a polite live region; error
 * toasts announce assertively (role="alert"), the rest are role="status".
 */
export interface ToasterProps {
	position?:
		| "top-left"
		| "top-center"
		| "top-right"
		| "bottom-left"
		| "bottom-center"
		| "bottom-right";
	/** Default ms before a toast closes itself (paused while hovered or focused); 0 keeps it until dismissed */
	duration?: number;
	/** Most toasts shown at once; the oldest give way. 0 = no limit */
	max?: number;
	/** Accessible name of the notifications region */
	label?: string;
	className?: string;
	style?: React.CSSProperties;
}

export interface ToastOptions {
	/** Reuse an id to replace a toast in place */
	id?: string;
	title?: React.ReactNode;
	description?: React.ReactNode;
	meta?: React.ReactNode;
	/** Semantic intent; `error` is announced assertively */
	status?: "info" | "success" | "warning" | "error";
	/** Toast's visual variant; wins over `status` */
	variant?: ToastProps["variant"];
	action?: React.ReactNode;
	/** ms before it closes itself; 0 or Infinity keeps it until dismissed. Defaults to the Toaster's */
	duration?: number;
	/** Called after the toast closes (× button or timeout) */
	onDismiss?: (id: string) => void;
}
export interface ToastFn {
	/** Shows a toast and returns its id. A string or element is shorthand for `{ title }`. */
	(options: ToastOptions | React.ReactNode): string;
	/** Removes one toast, or every toast when called without an id */
	dismiss(id?: string): void;
}

type ToasterScope = {
	"data-theme": string | null;
	"data-density": string | undefined;
	style: React.CSSProperties;
};

const POSITIONS: string[] = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];

// One store per page: toast() can be called from anywhere, and only the first mounted Toaster renders it.
type ToastEntry = ToastOptions & { id: string };
let state: { toasts: ToastEntry[]; hosts: string[] } = { toasts: [], hosts: [] };
let seq = 0;
const listeners = new Set<() => void>();
const commit = (next: Partial<typeof state>) => {
	state = { ...state, ...next };
	listeners.forEach((l) => {
		l();
	});
};
const subscribe = (l: () => void) => {
	listeners.add(l);
	return () => listeners.delete(l);
};
const snapshot = () => state;

export function toast(options: ToastOptions | React.ReactNode): string {
	const opts: ToastOptions =
		typeof options === "string" || React.isValidElement(options)
			? { title: options }
			: { ...(options as ToastOptions) };
	const id = opts.id ?? `q-toast-${++seq}`;
	commit({ toasts: [...state.toasts.filter((t) => t.id !== id), { ...opts, id }] });
	return id;
}
toast.dismiss = (id?: string) =>
	commit({ toasts: id == null ? [] : state.toasts.filter((t) => t.id !== id) });

// toast() takes the semantic `status`; Toast's own `variant` still wins when given.
const kindOf = (t: ToastOptions) =>
	t.variant ?? (t.status && t.status !== "info" ? t.status : "default");

export function Toaster({
	position = "bottom-right",
	duration = 5000,
	max = 5,
	label = "Notifications",
	className,
	style,
}: ToasterProps) {
	const { toasts, hosts } = React.useSyncExternalStore(subscribe, snapshot, snapshot);
	const token = React.useId();
	const anchor = React.useRef<HTMLSpanElement>(null);
	const [scope, setScope] = React.useState<ToasterScope | null>(null);
	React.useEffect(() => {
		commit({ hosts: [...state.hosts, token] });
		return () => commit({ hosts: state.hosts.filter((h) => h !== token) });
	}, [token]);
	// The portal leaves the QuietRoot subtree, so it carries the nearest theme, density and accent with it.
	React.useLayoutEffect(() => {
		const root = anchor.current?.closest<HTMLElement>("[data-theme]");
		if (!root) return;
		const accent = root.style.getPropertyValue("--q-accent");
		const next: ToasterScope = {
			"data-theme": root.getAttribute("data-theme"),
			"data-density": root.getAttribute("data-density") ?? undefined,
			style: {
				colorScheme: root.style.colorScheme || undefined,
				...(accent ? { "--q-accent": accent } : {}),
			} as React.CSSProperties,
		};
		setScope((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
	});
	const host = hosts[0] === token && typeof document !== "undefined";
	const pos = POSITIONS.includes(position) ? position : "bottom-right";
	const shown = max > 0 ? toasts.slice(-max) : toasts;
	const cls = ["quiet", "q-toaster", `q-toaster--${pos}`, className].filter(Boolean).join(" ");
	return (
		<>
			<span ref={anchor} hidden />
			{host &&
				createPortal(
					<section
						aria-label={label}
						className={cls}
						data-quiet=""
						{...scope}
						style={{ ...scope?.style, ...style }}
					>
						{/* The live region exists before any toast does, so insertions are announced; errors are assertive via Toast's role="alert". */}
						<ol className="q-toaster__list" aria-live="polite" aria-relevant="additions">
							{shown.map((t) => (
								<ToasterItem key={t.id} t={t} duration={duration} />
							))}
						</ol>
					</section>,
					document.body,
				)}
		</>
	);
}

function ToasterItem({ t, duration }: { t: ToastEntry; duration: number }) {
	const kind = kindOf(t);
	const ms = t.duration === undefined ? duration : t.duration;
	const close = () => {
		toast.dismiss(t.id);
		t.onDismiss?.(t.id);
	};
	return (
		<li className="q-toaster__item">
			<Toast
				title={t.title}
				description={t.description}
				meta={t.meta}
				variant={kind}
				action={t.action}
				onClose={close}
				duration={Number.isFinite(ms) ? ms : 0}
			/>
		</li>
	);
}
