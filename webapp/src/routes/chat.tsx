import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, User } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import chatStyles from "./chat.module.scss";

export const Route = createFileRoute("/chat")({
	component: ChatPage,
});

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
}

function ChatPage() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [streaming, setStreaming] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const handleSend = useCallback(async () => {
		const trimmed = input.trim();
		if (!trimmed || streaming) return;

		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: trimmed,
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setStreaming(true);

		const assistantId = crypto.randomUUID();
		setMessages((prev) => [
			...prev,
			{ id: assistantId, role: "assistant", content: "" },
		]);

		try {
			const controller = new AbortController();
			abortRef.current = controller;

			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/api/protected/chat`,
				{
					method: "POST",
					credentials: "include",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ message: trimmed }),
					signal: controller.signal,
				},
			);

			if (!response.ok) {
				throw new Error(`Chat request failed: ${response.status}`);
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error("No response body");

			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);
						if (data === "[DONE]") break;
						try {
							const parsed = JSON.parse(data) as { content?: string };
							if (parsed.content) {
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantId
											? { ...msg, content: msg.content + parsed.content }
											: msg,
									),
								);
								scrollToBottom();
							}
						} catch {
							// skip malformed JSON chunks
						}
					}
				}
			}
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === "AbortError") return;
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === assistantId
						? {
								...msg,
								content: "Sorry, something went wrong. Please try again.",
							}
						: msg,
				),
			);
		} finally {
			setStreaming(false);
			abortRef.current = null;
			scrollToBottom();
		}
	}, [input, streaming, scrollToBottom]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	return (
		<motion.div
			className={chatStyles.chatPage}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.6 }}
		>
			<div className={chatStyles.messageList}>
				{messages.length === 0 && (
					<div className={chatStyles.emptyChat}>
						<Bot size={48} />
						<h2>AI Content Assistant</h2>
						<p>
							Ask me to help generate social media posts, brainstorm ideas, or
							refine your content.
						</p>
					</div>
				)}
				{messages.map((msg) => (
					<div
						key={msg.id}
						className={`${chatStyles.message} ${chatStyles[msg.role]}`}
					>
						<div className={chatStyles.messageIcon}>
							{msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
						</div>
						<div className={chatStyles.messageContent}>
							{msg.content ||
								(streaming && msg.role === "assistant" ? (
									<Spinner size="sm" />
								) : null)}
						</div>
					</div>
				))}
				<div ref={messagesEndRef} />
			</div>

			<div className={chatStyles.inputArea}>
				<Stack direction="row" gap="sm" align="end">
					<TextArea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type your message..."
						rows={2}
						hideLabel
						aria-label="Chat message input"
					/>
					<Button
						variant="primary"
						onClick={handleSend}
						disabled={!input.trim() || streaming}
						isLoading={streaming}
						aria-label="Send message"
					>
						<Send size={16} />
					</Button>
				</Stack>
			</div>
		</motion.div>
	);
}
