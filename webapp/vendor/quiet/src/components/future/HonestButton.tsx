import React from "react";
import "./HonestButton.scss";

/**
 * A button whose length is its expected wait. Pressing it turns the button itself into the
 * progress bar: it fills, counts down, and says "Done". Evolved from Button + progress bar.
 * @startingPoint section="Future" subtitle="Honest button" viewport="700x180"
 */
export interface HonestButtonProps
	extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
	/** Expected duration in seconds (e.g. the median of recent runs). Sets the length and the countdown. */
	expected?: number;
	/** Starts the work. Return a promise to finish when it settles; the fill holds short of full if it overruns. */
	onPress?: () => unknown;
	children?: React.ReactNode;
	doneLabel?: React.ReactNode;
	/** How long "Done" shows before the button resets, in ms */
	doneFor?: number;
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

// Length grows with the log of the expected wait: a 0.3s save is short, a 40s render is long.
const reach = (s: number) => Math.min(1, Math.log10(1 + Math.max(0, s)) / Math.log10(61));
const fmtSecs = (s: number) => (s < 1 ? "<1s" : `${Math.ceil(s)}s`);

export function HonestButton({
	expected = 1,
	onPress,
	children,
	doneLabel = "Done",
	doneFor = 1200,
	size = "md",
	disabled = false,
	className,
	style,
	...rest
}: HonestButtonProps) {
	const [p, setP] = React.useState<number | "done" | null>(null); // null idle · 0–1 running · 'done'
	const [said, setSaid] = React.useState<React.ReactNode>("");
	const raf = React.useRef(0);
	const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
	React.useEffect(
		() => () => {
			cancelAnimationFrame(raf.current);
			clearTimeout(timer.current);
		},
		[],
	);
	const running = typeof p === "number";
	const finish = () => {
		cancelAnimationFrame(raf.current);
		setP("done");
		setSaid(doneLabel);
		timer.current = setTimeout(() => {
			setP(null);
			setSaid("");
		}, doneFor);
	};
	const start = () => {
		if (disabled || p != null) return;
		const ms = Math.max(400, expected * 1000),
			t0 = performance.now();
		let settled = false,
			waiting = false;
		const result = onPress && (onPress() as Promise<unknown> | undefined);
		const isAsync = result && typeof result.then === "function";
		if (isAsync)
			result.then(
				() => {
					settled = true;
					if (waiting) finish();
				},
				() => {
					cancelAnimationFrame(raf.current);
					setP(null);
					setSaid("");
				},
			);
		setSaid(`Running, about ${fmtSecs(expected)}`);
		const tick = () => {
			const k = Math.min(1, (performance.now() - t0) / ms);
			// A real task that outlasts its estimate holds just short of full instead of lying.
			if (k >= 1 && isAsync && !settled) {
				waiting = true;
				setP(0.96);
				return;
			}
			if (k >= 1) {
				finish();
				return;
			}
			setP(isAsync ? k * 0.96 : k);
			raf.current = requestAnimationFrame(tick);
		};
		tick();
	};
	const left = running ? expected * (1 - p) : expected;
	const cls = [
		"q-honest-button",
		`q-honest-button--${["sm", "md", "lg"].includes(size) ? size : "md"}`,
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<>
			<button
				type="button"
				{...rest}
				onClick={start}
				disabled={disabled}
				aria-busy={running || undefined}
				data-state={p === "done" ? "done" : running ? "running" : undefined}
				className={cls}
				style={
					{
						"--_reach": reach(expected),
						"--_p": running ? p : p === "done" ? 1 : 0,
						...style,
					} as React.CSSProperties
				}
			>
				<span aria-hidden="true" className="q-honest-button__fill" />
				<span className="q-honest-button__label">
					{p === "done" ? (
						<>
							{doneLabel}
							<span aria-hidden="true" className="q-honest-button__dot">
								.
							</span>
						</>
					) : (
						children
					)}
				</span>
				{expected >= 1 && p !== "done" && (
					<span aria-hidden="true" className="q-honest-button__eta">
						{running ? fmtSecs(left) : `~${fmtSecs(expected)}`}
					</span>
				)}
			</button>
			{/* Outside the button so the announcement never becomes part of its name */}
			<span className="q-sr-only" role="status">
				{said}
			</span>
		</>
	);
}
