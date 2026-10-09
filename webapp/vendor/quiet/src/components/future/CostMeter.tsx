import React from "react";
import { Progress } from "../feedback/Progress";
import "./CostMeter.scss";

/**
 * Live agent spend, split by kind of work, each line against its own cap. The total sits large;
 * a line at or past `warnAt` of its cap turns its hairline bar molten and marks the figure.
 * @startingPoint section="Future" subtitle="Spend by kind of work" viewport="600x300"
 */
export interface CostMeterItem {
	id?: string | number;
	/** Kind of work, e.g. "Rendering clips" */
	label: React.ReactNode;
	/** Spent so far */
	value: number;
	/** Cap for this kind of work; omit for no bar */
	cap?: number;
}
export interface CostMeterProps {
	/** Mono caption above the total, e.g. "Agents · today" */
	label: React.ReactNode;
	items: CostMeterItem[];
	/** Overall budget for the period */
	budget?: number;
	/** Word after the budget, e.g. "daily" */
	period?: string;
	/** Number → display string (default "$0.00") */
	format?: (value: number) => string;
	/** Share of a cap at which a line warns (default 0.9) */
	warnAt?: number;
	className?: string;
	style?: React.CSSProperties;
}

const usd = (v: number) => `$${v.toFixed(2)}`;

// Spend that ticks in real money as agents work, split by the kind of work — caps per kind, not
// per agent, because the question is "is this worth it?", never "who spent it?". A line nearing
// its cap turns molten.
export function CostMeter({
	label,
	items = [],
	budget,
	period = "daily",
	format = usd,
	warnAt = 0.9,
	className,
	style,
}: CostMeterProps) {
	const total = items.reduce((a, it) => a + it.value, 0);
	const uid = React.useId();
	return (
		<section
			aria-labelledby={`${uid}l`}
			className={["q-cost-meter", className].filter(Boolean).join(" ")}
			style={style}
		>
			<header className="q-cost-meter__header">
				<div className="q-cost-meter__total-wrap">
					<span id={`${uid}l`} className="q-cost-meter__label">
						{label}
					</span>
					<span className="q-cost-meter__total">{format(total)}</span>
				</div>
				{budget != null && (
					<span
						className={[
							"q-cost-meter__budget",
							total / budget >= warnAt && "q-cost-meter__budget--warn",
						]
							.filter(Boolean)
							.join(" ")}
					>
						of {format(budget)} {period} · {Math.round((total / budget) * 100)}%
					</span>
				)}
			</header>
			<ul className="q-cost-meter__items">
				{items.map((it, i) => {
					const warn = it.cap != null && it.value / it.cap >= warnAt;
					return (
						<li
							key={it.id ?? i}
							className={["q-cost-meter__item", warn && "q-cost-meter__item--warn"]
								.filter(Boolean)
								.join(" ")}
						>
							<div className="q-cost-meter__row">
								<span className="q-cost-meter__name">{it.label}</span>
								<span className="q-cost-meter__value">
									{format(it.value)}
									{it.cap != null && <> / {format(it.cap)}</>}
								</span>
							</div>
							{it.cap != null && (
								<Progress
									size="md"
									value={Math.min(it.value, it.cap)}
									max={it.cap}
									variant={warn ? "warning" : "default"}
									aria-label={`${typeof it.label === "string" ? it.label : "Spend"}: ${format(it.value)} of ${format(it.cap)}`}
								/>
							)}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
