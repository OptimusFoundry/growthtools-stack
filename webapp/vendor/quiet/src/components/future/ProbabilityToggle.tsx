import React from "react";
import "./ProbabilityToggle.scss";

export interface ProbabilityLevel {
	/** Highest position (0–100, inclusive) that still reads as this level */
	upTo: number;
	/** Short policy name, e.g. "Mostly" — also the slider's aria-valuetext */
	label: string;
	/** The policy said back in words, e.g. "Posts alone unless the draft mentions pricing." */
	description?: React.ReactNode;
}
/**
 * A switch that rests anywhere between off and always. The position (0–100) maps to a policy
 * level, read back as a label and a sentence. Evolved from Switch.
 * @startingPoint section="Future" subtitle="Probability toggle" viewport="700x180"
 */
export interface ProbabilityToggleProps {
	label?: React.ReactNode;
	/** Ordered by `upTo`; the last one should reach 100 */
	levels?: ProbabilityLevel[];
	/** 0–100 */
	value?: number;
	defaultValue?: number;
	onChange?: (value: number, level: ProbabilityLevel) => void;
	/** Arrow-key step (PageUp/PageDown move 25) */
	step?: number;
	disabled?: boolean;
	/** Accessible name when there is no visible label */
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

export const PROBABILITY_LEVELS: ProbabilityLevel[] = [
	{ upTo: 4, label: "Off" },
	{ upTo: 34, label: "Rarely" },
	{ upTo: 64, label: "Sometimes" },
	{ upTo: 95, label: "Mostly" },
	{ upTo: 100, label: "Always" },
];
const TICKS = [25, 50, 75];

export function ProbabilityToggle({
	label,
	levels = PROBABILITY_LEVELS,
	value,
	defaultValue = 0,
	onChange,
	step = 5,
	disabled = false,
	"aria-label": ariaLabel,
	className,
	style,
}: ProbabilityToggleProps) {
	const [inner, setInner] = React.useState(defaultValue);
	const [glide, setGlide] = React.useState(false);
	const uid = React.useId();
	const track = React.useRef<HTMLDivElement>(null);
	const cur = value ?? inner;
	const levelAt = (v: number): ProbabilityLevel =>
		levels.find((l) => v <= l.upTo) || levels[levels.length - 1]!;
	const level = levelAt(cur);
	const set = (v: number) => {
		const n = Math.min(100, Math.max(0, Math.round(v)));
		if (n !== cur) {
			setInner(n);
			onChange?.(n, levelAt(n));
		}
	};
	const fromX = (x: number) => {
		const r = track.current!.getBoundingClientRect();
		set(((x - r.left) / r.width) * 100);
	};
	const down = (e: React.PointerEvent<HTMLDivElement>) => {
		if (disabled) return;
		setGlide(false);
		e.currentTarget.setPointerCapture(e.pointerId);
		fromX(e.clientX);
	};
	const move = (e: React.PointerEvent<HTMLDivElement>) => {
		if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
		fromX(e.clientX);
	};
	const key = (e: React.KeyboardEvent<HTMLElement>) => {
		const d = (
			{
				ArrowRight: step,
				ArrowUp: step,
				ArrowLeft: -step,
				ArrowDown: -step,
				PageUp: 25,
				PageDown: -25,
			} as Record<string, number | undefined>
		)[e.key];
		const to = d ? cur + d : e.key === "Home" ? 0 : e.key === "End" ? 100 : null;
		if (to !== null && !disabled) {
			e.preventDefault();
			setGlide(true);
			set(to);
		}
	};
	const cls = ["q-probability-toggle", className].filter(Boolean).join(" ");
	return (
		<div
			aria-disabled={disabled || undefined}
			className={cls}
			style={{ "--_t": cur / 100, ...style } as React.CSSProperties}
		>
			<div
				ref={track}
				onPointerDown={down}
				onPointerMove={move}
				className="q-probability-toggle__track"
				data-glide={glide || undefined}
			>
				<span className="q-probability-toggle__fill" />
				{TICKS.map((t) => (
					<span
						key={t}
						aria-hidden="true"
						className="q-probability-toggle__tick"
						style={{ "--_at": t / 100 } as React.CSSProperties}
					/>
				))}
				<span
					role="slider"
					tabIndex={disabled ? -1 : 0}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={cur}
					aria-valuetext={`${level.label}, ${cur}%`}
					aria-disabled={disabled || undefined}
					aria-labelledby={label ? `${uid}l` : undefined}
					aria-label={label ? undefined : ariaLabel}
					aria-describedby={level.description ? `${uid}d` : undefined}
					onKeyDown={key}
					className="q-probability-toggle__thumb"
				/>
			</div>
			<div className="q-probability-toggle__text">
				<span className="q-probability-toggle__heading">
					{label && (
						<span id={`${uid}l`} className="q-probability-toggle__label">
							{label}
						</span>
					)}
					<span aria-hidden="true" className="q-probability-toggle__level">
						{level.label} · {cur}%
					</span>
				</span>
				{level.description && (
					<span id={`${uid}d`} className="q-probability-toggle__description">
						{level.description}
					</span>
				)}
			</div>
		</div>
	);
}
