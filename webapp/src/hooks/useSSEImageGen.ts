"use client";

import { useState } from "react";

type Message = {
	role: "user" | "assistant";
	content: string;
};

interface RequestBody {
	message: string;
	conversation_id?: string;
}

export function useSSEImageGen() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [conversationID, setConversationID] = useState<string | null>(null);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);

	const sendMessage = async () => {
		if (!input.trim()) return;

		setMessages((prev) => [...prev, { role: "user", content: input }]);
		setInput("");
		setLoading(true);

		const body: RequestBody = conversationID
			? { message: input, conversation_id: conversationID }
			: { message: input };

		const res = await fetch(
			`${import.meta.env.VITE_API_URL}/api/protected/ai/image/generate`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "text/event-stream",
				},
				credentials: "include",
				body: JSON.stringify(body),
			},
		);

		const reader = res.body?.getReader();
		if (!reader) {
			throw new Error("Failed to get reader from response body");
		}

		const decoder = new TextDecoder("utf-8");
		let assistantReply = "";

		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			const lines = chunk.split("\n");

			for (const line of lines) {
				const trimmed = line.trim();

				if (trimmed.startsWith("data:")) {
					const data = trimmed.replace("data:", "").trim();

					if (data === "[DONE]") {
						setMessages((prev) => [
							...prev,
							{ role: "assistant", content: assistantReply },
						]);
						setLoading(false);
						return;
					}

					if (data.startsWith("[Conversation_ID]:")) {
						setConversationID(data.replace("[Conversation_ID]:", "").trim());
					} else if (data.startsWith("[Image_URL]:")) {
						assistantReply += data.replace("[Image_URL]:", "").trim();
					}
				} else if (
					trimmed.startsWith("event:") ||
					trimmed.startsWith("retry:") ||
					trimmed.startsWith("message:")
				) {
					// Skip SSE metadata lines
				} else {
					// Handle trailing base64 content that came untagged in newlines
					assistantReply += trimmed;
				}
			}
		}
	};

	return {
		messages,
		input,
		setInput,
		sendMessage,
		conversationID,
		loading,
	};
}
