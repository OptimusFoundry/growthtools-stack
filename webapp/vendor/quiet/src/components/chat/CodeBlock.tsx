import type React from "react";
import { Button } from "../core/Button";
import { useCopy } from "./chat-utils";
import "./CodeBlock.scss";

/**
 * Code in a reply: mono, scrolls sideways rather than wrapping (unless `wrap`), with a language label
 * and a Copy button. No highlighter; pass highlighted `children` with `code` for the copy text.
 */
export interface CodeBlockProps {
	/** The source; also what Copy copies */
	code?: string;
	/** Rendered instead of `code` when given (e.g. pre-highlighted spans) */
	children?: React.ReactNode;
	language?: string;
	filename?: string;
	wrap?: boolean;
	/** Caps the height; the code scrolls */
	maxHeight?: number | string;
	className?: string;
	style?: React.CSSProperties;
}

// Code in a reply: mono, scrolls sideways rather than wrapping (unless `wrap`), language label and
// a Copy button. No highlighter — plain ink keeps it quiet; products can pass highlighted children.
export function CodeBlock({
	code,
	children,
	language,
	filename,
	wrap = false,
	maxHeight,
	className,
	style,
}: CodeBlockProps) {
	const source = code ?? (typeof children === "string" ? children : "");
	const [copyState, copy] = useCopy();
	const label = [filename, language].filter(Boolean).join(" · ") || "Code";
	const cls = ["q-code-block", wrap && "q-code-block--wrap", className].filter(Boolean).join(" ");
	return (
		<figure
			className={cls}
			style={
				maxHeight
					? ({
							"--_max-height": typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
							...style,
						} as React.CSSProperties)
					: style
			}
		>
			<figcaption className="q-code-block__header">
				<span className="q-code-block__language">{label}</span>
				<Button
					variant="ghost"
					size="sm"
					className="q-code-block__copy"
					onClick={() => copy(source)}
					aria-label={copyState === "copied" ? "Copied" : "Copy code"}
				>
					{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
				</Button>
			</figcaption>
			{/* Focusable so the code can be scrolled from the keyboard. */}
			<pre className="q-code-block__pre" tabIndex={0} aria-label={label}>
				<code className="q-code-block__code">{code ?? children}</code>
			</pre>
			<span role="status" className="q-sr-only">
				{copyState === "copied"
					? "Code copied to clipboard"
					: copyState === "failed"
						? "Copy failed"
						: ""}
			</span>
		</figure>
	);
}
