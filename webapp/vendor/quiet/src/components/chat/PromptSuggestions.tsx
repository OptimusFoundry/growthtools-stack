import React from "react";
import { rovingKeyDown } from "../../a11y/hooks";
import "./PromptSuggestions.scss";

export interface PromptSuggestion {
	label: string;
	/** What gets sent (default: the label) */
	prompt?: string;
	/** A second line, shown in the grid layout */
	description?: string;
}
/**
 * Starters for an empty thread. One tab stop: arrows, Home and End move between them; Enter or Space
 * picks one.
 */
export interface PromptSuggestionsProps {
	suggestions?: (string | PromptSuggestion)[];
	onSelect?: (prompt: string, suggestion: PromptSuggestion) => void;
	/** Accessible name of the group (default "Suggested prompts") */
	label?: string;
	/** Pills that wrap, or two-up cards with a description */
	layout?: "wrap" | "grid";
	className?: string;
	style?: React.CSSProperties;
}

// Starters for an empty thread. One tab stop; arrows (and Home/End) move between them, Enter or
// Space picks one. Each can carry a longer `prompt` than its label.
export function PromptSuggestions({
	suggestions = [],
	onSelect,
	label = "Suggested prompts",
	layout = "wrap",
	className,
	style,
}: PromptSuggestionsProps) {
	const [active, setActive] = React.useState(0);
	const items = suggestions.map((s) =>
		typeof s === "string" ? { label: s, prompt: s } : { prompt: s.label, ...s },
	);
	const onKeyDown = rovingKeyDown(".q-prompt-suggestions__item", "both");
	const cls = [
		"q-prompt-suggestions",
		`q-prompt-suggestions--${layout === "grid" ? "grid" : "wrap"}`,
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<div role="group" aria-label={label} className={cls} style={style} onKeyDown={onKeyDown}>
			{items.map((s, i) => (
				<button
					key={s.label}
					type="button"
					className="q-prompt-suggestions__item"
					tabIndex={i === Math.min(active, items.length - 1) ? 0 : -1}
					onFocus={() => setActive(i)}
					onClick={() => onSelect?.(s.prompt, s)}
				>
					<span className="q-prompt-suggestions__label">{s.label}</span>
					{s.description && (
						<span className="q-prompt-suggestions__description">{s.description}</span>
					)}
				</button>
			))}
		</div>
	);
}
