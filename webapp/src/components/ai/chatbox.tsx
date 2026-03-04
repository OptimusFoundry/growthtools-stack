import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSSEChat } from "@/hooks/useSSEChat";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import styles from "./chatbox.module.scss";

export default function ChatBox() {
	const { messages, currentResponse, input, setInput, sendMessage, loading } =
		useSSEChat();
	const chatRef = useRef<HTMLDivElement>(null);

	return (
		<div className={styles["chat-wrapper"]}>
			<div className={styles["chat-container"]} ref={chatRef}>
				{messages.map((msg, i) => {
					const normalizedContent = msg.content.replace(/\\n/g, "\n");
					return (
						<div
							className={
								msg.role === "user"
									? styles["chat-bubble-user"]
									: styles["chat-bubble-ai"]
							}
							key={i}
							style={{ marginBottom: 12 }}
						>
							<strong>{msg.role === "user" ? "You" : "AI"}:</strong>
							<div style={{ marginLeft: 10 }}>
								<ReactMarkdown remarkPlugins={[remarkGfm]}>
									{normalizedContent}
								</ReactMarkdown>
							</div>
						</div>
					);
				})}
				{currentResponse ? (
					<div
						className={styles["chat-bubble-ai"]}
						key={"currentResp"}
						style={{ marginBottom: 12 }}
					>
						<strong>AI:</strong>
						<div style={{ marginLeft: 10 }}>
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{currentResponse.replace(/\\n/g, "\n")}
							</ReactMarkdown>
						</div>
					</div>
				) : null}
				{loading && (
					<div className={styles["typing-indicator"]}>
						<Spinner size="sm" /> <span>AI is typing...</span>
					</div>
				)}
			</div>
			<div className={styles["message-input-container"]}>
				<TextArea
					label={""}
					required={true}
					placeholder="Type your message here..."
					value={input}
					onChange={(e) => setInput(e.target.value)}
					disabled={loading}
				/>
				<Button
					className={styles["button"]}
					onClick={sendMessage}
					disabled={loading || !input.trim()}
				>
					Send
				</Button>
			</div>
		</div>
	);
}
