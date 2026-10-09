import React from "react";
import { usePresence } from "../../a11y/hooks";
import { Button } from "../core/Button";
import "./ChatThread.scss";

/**
 * The scrolling conversation. It stays pinned to the newest message while you're at the bottom. If you
 * scroll up to read, it leaves you there and offers "Jump to latest" when something new arrives.
 * role="log" announces new turns politely. Give it a height, or let a flex/grid parent size it.
 */
export interface ChatThreadProps {
	/** ChatMessage and ChatDivider elements */
	children?: React.ReactNode;
	/** Shown when there are no messages, e.g. a greeting and PromptSuggestions */
	empty?: React.ReactNode;
	/** Accessible name of the log (default "Conversation") */
	label?: string;
	jumpLabel?: string;
	className?: string;
	style?: React.CSSProperties;
}

const NEAR = 48; // px from the bottom that still counts as "at the bottom"

// The scrolling conversation. It stays pinned to the newest message while you're at the bottom;
// scroll up to read and it leaves you there, offering "Jump to latest" when something new arrives.
// role="log" announces new turns politely; streaming text inside a turn is not re-announced.
export function ChatThread({
	children,
	empty,
	label = "Conversation",
	jumpLabel = "Jump to latest",
	className,
	style,
}: ChatThreadProps) {
	const scroller = React.useRef<HTMLDivElement>(null);
	const content = React.useRef<HTMLDivElement>(null);
	const atBottom = React.useRef(true);
	const [behind, setBehind] = React.useState(false);
	const jump = usePresence(behind);
	const hasChildren = React.Children.toArray(children).length > 0;

	const toBottom = (smooth: boolean) => {
		const el = scroller.current;
		if (!el) return;
		const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
		el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduce ? "smooth" : "auto" });
	};

	// Content grows (new turns, streamed tokens, images loading): follow it only if we were at the bottom.
	// One observer for the thread's lifetime: snapping down must not re-subscribe it.
	const follow = React.useEffectEvent(() => toBottom(false));
	React.useLayoutEffect(() => {
		const el = content.current;
		if (!el || typeof ResizeObserver === "undefined") return undefined;
		const ro = new ResizeObserver(() => {
			if (atBottom.current) follow();
			else setBehind(true);
		});
		ro.observe(el);
		follow();
		return () => ro.disconnect();
	}, []);

	const onScroll = () => {
		const el = scroller.current!;
		const near = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR;
		atBottom.current = near;
		if (near) setBehind(false);
	};

	const cls = ["q-chat-thread", className].filter(Boolean).join(" ");
	return (
		<div className={cls} style={style}>
			{/* Focusable so keyboard users can scroll the history (and axe's scrollable-region rule holds). */}
			<div
				ref={scroller}
				className="q-chat-thread__scroller"
				role="log"
				aria-live="polite"
				aria-relevant="additions"
				aria-label={label}
				tabIndex={0}
				onScroll={onScroll}
			>
				<div ref={content} className="q-chat-thread__content">
					{hasChildren ? children : empty && <div className="q-chat-thread__empty">{empty}</div>}
				</div>
			</div>
			{jump.mounted && (
				<div className="q-chat-thread__jump q-anim-rise" data-state={jump.state}>
					<Button
						variant="secondary"
						size="sm"
						rightIcon={<span aria-hidden="true">{"↓"}</span>}
						onClick={() => {
							atBottom.current = true;
							setBehind(false);
							toBottom(true);
							scroller.current?.focus({ preventScroll: true });
						}}
					>
						{jumpLabel}
					</Button>
				</div>
			)}
		</div>
	);
}

// A quiet day/date rule between turns: "Today", "Yesterday", "8 October".
export function ChatDivider({
	children,
	className,
	style,
}: {
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}) {
	return (
		<div
			role="separator"
			aria-label={typeof children === "string" ? children : undefined}
			className={["q-chat-thread__divider", className].filter(Boolean).join(" ")}
			style={style}
		>
			<span className="q-chat-thread__divider-label">{children}</span>
		</div>
	);
}
