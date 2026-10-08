import React from "react";
import { Button } from "../core/Button";
import type { AttachmentProps } from "./Attachment";
import { Attachment } from "./Attachment";
import { useCopy } from "./chat-utils";
import "./ChatMessage.scss";

/**
 * One turn in a conversation. A person's message is a soft bubble on the right; Claude's reply is
 * plain prose under a small name row, with no bubble. While `status="streaming"` a soft caret trails
 * the text, and assistive tech hears "Claude is responding" once rather than every token.
 */
export interface ChatMessageProps {
	/** Who said it; pass the API message's `role` straight through */
	from?: "user" | "assistant" | "system";
	/** Default "You" for user turns, "Claude" for replies */
	name?: string;
	/** Replaces the Claude mark in a reply's name row */
	avatar?: React.ReactNode;
	/** Rich content: paragraphs, ToolCall, CodeBlock … */
	children?: React.ReactNode;
	/** Shown as cards above the text */
	attachments?: (Omit<AttachmentProps, "variant"> & { id?: string })[];
	status?: "streaming" | "done" | "error";
	/** Shown when status is "error" */
	error?: React.ReactNode;
	/** Adds a Retry action */
	onRetry?: () => void;
	/** Adds an Edit action */
	onEdit?: () => void;
	/** Extra actions after Copy/Retry/Edit */
	actions?: React.ReactNode;
	/** What Copy puts on the clipboard (default: the rendered text) */
	copyText?: string;
	/** Default on for replies, off for user turns */
	showCopy?: boolean;
	time?: Date | string | number;
	/** Level of the speaker heading ("Claude", "You said"), 2–6. Default 3: a thread under a page h1 and a section h2 */
	headingLevel?: 2 | 3 | 4 | 5 | 6;
	className?: string;
	style?: React.CSSProperties;
}

const fmtTime = (t: Date | string | number | undefined) => {
	if (t == null || t === "") return null;
	const d = t instanceof Date ? t : new Date(t);
	if (Number.isNaN(d.getTime())) return { text: String(t) };
	return {
		text: d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
		iso: d.toISOString(),
	};
};

// The Claude mark: a molten asterisk on a quiet tile — the one bit of heat in a reply.
export function ClaudeMark({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
	return (
		<span
			aria-hidden="true"
			className={["q-chat-message__mark", `q-chat-message__mark--${size}`, className]
				.filter(Boolean)
				.join(" ")}
		>
			{"✳"}
		</span>
	);
}

// One turn in a conversation. `from` is who said it — pass the API message's role straight through.
// A person's message is a soft bubble on the right; Claude's reply is
// plain prose under a small name row — no bubble. While `status="streaming"` a soft caret trails the
// text and assistive tech hears "Claude is responding" once, not every token.
export function ChatMessage({
	from = "assistant",
	name,
	avatar,
	children,
	attachments = [],
	status = "done",
	error,
	onRetry,
	onEdit,
	actions,
	copyText: copyTextProp,
	showCopy,
	time,
	headingLevel = 3,
	className,
	style,
}: ChatMessageProps) {
	const isUser = from === "user";
	const isSystem = from === "system";
	const who = name ?? (isUser ? "You" : "Claude");
	const body = React.useRef<HTMLDivElement>(null);
	const [copyState, copy] = useCopy();
	const uid = React.useId();
	// The speaker is a heading so screen-reader users can jump turn to turn; its level follows the page.
	const H = `h${Math.min(6, Math.max(2, headingLevel))}` as "h2" | "h3" | "h4" | "h5" | "h6";
	const stamp = fmtTime(time);
	const streaming = status === "streaming";
	const failed = status === "error";
	const canCopy = (showCopy ?? !isUser) && !streaming;

	if (isSystem) {
		return (
			<div
				role="note"
				className={["q-chat-message", "q-chat-message--system", className]
					.filter(Boolean)
					.join(" ")}
				style={style}
			>
				{children}
			</div>
		);
	}

	const doCopy = () => copy(copyTextProp ?? body.current?.innerText ?? "");
	const files = attachments.length > 0 && (
		<ul className="q-chat-message__files" aria-label="Attachments">
			{attachments.map((a, i) => (
				<li key={a.id ?? i}>
					<Attachment
						variant="card"
						file={a.file}
						name={a.name}
						size={a.size}
						type={a.type}
						src={a.src}
						href={a.href}
						onOpen={a.onOpen}
						status={a.status}
						error={a.error}
					/>
				</li>
			))}
		</ul>
	);

	const toolbar = (canCopy || onRetry || onEdit || actions) && !streaming && (
		<div className="q-chat-message__actions">
			{canCopy && (
				<Button
					variant="ghost"
					size="sm"
					onClick={doCopy}
					aria-label={copyState === "copied" ? "Copied" : "Copy message"}
				>
					{copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
				</Button>
			)}
			{onRetry && (
				<Button variant="ghost" size="sm" onClick={onRetry}>
					Retry
				</Button>
			)}
			{onEdit && (
				<Button variant="ghost" size="sm" onClick={onEdit}>
					Edit
				</Button>
			)}
			{actions}
		</div>
	);

	const cls = [
		"q-chat-message",
		`q-chat-message--${isUser ? "user" : "assistant"}`,
		streaming && "q-chat-message--streaming",
		failed && "q-chat-message--error",
		className,
	]
		.filter(Boolean)
		.join(" ");
	return (
		<article className={cls} style={style} aria-labelledby={`${uid}n`}>
			{isUser ? (
				<H id={`${uid}n`} className="q-sr-only">
					{`${who} said`}
				</H>
			) : (
				<header className="q-chat-message__header">
					{avatar ?? <ClaudeMark />}
					<H id={`${uid}n`} className="q-chat-message__name">
						{who}
					</H>
					{stamp && (
						<time className="q-chat-message__time" dateTime={stamp.iso}>
							{stamp.text}
						</time>
					)}
				</header>
			)}
			{files}
			{(children != null || streaming) && (
				<div ref={body} className="q-chat-message__body" aria-busy={streaming || undefined}>
					{children}
					{streaming && <span aria-hidden="true" className="q-chat-message__caret" />}
				</div>
			)}
			{failed && (
				<p className="q-chat-message__error">
					<span aria-hidden="true" className="q-chat-message__error-dot" />
					{error || "Something went wrong before Claude finished."}
				</p>
			)}
			{isUser && stamp && (
				<time className="q-chat-message__time" dateTime={stamp.iso}>
					{stamp.text}
				</time>
			)}
			{toolbar}
			<span role="status" className="q-sr-only">
				{streaming
					? `${who} is responding`
					: failed
						? `${who}’s response failed`
						: copyState === "copied"
							? "Copied to clipboard"
							: ""}
			</span>
		</article>
	);
}
