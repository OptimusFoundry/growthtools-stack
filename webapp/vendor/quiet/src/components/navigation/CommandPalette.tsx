import React from "react";
import { useEscape, useFocusTrap, usePresence } from "../../a11y/hooks";
import "./CommandPalette.scss";

/**
 * ⌘K palette. Filter-as-you-type, grouped results, full keyboard control.
 * @startingPoint section="Navigation" subtitle="⌘K command palette" viewport="900x600"
 */
export interface CommandPaletteItem {
	id?: string;
	label: string;
	description?: string;
	group?: string;
	icon?: React.ReactNode;
	shortcut?: string;
	/** Receives the item itself (typed as the caller's item type when it extends this one) */
	onSelect?: (item: this) => void;
}

export interface CommandPaletteProps<Item extends CommandPaletteItem = CommandPaletteItem> {
	open: boolean;
	onClose?: () => void;
	/** Called on ⌘K / Ctrl+K when hotkey is on */
	onOpen?: () => void;
	items: Item[];
	placeholder?: string;
	emptyText?: React.ReactNode;
	hotkey?: boolean;
	/** Accessible name for the dialog */
	label?: string;
}

export function CommandPalette<Item extends CommandPaletteItem = CommandPaletteItem>({
	open,
	onClose,
	onOpen,
	items = [],
	placeholder = "Type a command or search",
	emptyText = "Nothing matches.",
	hotkey = true,
	label = "Command palette",
}: CommandPaletteProps<Item>) {
	const [q, setQ] = React.useState("");
	const [active, setActive] = React.useState(0);
	const listRef = React.useRef<HTMLDivElement>(null);
	const dlgRef = React.useRef<HTMLDivElement>(null);
	const uid = React.useId();
	// Exit animation keeps it mounted briefly; focus moves in on open and returns to the opener on close.
	const { mounted, state } = usePresence(open, 160);
	useFocusTrap(dlgRef, open && mounted);
	useEscape(open, onClose);
	React.useEffect(() => {
		if (!hotkey || !onOpen) return;
		const k = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				onOpen();
			}
		};
		window.addEventListener("keydown", k);
		return () => window.removeEventListener("keydown", k);
	}, [hotkey, onOpen]);
	React.useEffect(() => {
		if (open) {
			setQ("");
			setActive(0);
		}
	}, [open]);
	const ql = q.toLowerCase();
	const flat = items.filter(
		(it) =>
			!ql ||
			String(it.label).toLowerCase().includes(ql) ||
			String(it.description || "")
				.toLowerCase()
				.includes(ql) ||
			String(it.group || "")
				.toLowerCase()
				.includes(ql),
	);
	const order: string[] = [];
	const byGroup: Record<string, Item[]> = {};
	flat.forEach((it) => {
		const g = it.group || "";
		if (!byGroup[g]) {
			byGroup[g] = [];
			order.push(g);
		}
		byGroup[g]!.push(it);
	});
	const sorted = order.flatMap((g) => byGroup[g]!);
	// Keep the active option in view as it moves.
	React.useEffect(() => {
		const el = document.getElementById(`${uid}o${active}`);
		const p = listRef.current;
		if (el && p) {
			if (el.offsetTop < p.scrollTop) p.scrollTop = el.offsetTop;
			else if (el.offsetTop + el.offsetHeight > p.scrollTop + p.clientHeight)
				p.scrollTop = el.offsetTop + el.offsetHeight - p.clientHeight;
		}
	}, [active, uid]);
	if (!mounted) return null;
	const run = (it: Item | undefined) => {
		it?.onSelect?.(it);
		onClose?.();
	};
	const key = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((a) => Math.min(sorted.length - 1, a + 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((a) => Math.max(0, a - 1));
		} else if (e.key === "Enter") {
			e.preventDefault();
			run(sorted[active]);
		} else if (e.key === "Home" || e.key === "End") {
			e.preventDefault();
			setActive(e.key === "Home" ? 0 : Math.max(0, sorted.length - 1));
		}
	};
	let idx = -1;
	return (
		<div className="q-command-palette q-anim-fade" data-state={state} onClick={onClose}>
			<div
				ref={dlgRef}
				role="dialog"
				aria-modal="true"
				aria-label={label}
				className="q-command-palette__dialog q-anim-scale"
				data-state={state}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="q-command-palette__search">
					<span aria-hidden="true" className="q-command-palette__slash">
						/
					</span>
					<input
						role="combobox"
						aria-expanded="true"
						aria-controls={`${uid}list`}
						aria-autocomplete="list"
						aria-activedescendant={sorted[active] ? `${uid}o${active}` : undefined}
						value={q}
						onChange={(e) => {
							setQ(e.target.value);
							setActive(0);
						}}
						onKeyDown={key}
						placeholder={placeholder}
						aria-label="Search commands"
						className="q-command-palette__input"
					/>
					<span aria-hidden="true" className="q-command-palette__hint">
						Esc
					</span>
				</div>
				<div className="q-sr-only" role="status">
					{q
						? sorted.length === 0
							? "No results"
							: sorted.length + (sorted.length === 1 ? " result" : " results")
						: ""}
				</div>
				<div
					ref={listRef}
					id={`${uid}list`}
					role="listbox"
					aria-label="Commands"
					className="q-command-palette__list"
				>
					{sorted.length === 0 && <div className="q-command-palette__empty">{emptyText}</div>}
					{order.map((g, gi) => (
						<div
							key={g || "_"}
							role={g ? "group" : "presentation"}
							aria-labelledby={g ? `${uid}g${gi}` : undefined}
						>
							{g && (
								<div
									id={`${uid}g${gi}`}
									role="presentation"
									className="q-command-palette__group-label"
								>
									{g}
								</div>
							)}
							{byGroup[g]!.map((it) => {
								idx++;
								const i = idx;
								const on = i === active;
								return (
									<div
										key={it.id ?? it.label}
										id={`${uid}o${i}`}
										role="option"
										aria-selected={on}
										data-active={on}
										onMouseMove={() => setActive(i)}
										onClick={() => run(it)}
										className="q-command-palette__option"
									>
										{it.icon && (
											<span aria-hidden="true" className="q-command-palette__option-icon">
												{it.icon}
											</span>
										)}
										<span className="q-command-palette__option-text">
											<span className="q-command-palette__option-label">{it.label}</span>
											{it.description && (
												<span className="q-command-palette__option-description">
													{it.description}
												</span>
											)}
										</span>
										{it.shortcut && (
											<span aria-hidden="true" className="q-command-palette__hint">
												{it.shortcut}
											</span>
										)}
										{on && (
											<span aria-hidden="true" className="q-command-palette__option-enter">
												{"\u21b5"}
											</span>
										)}
									</div>
								);
							})}
						</div>
					))}
				</div>
				<div aria-hidden="true" className="q-command-palette__footer">
					<span>{"\u2191\u2193"} Navigate</span>
					<span>{"\u21b5"} Select</span>
					<span>Esc Close</span>
				</div>
			</div>
		</div>
	);
}
