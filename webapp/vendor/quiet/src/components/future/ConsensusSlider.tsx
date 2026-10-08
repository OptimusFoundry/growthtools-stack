import React from "react";
import { Avatar } from "../core/Avatar";
import { Button } from "../core/Button";
import "./ConsensusSlider.scss";

export interface ConsensusPosition {
	/** Person or agent name — shown as an avatar (or the agent mark) and announced */
	name: string;
	value: number;
	/** Avatar image */
	src?: string;
	/** Show the agent mark instead of an avatar */
	agent?: boolean;
}
/**
 * A shared setting that shows where teammates and agents set theirs, as markers above the track,
 * with the spread band between the lowest and highest. Agreement is the band narrowing.
 * Evolved from Slider + comments.
 * @startingPoint section="Future" subtitle="Consensus slider" viewport="700x220"
 */
export interface ConsensusSliderProps {
	label?: React.ReactNode;
	/** Your position */
	value?: number;
	defaultValue?: number;
	min?: number;
	max?: number;
	step?: number;
	onChange?: (value: number) => void;
	/** Everyone else's positions */
	others?: ConsensusPosition[];
	formatValue?: (value: number) => React.ReactNode;
	/** A spread at or under this reads "close to agreement"; omit to say nothing */
	closeWithin?: number;
	meetLabel?: React.ReactNode;
	/** Show the button that moves you to the mean of everyone else's positions */
	showMeet?: boolean;
	disabled?: boolean;
	/** Accessible name when there is no visible label */
	"aria-label"?: string;
	className?: string;
	style?: React.CSSProperties;
}

const mean = (vs: number[]) => vs.reduce((a, b) => a + b, 0) / vs.length;

export function ConsensusSlider({
	label,
	value,
	defaultValue,
	min = 0,
	max = 100,
	step = 1,
	onChange,
	others = [],
	formatValue,
	closeWithin,
	meetLabel = "Meet in the middle",
	showMeet = true,
	disabled = false,
	"aria-label": ariaLabel,
	className,
	style,
}: ConsensusSliderProps) {
	const [inner, setInner] = React.useState(defaultValue ?? min);
	const [glide, setGlide] = React.useState(false);
	const uid = React.useId();
	const track = React.useRef<HTMLDivElement>(null);
	const cur = value ?? inner;
	const snap = (v: number) =>
		Number(Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min)).toFixed(6));
	const set = (v: number) => {
		const n = snap(v);
		if (n !== cur) {
			setInner(n);
			onChange?.(n);
		}
	};
	const fromX = (x: number) => {
		const r = track.current!.getBoundingClientRect();
		set(min + ((x - r.left) / r.width) * (max - min));
	};
	const down = (e: React.PointerEvent<HTMLDivElement>) => {
		if (disabled) return;
		setGlide(false);
		track.current!.setPointerCapture(e.pointerId);
		fromX(e.clientX);
	};
	const move = (e: React.PointerEvent<HTMLDivElement>) => {
		if (disabled || !track.current!.hasPointerCapture(e.pointerId)) return;
		fromX(e.clientX);
	};
	const key = (e: React.KeyboardEvent<HTMLSpanElement>) => {
		const d = (
			{
				ArrowRight: step,
				ArrowUp: step,
				ArrowLeft: -step,
				ArrowDown: -step,
				PageUp: step * 10,
				PageDown: -step * 10,
			} as Record<string, number>
		)[e.key];
		const to = d ? cur + d : e.key === "Home" ? min : e.key === "End" ? max : null;
		if (to !== null && !disabled) {
			e.preventDefault();
			setGlide(true);
			set(to);
		}
	};
	const fmt = formatValue || ((v: number): React.ReactNode => v);
	const all = [cur, ...others.map((o) => o.value)];
	const lo = Math.min(...all),
		hi = Math.max(...all);
	// The middle of where everyone else is — moving there leaves you at the group's mean too.
	const middle = others.length ? snap(mean(others.map((o) => o.value))) : cur;
	const close = closeWithin != null ? hi - lo <= closeWithin : null;
	const pos = (v: number) => (max === min ? 0 : (v - min) / (max - min));
	const spread = (
		<>
			{fmt(lo)}–{fmt(hi)}
			{close != null && (close ? " · close to agreement" : " · wide")}
		</>
	);
	const cls = ["q-consensus-slider", className].filter(Boolean).join(" ");
	return (
		<div
			aria-disabled={disabled || undefined}
			className={cls}
			style={
				{ "--_t": pos(cur), "--_lo": pos(lo), "--_hi": pos(hi), ...style } as React.CSSProperties
			}
		>
			<div className="q-consensus-slider__header">
				<span id={`${uid}l`}>{label}</span>
				<span id={`${uid}s`} className="q-consensus-slider__spread">
					Spread {spread}
				</span>
			</div>
			<div
				ref={track}
				onPointerDown={down}
				onPointerMove={move}
				className="q-consensus-slider__track"
				data-glide={glide || undefined}
			>
				<ul aria-hidden="true" className="q-consensus-slider__others">
					{others.map((o) => (
						<li
							key={o.name}
							className="q-consensus-slider__other"
							style={{ "--_at": pos(o.value) } as React.CSSProperties}
						>
							{o.agent ? (
								<span title={o.name} className="q-consensus-slider__agent">
									✳
								</span>
							) : (
								<Avatar name={o.name} src={o.src} size="xs" />
							)}
							<span className="q-consensus-slider__other-value">{fmt(o.value)}</span>
							<span className="q-consensus-slider__stem" />
						</li>
					))}
				</ul>
				<span className="q-consensus-slider__rail" />
				<span className="q-consensus-slider__band" />
				<span
					role="slider"
					tabIndex={disabled ? -1 : 0}
					aria-valuemin={min}
					aria-valuemax={max}
					aria-valuenow={cur}
					aria-valuetext={String(fmt(cur))}
					aria-disabled={disabled || undefined}
					aria-labelledby={label ? `${uid}l` : undefined}
					aria-label={label ? undefined : ariaLabel}
					aria-describedby={`${uid}o ${uid}s`}
					onKeyDown={key}
					className="q-consensus-slider__thumb"
				/>
			</div>
			<span id={`${uid}o`} className="q-sr-only">
				{others.map((o) => `${o.name + (o.agent ? " (agent)" : "")} ${fmt(o.value)}`).join(", ")}
			</span>
			<div className="q-consensus-slider__footer">
				<span className="q-consensus-slider__you">
					You: <strong>{fmt(cur)}</strong>
					{cur === middle && others.length > 0 && (
						<span className="q-consensus-slider__mean"> · at the mean</span>
					)}
				</span>
				{showMeet && others.length > 0 && (
					<Button
						variant="outline"
						size="sm"
						disabled={disabled || cur === middle}
						onClick={() => {
							setGlide(true);
							set(middle);
						}}
					>
						{meetLabel}
					</Button>
				)}
			</div>
		</div>
	);
}
