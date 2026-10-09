import type React from "react";
import "./Headline.scss";

/**
 * Headline in Inter Tight: plain lead, one italic phrase, molten full stop.
 * @startingPoint section="Typography" subtitle="Headline with italic accent and molten period" viewport="700x320"
 */
export interface HeadlineProps {
	size?: "display" | "h2" | "h3" | "h4";
	/** Override the rendered tag */
	as?: keyof React.JSX.IntrinsicElements;
	/** Upright text before the accent */
	lead?: React.ReactNode;
	/** The single italic phrase */
	accent?: React.ReactNode;
	/** Upright text after the accent */
	after?: React.ReactNode;
	/** Append the molten full stop. Default true. */
	period?: boolean;
	/** Color the italic phrase molten (then drop other molten on the surface) */
	moltenAccent?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

const TAGS: Record<string, "h1" | "h2" | "h3" | "h4"> = {
	display: "h1",
	h2: "h2",
	h3: "h3",
	h4: "h4",
};

export function Headline({
	size = "h2",
	as,
	lead,
	accent,
	after,
	period = true,
	moltenAccent = false,
	className,
	style,
}: HeadlineProps) {
	const Tag = (as || TAGS[size])! as React.ElementType;
	const cls = ["q-headline", TAGS[size] && `q-headline--${size}`, className]
		.filter(Boolean)
		.join(" ");
	return (
		<Tag className={cls} style={style}>
			{lead}
			{lead && accent ? " " : ""}
			{accent && (
				<em
					className={["q-headline__accent", moltenAccent && "q-headline__accent--molten"]
						.filter(Boolean)
						.join(" ")}
				>
					{accent}
				</em>
			)}
			{after ? (accent ? " " : "") + after : ""}
			{period && <span className="q-headline__period">.</span>}
		</Tag>
	);
}
