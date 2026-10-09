import type React from "react";
import "./Label.scss";

/**
 * Mono caps field label with required mark, sub text, badge and trailing action.
 * @startingPoint section="Forms" subtitle="Field labels" viewport="600x200"
 */
export interface LabelProps {
	children: React.ReactNode;
	htmlFor?: string;
	/** Molten asterisk */
	required?: boolean;
	subText?: React.ReactNode;
	badge?: React.ReactNode;
	/** Right-aligned, e.g. a Link "Forgot?" */
	action?: React.ReactNode;
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];

export function Label({
	children,
	htmlFor,
	required = false,
	subText,
	badge,
	action,
	size = "md",
	disabled = false,
	className,
	style,
}: LabelProps) {
	const cls = ["q-label", `q-label--${SIZES.includes(size) ? size : "md"}`, className]
		.filter(Boolean)
		.join(" ");
	return (
		<div aria-disabled={disabled || undefined} className={cls} style={style}>
			<div className="q-label__row">
				<label htmlFor={htmlFor} className="q-label__text">
					<span>
						{children}
						{required && (
							<span aria-hidden="true" className="q-label__required">
								*
							</span>
						)}
						{required && <span className="q-sr-only"> (required)</span>}
					</span>
					{badge}
				</label>
				{action}
			</div>
			{subText && <span className="q-label__sub">{subText}</span>}
		</div>
	);
}
