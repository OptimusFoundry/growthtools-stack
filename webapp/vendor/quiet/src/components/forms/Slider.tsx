import React from "react";
import { FormValue } from "../../a11y/form";
import { useMergedRef } from "../../a11y/hooks";
import "./Slider.scss";

/**
 * Hairline range slider with ink thumb. Pointer + keyboard.
 * @startingPoint section="Forms" subtitle="Range slider" viewport="600x160"
 */
export interface SliderProps {
	label?: React.ReactNode;
	value?: number;
	defaultValue?: number;
	min?: number;
	max?: number;
	step?: number;
	onChange?: (value: number) => void;
	showValue?: boolean;
	formatValue?: (value: number) => React.ReactNode;
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	/** Accessible name when there is no visible label */
	"aria-label"?: string;
	/** Submits the current value (as a string) through a hidden input, so a native <form> and FormData see it */
	name?: string;
	/** id of a <form> elsewhere in the document, as on native controls */
	form?: string;
	/** Reaches the role="slider" thumb, so it can be focused */
	ref?: React.Ref<HTMLSpanElement>;
	className?: string;
	style?: React.CSSProperties;
}

const SIZES = ["sm", "md", "lg"];

export function Slider({
	label,
	value,
	defaultValue,
	min = 0,
	max = 100,
	step = 1,
	onChange,
	showValue = true,
	formatValue,
	size = "md",
	disabled = false,
	name,
	form,
	ref,
	"aria-label": ariaLabel,
	className,
	style,
}: SliderProps) {
	const [inner, setInner] = React.useState(defaultValue ?? min);
	const [glide, setGlide] = React.useState(false);
	const uid = React.useId();
	const cur = value ?? inner;
	const track = React.useRef<HTMLDivElement>(null);
	const thumb = React.useRef<HTMLSpanElement>(null);
	const thumbRef = useMergedRef(thumb, ref);
	const pct = max === min ? 0 : ((cur - min) / (max - min)) * 100;
	const set = (v: number) => {
		const c = Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min));
		const n = Number(c.toFixed(6));
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
		e.currentTarget.setPointerCapture(e.pointerId);
		fromX(e.clientX);
	};
	const move = (e: React.PointerEvent<HTMLDivElement>) => {
		if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
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
	const text = fmt(cur);
	const cls = ["q-slider", `q-slider--${SIZES.includes(size) ? size : "md"}`, className]
		.filter(Boolean)
		.join(" ");
	return (
		<div
			aria-disabled={disabled || undefined}
			className={cls}
			style={{ "--_pct": `${pct}%`, ...style } as React.CSSProperties}
		>
			{(label || showValue) && (
				<div className="q-slider__header">
					<span id={`${uid}l`}>{label}</span>
					{showValue && (
						<span aria-hidden="true" className="q-slider__value">
							{text}
						</span>
					)}
				</div>
			)}
			{/* data-glide: keyboard steps ease the thumb; pointer drags follow the pointer exactly */}
			<div
				ref={track}
				onPointerDown={down}
				onPointerMove={move}
				className="q-slider__track"
				data-glide={glide || undefined}
			>
				<span className="q-slider__rail" />
				<span className="q-slider__fill" />
				<span
					ref={thumbRef}
					role="slider"
					tabIndex={disabled ? -1 : 0}
					aria-valuemin={min}
					aria-valuemax={max}
					aria-valuenow={cur}
					aria-valuetext={
						typeof text === "string" || typeof text === "number" ? String(text) : undefined
					}
					aria-orientation="horizontal"
					aria-disabled={disabled || undefined}
					aria-labelledby={label ? `${uid}l` : undefined}
					aria-label={label ? undefined : ariaLabel}
					onKeyDown={key}
					className="q-slider__thumb"
				/>
			</div>
			<FormValue
				name={name}
				value={String(cur)}
				disabled={disabled}
				form={form}
				focusTarget={() => thumb.current}
			/>
		</div>
	);
}
