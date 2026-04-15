import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRefinementMessages } from "@/hooks/useRefinementMessages";
import { useRefineVideoConfig } from "@/hooks/useRefineVideoConfig";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { VideoConfigData } from "@/types/video";
import styles from "./VideoChat.module.scss";

const SUGGESTION_CHIPS = [
	"Make text bigger",
	"Add neon glow",
	"Warmer colors",
	"More energy",
	"Add film grain",
	"Simplify",
];

interface VideoChatProps {
	configId: string;
	onConfigUpdate: (config: VideoConfigData) => void;
}

export function VideoChat({ configId, onConfigUpdate }: VideoChatProps) {
	const [input, setInput] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const {
		messages,
		currentResponse,
		loading,
		sendMessage,
		setInitialMessages,
	} = useRefineVideoConfig();
	const { messages: priorMessages, loading: loadingPrior } =
		useRefinementMessages(configId);

	// Load prior messages on mount
	useEffect(() => {
		if (priorMessages.length > 0) {
			setInitialMessages(
				priorMessages.map((m) => ({
					role: m.role,
					content: m.content,
				})),
			);
		}
	}, [priorMessages, setInitialMessages]);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, currentResponse]);

	const handleSend = async () => {
		if (!input.trim() || loading) return;
		const msg = input;
		setInput("");
		const updatedConfig = await sendMessage(configId, msg);
		if (updatedConfig) {
			onConfigUpdate(updatedConfig);
		}
	};

	const handleChipClick = (chip: string) => {
		setInput(chip);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	if (loadingPrior) {
		return (
			<div className={styles.container}>
				<div className={styles.empty}>
					<Spinner size="md" />
					<Text color="secondary">Loading conversation...</Text>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.messages}>
				{messages.length === 0 && !currentResponse && (
					<div className={styles.empty}>
						<Text size="lg" weight="medium">
							Refine your video
						</Text>
						<Text color="secondary" size="sm">
							Ask me to change colors, fonts, animations, or anything else about
							your video.
						</Text>
					</div>
				)}

				{messages.map((msg, i) => (
					<div
						key={`msg-${msg.role}-${i}`}
						className={`${styles.message} ${
							msg.role === "user" ? styles.userMessage : styles.assistantMessage
						}`}
					>
						{msg.role === "assistant" ? (
							<div className={styles.markdownContent}>
								<ReactMarkdown>{msg.content}</ReactMarkdown>
							</div>
						) : (
							msg.content
						)}
					</div>
				))}

				{currentResponse && (
					<div
						className={`${styles.message} ${styles.assistantMessage} ${styles.streaming}`}
					>
						<div className={styles.markdownContent}>
							<ReactMarkdown>{currentResponse}</ReactMarkdown>
						</div>
					</div>
				)}

				{loading && !currentResponse && (
					<div className={`${styles.message} ${styles.assistantMessage}`}>
						<Spinner size="sm" />
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			<div className={styles.chips}>
				{SUGGESTION_CHIPS.map((chip) => (
					<button
						key={chip}
						type="button"
						className={styles.chip}
						onClick={() => handleChipClick(chip)}
						disabled={loading}
					>
						{chip}
					</button>
				))}
			</div>

			<div className={styles.inputArea}>
				<TextArea
					className={styles.input}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Describe what to change..."
					rows={1}
					disabled={loading}
				/>
				<Button
					variant="primary"
					onClick={handleSend}
					disabled={loading || !input.trim()}
				>
					Send
				</Button>
			</div>
		</div>
	);
}
