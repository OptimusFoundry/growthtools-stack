import type React from "react";
import "./ProcessStep.scss";

/** One pass of the forge process: rail, roman numeral, title, description. */
export interface ProcessStepProps {
	/** Lowercase roman numeral: i, ii, iii, iv */
	numeral: string;
	title: React.ReactNode;
	children?: React.ReactNode;
	/** Heated — rail and numeral turn molten (1s linear) */
	hot?: boolean;
	/** Heading level for the title; default 3 */
	headingLevel?: 2 | 3 | 4 | 5 | 6;
	className?: string;
	style?: React.CSSProperties;
}

export function ProcessStep({
	numeral,
	title,
	children,
	hot = false,
	headingLevel = 3,
	className,
	style,
}: ProcessStepProps) {
	const H = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";
	return (
		<div
			className={["q-process-step", hot && "q-process-step--hot", className]
				.filter(Boolean)
				.join(" ")}
			style={style}
		>
			<div className="q-process-step__bar" />
			<div className="q-process-step__numeral">{numeral}</div>
			<H className="q-process-step__title">{title}</H>
			{children && <div className="q-process-step__body">{children}</div>}
		</div>
	);
}
