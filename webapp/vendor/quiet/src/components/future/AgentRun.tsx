import React from "react";
import { Button } from "../core/Button";
import { Spinner } from "../core/Spinner";
import "./AgentRun.scss";

/**
 * An agent's run as named, timed, interruptible steps — replaces spinners and progress toasts for
 * work that touches real data. The last step is always a person; when the run reaches it, its
 * marker turns molten and `actions` appear. Controlled: the caller advances `current`.
 * @startingPoint section="Future" subtitle="Interruptible agent steps" viewport="760x360"
 */
export interface AgentRunStep {
	id?: string | number;
	/** What the step does, e.g. "Compute 7-day bounce rate" */
	label: React.ReactNode;
	/** Tool or source it uses (mono, right) */
	tool?: React.ReactNode;
	/** Elapsed time, shown once the step is done, e.g. "1.1s" */
	duration?: React.ReactNode;
}
export interface AgentRunProps {
	title: React.ReactNode;
	/** Mono line under the title, e.g. "Meerkat · started 4s ago" */
	meta?: React.ReactNode;
	/** The steps; the last one is the human handoff */
	steps: AgentRunStep[];
	/** Index of the step in progress */
	current?: number;
	status?: "running" | "paused" | "stopped" | "done";
	/** Each control renders only when its handler is given */
	onPause?: () => void;
	onResume?: () => void;
	onTakeOver?: () => void;
	onStop?: () => void;
	/** Shown when the run reaches the human step, e.g. Review / Discard buttons */
	actions?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

const STATE_TEXT: Record<string, string> = {
	done: "done",
	running: "running",
	paused: "paused",
	waiting: "waiting for you",
	stopped: "stopped",
	queued: "queued",
};

function stepState(
	i: number,
	current: number,
	status: NonNullable<AgentRunProps["status"]>,
	count: number,
) {
	if (status === "done" || i < current) return "done";
	if (i > current) return "queued";
	if (status === "stopped") return "stopped";
	if (status === "paused") return "paused";
	return i === count - 1 ? "waiting" : "running";
}

// Work that takes seconds and touches real data, shown as named, timed, interruptible steps.
// The last step is always a person: when the run reaches it, its marker turns molten.
export function AgentRun({
	title,
	meta,
	steps = [],
	current = 0,
	status = "running",
	onPause,
	onResume,
	onTakeOver,
	onStop,
	actions,
	className,
	style,
}: AgentRunProps) {
	const uid = React.useId();
	const count = steps.length;
	const atHuman = status !== "stopped" && current >= count - 1;
	const live = status === "running" || status === "paused";
	const now = steps[Math.min(current, count - 1)];
	const announce =
		status === "stopped"
			? "Run stopped"
			: status === "done"
				? "Run complete"
				: now
					? `Step ${Math.min(current, count - 1) + 1} of ${count}: ${now.label}, ${STATE_TEXT[stepState(current, current, status, count)]}`
					: "";
	return (
		<section
			aria-labelledby={`${uid}t`}
			aria-busy={(status === "running" && !atHuman) || undefined}
			className={["q-agent-run", `q-agent-run--${status}`, className].filter(Boolean).join(" ")}
			style={style}
		>
			<header className="q-agent-run__header">
				<div className="q-agent-run__heading">
					<h3 id={`${uid}t`} className="q-agent-run__title">
						{title}
					</h3>
					{meta && <div className="q-agent-run__meta">{meta}</div>}
				</div>
				{live && !atHuman && (
					<div className="q-agent-run__controls" role="group" aria-label="Run controls">
						{status === "paused"
							? onResume && (
									<Button variant="ghost" size="sm" onClick={onResume}>
										Resume
									</Button>
								)
							: onPause && (
									<Button variant="ghost" size="sm" onClick={onPause}>
										Pause
									</Button>
								)}
						{onTakeOver && (
							<Button variant="ghost" size="sm" onClick={onTakeOver}>
								Take over
							</Button>
						)}
						{onStop && (
							<Button variant="destructive" size="sm" onClick={onStop}>
								Stop
							</Button>
						)}
					</div>
				)}
			</header>
			<ol className="q-agent-run__steps">
				{steps.map((s, i) => {
					const st = stepState(i, current, status, count);
					const human = i === count - 1;
					return (
						<li
							key={s.id ?? i}
							aria-current={i === current && st !== "done" ? "step" : undefined}
							className={[
								"q-agent-run__step",
								`q-agent-run__step--${st}`,
								human && "q-agent-run__step--human",
							]
								.filter(Boolean)
								.join(" ")}
						>
							<span aria-hidden="true" className="q-agent-run__marker">
								{st === "running" ? (
									<Spinner size={12} label={null} aria-hidden="true" />
								) : (
									<span className="q-agent-run__dot" />
								)}
							</span>
							<span className="q-agent-run__label">
								{s.label}
								<span className="q-sr-only">, {STATE_TEXT[st]}</span>
							</span>
							<span className="q-agent-run__aside">
								{s.tool && <span className="q-agent-run__tool">{s.tool}</span>}
								{s.duration && st === "done" && (
									<span className="q-agent-run__duration">{s.duration}</span>
								)}
							</span>
						</li>
					);
				})}
			</ol>
			{atHuman && actions && (
				<div className="q-agent-run__actions q-anim-rise" data-state="open">
					{actions}
				</div>
			)}
			<span role="status" className="q-sr-only">
				{announce}
			</span>
		</section>
	);
}
