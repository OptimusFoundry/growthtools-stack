import React from "react";
import { rovingKeyDown } from "../../a11y/hooks";
import type { LineChartProps } from "./LineChart";
import { LineChart } from "./LineChart";
import "./NarratedChart.scss";

/**
 * A line chart that comes with its reading: short sentences, each a button that marks the point
 * or range it talks about. The narration is passed in, not generated.
 * @startingPoint section="Charts" subtitle="A chart with its reading" viewport="800x460"
 */
export interface NarratedChartBeat {
	/** One short sentence */
	text: React.ReactNode;
	/** Point to mark (index into the labels) */
	index?: number;
	/** Range of indices to shade */
	range?: [number, number];
}
export interface NarratedChartProps extends Omit<LineChartProps, "highlight"> {
	beats: NarratedChartBeat[];
	/** Controlled current beat */
	beat?: number;
	defaultBeat?: number;
	onBeatChange?: (beat: number) => void;
}

// A line chart that comes with its reading: a few short sentences, each a button that marks the
// point or range it talks about. The narration is written by the product (or an agent) and passed
// in; the chart only shows where each sentence lives. One tab stop, arrows move between beats.
export function NarratedChart({
	beats = [],
	beat,
	defaultBeat = 0,
	onBeatChange,
	title,
	"aria-label": ariaLabel,
	className,
	style,
	...chart
}: NarratedChartProps) {
	const [inner, setInner] = React.useState(defaultBeat);
	const cur = beat ?? inner;
	const pick = (i: number) => {
		setInner(i);
		onBeatChange?.(i);
	};
	const b = beats[cur];
	const name = ariaLabel ?? title ?? "Narrated chart";
	return (
		<section
			aria-label={name as string}
			className={["q-narrated-chart", className].filter(Boolean).join(" ")}
			style={style}
		>
			<LineChart
				{...chart}
				title={title}
				aria-label={name as string}
				highlight={b ? { index: b.index, range: b.range } : undefined}
			/>
			<ol
				className="q-narrated-chart__beats"
				aria-label="Reading"
				onKeyDown={rovingKeyDown(".q-narrated-chart__beat", "both")}
			>
				{beats.map((x, i) => (
					<li key={i} className="q-narrated-chart__item">
						<button
							type="button"
							className="q-narrated-chart__beat"
							aria-pressed={i === cur}
							tabIndex={i === cur ? 0 : -1}
							onClick={() => pick(i)}
							onFocus={() => pick(i)}
						>
							<span className="q-narrated-chart__index" aria-hidden="true">
								{String(i + 1).padStart(2, "0")}
							</span>
							<span className="q-narrated-chart__text">{x.text}</span>
						</button>
					</li>
				))}
			</ol>
		</section>
	);
}
