import React from "react";
import { rovingKeyDown } from "../../a11y/hooks";
import "./Accordion.scss";

/**
 * Hairline-separated disclosure list. + rotates to × ; content eases open.
 * @startingPoint section="Display" subtitle="Disclosure list" viewport="800x420"
 */
export interface AccordionProps {
	items: Array<{
		id?: string | number;
		title: React.ReactNode;
		description?: React.ReactNode;
		content: React.ReactNode;
		icon?: React.ReactNode;
		disabled?: boolean;
	}>;
	/** Allow several open at once */
	multiple?: boolean;
	defaultExpanded?: Array<string | number>;
	expanded?: Array<string | number>;
	onChange?: (expanded: Array<string | number>) => void;
	/** Heading level wrapping each header button; default 3 */
	headingLevel?: 2 | 3 | 4 | 5 | 6;
	className?: string;
	style?: React.CSSProperties;
}

type AccordionItem = AccordionProps["items"][number];

function Row({
	it,
	open,
	onToggle,
	headingLevel,
}: {
	it: AccordionItem;
	open: boolean;
	onToggle: () => void;
	headingLevel: number;
}) {
	const id = React.useId();
	const H = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";
	return (
		<div className="q-accordion__item">
			<H className="q-accordion__heading">
				<button
					type="button"
					id={`${id}h`}
					aria-expanded={open}
					aria-controls={`${id}p`}
					data-acc-header=""
					disabled={it.disabled}
					onClick={onToggle}
					className="q-accordion__header"
				>
					{it.icon && (
						<span aria-hidden="true" className="q-accordion__icon">
							{it.icon}
						</span>
					)}
					<span className="q-accordion__text">
						<span className="q-accordion__title">{it.title}</span>
						{it.description && <span className="q-accordion__description">{it.description}</span>}
					</span>
					<span aria-hidden="true" className="q-accordion__toggle">
						+
					</span>
				</button>
			</H>
			<div
				id={`${id}p`}
				role="region"
				aria-labelledby={`${id}h`}
				inert={!open}
				className="q-collapse"
				data-open={open}
			>
				<div className="q-collapse-inner">
					<div
						className={`q-accordion__content${it.icon ? " q-accordion__content--with-icon" : ""}`}
					>
						{it.content}
					</div>
				</div>
			</div>
		</div>
	);
}

export function Accordion({
	items = [],
	multiple = false,
	defaultExpanded = [],
	expanded,
	onChange,
	headingLevel = 3,
	className,
	style,
}: AccordionProps) {
	const [inner, setInner] = React.useState<Array<string | number>>(defaultExpanded);
	const cur = expanded ?? inner;
	const toggle = (id: string | number) => {
		const next = cur.includes(id) ? cur.filter((x) => x !== id) : multiple ? [...cur, id] : [id];
		setInner(next);
		onChange?.(next);
	};
	const nav = rovingKeyDown("[data-acc-header]", "vertical");
	return (
		<div
			onKeyDown={(e: React.KeyboardEvent<HTMLElement>) =>
				(e.target as HTMLElement).hasAttribute("data-acc-header") && nav(e)
			}
			className={["q-accordion", className].filter(Boolean).join(" ")}
			style={style}
		>
			{items.map((it, i) => {
				const id = it.id ?? i;
				return (
					<Row
						key={id}
						it={it}
						open={cur.includes(id)}
						onToggle={() => toggle(id)}
						headingLevel={headingLevel}
					/>
				);
			})}
		</div>
	);
}
