import React from "react";
import { rovingKeyDown, useEscape, useOutside, usePresence } from "../../a11y/hooks";
import "./DropdownMenu.scss";

/** One action in a DropdownMenu. `Item` is the item's own type, so its handlers receive it whole. */
type DropdownMenuAction<Item> = {
	label: React.ReactNode;
	sublabel?: React.ReactNode;
	icon?: React.ReactNode;
	shortcut?: string;
	onSelect?: (item: Item) => void;
	disabled?: boolean;
	danger?: boolean;
	checked?: boolean;
	active?: boolean;
};
interface DropdownMenuItem extends DropdownMenuAction<DropdownMenuItem> {}

/**
 * Action menu: icons, shortcuts, checkbox items, group labels, header, caption, context-menu mode.
 * @startingPoint section="Overlays" subtitle="Action & context menus" viewport="600x440"
 */
export interface DropdownMenuProps<Item extends DropdownMenuAction<Item> = DropdownMenuItem> {
	/** Clickable element that opens the menu */
	trigger?: React.ReactNode;
	items: Array<Item | { divider: true } | { group: React.ReactNode }>;
	/** e.g. account name + email */
	header?: React.ReactNode;
	/** Mono footer line */
	caption?: React.ReactNode;
	size?: "sm" | "md";
	align?: "start" | "end";
	width?: number;
	/** Right-click children to open at the pointer */
	contextMenu?: boolean;
	children?: React.ReactNode;
	onSelect?: (item: Item) => void;
	/** Accessible name for the menu; defaults to the trigger's text ("Context menu" in context-menu mode) */
	label?: string;
	className?: string;
	style?: React.CSSProperties;
}

type MenuFlat<Item> = Item & { divider?: true; group?: React.ReactNode };

const ITEM = '[role^="menuitem"]';
const roving = rovingKeyDown(ITEM, "vertical");

function MenuItem<Item extends DropdownMenuAction<Item>>({
	it,
	size,
	onPick,
}: {
	it: Item;
	size: string;
	onPick: (it: Item) => void;
}) {
	const armed = React.useRef(false);
	const off = it.disabled;
	const cls = [
		"q-dropdown-menu__item",
		size === "sm" && "q-dropdown-menu__item--sm",
		it.active && "q-dropdown-menu__item--active",
		it.danger && "q-dropdown-menu__item--danger",
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div
			role={it.checked != null ? "menuitemcheckbox" : "menuitem"}
			aria-checked={it.checked}
			aria-disabled={off || undefined}
			tabIndex={-1}
			className={cls}
			onClick={() => !off && onPick(it)}
			onKeyDown={(e) =>
				(e.key === "Enter" || e.key === " ") &&
				(e.preventDefault(),
				(armed.current = e.key === " "),
				e.key === "Enter" && !off && onPick(it))
			}
			onKeyUp={(e) =>
				e.key === " " && armed.current && ((armed.current = false), !off && onPick(it))
			}
		>
			{it.checked != null ? (
				<span aria-hidden="true" className="q-dropdown-menu__check">
					{it.checked ? "✓" : ""}
				</span>
			) : (
				it.icon && (
					<span aria-hidden="true" className="q-dropdown-menu__icon">
						{it.icon}
					</span>
				)
			)}
			<span className="q-dropdown-menu__label">
				<span>{it.label}</span>
				{it.sublabel && <span className="q-dropdown-menu__sublabel">{it.sublabel}</span>}
			</span>
			{it.shortcut && (
				<span aria-hidden="true" className="q-dropdown-menu__shortcut">
					{it.shortcut}
				</span>
			)}
		</div>
	);
}

export function DropdownMenu<Item extends DropdownMenuAction<Item> = DropdownMenuItem>({
	trigger,
	items = [],
	header,
	caption,
	size = "md",
	align = "start",
	width = 240,
	contextMenu = false,
	children,
	onSelect,
	label,
	className,
	style,
}: DropdownMenuProps<Item>) {
	const [open, setOpen] = React.useState(false);
	const [pt, setPt] = React.useState<{ x: number; y: number } | null>(null);
	const ref = React.useRef<HTMLDivElement>(null);
	const trig = React.useRef<HTMLSpanElement>(null);
	const list = React.useRef<HTMLDivElement>(null);
	const from = React.useRef<HTMLElement | null>(null);
	const firstFocus = React.useRef<string>("first");
	const refs = React.useMemo(() => [ref], []);
	const id = React.useId();
	const { mounted, state } = usePresence(open, 160);
	// quiet: the real trigger (a button) carries the menu-button state; a non-interactive trigger becomes the button itself.
	const [btn, setBtn] = React.useState<HTMLElement | null>(null);
	React.useLayoutEffect(() => {
		const t =
			!contextMenu && trig.current && (trig.current.firstElementChild as HTMLElement | null);
		// biome-ignore lint/complexity/useOptionalChain: t can be false, and false?.matches throws
		setBtn(t && t.matches('button,a[href],input,[role="button"]') ? t : null);
	});
	React.useLayoutEffect(() => {
		if (!btn) return;
		if (!btn.id) btn.id = `${id}-b`;
		btn.setAttribute("aria-haspopup", "menu");
		btn.setAttribute("aria-expanded", String(open));
		if (open && mounted) btn.setAttribute("aria-controls", id);
		else btn.removeAttribute("aria-controls");
	});
	const close = (refocus = true) => {
		setOpen(false);
		const t = contextMenu ? from.current : btn || trig.current;
		if (refocus && t?.isConnected) t.focus();
	};
	useEscape(open, () => close());
	useOutside(refs, open, () => setOpen(false));
	React.useEffect(() => {
		if (!open || !mounted || !list.current) return;
		const all = [...list.current.querySelectorAll<HTMLElement>(ITEM)].filter(
			(el) => el.getAttribute("aria-disabled") !== "true",
		);
		const el =
			firstFocus.current === "menu"
				? list.current
				: firstFocus.current === "last"
					? all[all.length - 1]
					: all[0];
		el?.focus({ preventScroll: true });
	}, [open, mounted]);
	const show = (where: string) => {
		firstFocus.current = where;
		from.current = document.activeElement as HTMLElement | null;
		setOpen(true);
	};
	const pick = (it: Item) => {
		it.onSelect?.(it);
		onSelect?.(it);
		if (it.checked == null) close();
	};
	const onMenuKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key === "Tab") {
			setOpen(false);
			return;
		}
		if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
			const all = [...e.currentTarget.querySelectorAll<HTMLElement>(ITEM)].filter(
				(el) => el.getAttribute("aria-disabled") !== "true",
			);
			const i = all.indexOf(document.activeElement as HTMLElement);
			const hit = [...all.slice(i + 1), ...all.slice(0, i + 1)].find((el) =>
				el.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase()),
			);
			hit?.focus();
			return;
		}
		if (e.key === "ArrowUp" && document.activeElement === e.currentTarget) {
			e.preventDefault();
			const all = e.currentTarget.querySelectorAll<HTMLElement>(ITEM);
			all.length && all[all.length - 1]!.focus();
			return;
		}
		roving(e);
	};
	// Items after a group label (up to the next divider or label) sit in a labelled role="group".
	const body: React.ReactElement[] = [];
	for (let i = 0; i < items.length; i++) {
		const it = items[i] as MenuFlat<Item>;
		if (it.divider)
			body.push(<div key={i} role="separator" className="q-dropdown-menu__separator" />);
		else if (it.group) {
			const kids: React.ReactElement[] = [];
			let j = i + 1;
			for (
				;
				j < items.length &&
				!(items[j] as MenuFlat<Item>).divider &&
				!(items[j] as MenuFlat<Item>).group;
				j++
			)
				kids.push(<MenuItem key={j} it={items[j] as Item} size={size} onPick={pick} />);
			body.push(
				<div key={i} role="group" aria-labelledby={`${id}-g${i}`}>
					<div id={`${id}-g${i}`} role="presentation" className="q-dropdown-menu__group-label">
						{it.group}
					</div>
					{kids}
				</div>,
			);
			i = j - 1;
		} else body.push(<MenuItem key={i} it={it} size={size} onPick={pick} />);
	}
	const menu = mounted && (
		<div
			ref={list}
			id={id}
			role="menu"
			tabIndex={-1}
			aria-label={label || (contextMenu ? "Context menu" : undefined)}
			aria-labelledby={label || contextMenu ? undefined : btn ? btn.id : `${id}-b`}
			onKeyDown={onMenuKey}
			className={
				"q-dropdown-menu__menu q-anim-drop" +
				(pt
					? " q-dropdown-menu__menu--at-point"
					: align === "end"
						? " q-dropdown-menu__menu--end"
						: "")
			}
			data-state={state}
			style={
				{
					"--_width": typeof width === "number" ? `${width}px` : width,
					...(pt ? { "--_x": `${pt.x}px`, "--_y": `${pt.y}px` } : null),
				} as React.CSSProperties
			}
		>
			{header && (
				<div role="presentation" className="q-dropdown-menu__header">
					{header}
				</div>
			)}
			{body}
			{caption && (
				<div role="presentation" className="q-dropdown-menu__caption">
					{caption}
				</div>
			)}
		</div>
	);
	if (contextMenu) {
		return (
			<div
				ref={ref}
				onContextMenu={(e) => {
					e.preventDefault();
					const r = ref.current!.getBoundingClientRect();
					setPt({ x: e.clientX - r.left, y: e.clientY - r.top });
					show("menu");
				}}
				className={`q-dropdown-menu q-dropdown-menu--context${className ? ` ${className}` : ""}`}
				style={style}
			>
				{children}
				{menu}
			</div>
		);
	}
	const own: React.HTMLAttributes<HTMLSpanElement> = btn
		? {}
		: {
				id: `${id}-b`,
				role: "button",
				tabIndex: 0,
				"aria-haspopup": "menu",
				"aria-expanded": open,
				"aria-controls": open && mounted ? id : undefined,
			};
	return (
		<span
			ref={ref}
			className={className ? `q-dropdown-menu ${className}` : "q-dropdown-menu"}
			style={style}
		>
			<span
				ref={trig}
				onClick={(e) => {
					setPt(null);
					if (open) setOpen(false);
					else show(e.detail === 0 ? "first" : "menu");
				}}
				{...own}
				onKeyDown={(e) => {
					if (e.key === "ArrowDown" || e.key === "ArrowUp") {
						e.preventDefault();
						setPt(null);
						show(e.key === "ArrowUp" ? "last" : "first");
					} else if (!btn && (e.key === "Enter" || e.key === " ")) {
						e.preventDefault();
						setPt(null);
						if (open) setOpen(false);
						else show("first");
					}
				}}
				className="q-dropdown-menu__trigger"
			>
				{trigger}
			</span>
			{menu}
		</span>
	);
}
