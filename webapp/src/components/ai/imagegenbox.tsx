import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSSEImageGen } from "@/hooks/useSSEImageGen";
import { TextArea } from "@/proto-design-system/components/forms/TextArea";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import styles from "./chatbox.module.scss";

export default function ImageGenBox() {
	const { messages, input, setInput, sendMessage, loading } = useSSEImageGen();
	const chatRef = useRef<HTMLDivElement>(null);

	return (
		<div className={styles["chat-wrapper"]}>
			<div className={styles["chat-container"]} ref={chatRef}>
				{messages.map((msg, i) => {
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
								{msg.role === "user" ? (
									<ReactMarkdown remarkPlugins={[remarkGfm]}>
										{msg.content.replace(/\\n/g, "\n")}
									</ReactMarkdown>
								) : (
									<img
										src={`data:image/png;base64, ${msg.content}`}
										alt="AI generated"
										style={{ maxWidth: "100%", maxHeight: "400px" }}
									/>
								)}
							</div>
						</div>
					);
				})}
				{loading && (
					<div className={styles["typing-indicator"]}>
						<Spinner size="sm" /> <span>AI is generating image...</span>
					</div>
				)}
			</div>
			<div className={styles["message-input-container"]}>
				{loading && (
					<div className={styles["typing-indicator"]}>
						<Spinner size="sm" /> <span>AI is generating image...</span>
					</div>
				)}
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
