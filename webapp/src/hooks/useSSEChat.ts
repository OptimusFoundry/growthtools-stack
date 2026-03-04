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

export function useSSEChat() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [currentResponse, setCurrentResponse] = useState<string | null>(null);
	const [conversationID, setConversationID] = useState<string | null>(null);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);

	const sendMessage = async () => {
		if (!input.trim()) return;

		const userMessage: Message = { role: "user", content: input };
		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);
		setInput("");
		setLoading(true);

		let body: RequestBody;
		if (conversationID) {
			body = { message: input, conversation_id: conversationID };
		} else {
			body = { message: input };
		}

		const res = await fetch(
			`${import.meta.env.VITE_API_URL}/api/protected/ai/conversation`,
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
			console.log(chunk);
			const lines = chunk
				.split("\n")
				.filter((line) => line.startsWith("data:"));

			for (const line of lines) {
				const data = line.replace("data: ", "");

				if (data === "[DONE]") {
					setLoading(false);
					setCurrentResponse(null);
					setMessages((prev) => {
						return [...prev, { role: "assistant", content: assistantReply }];
					});
					return;
				}

				if (data.startsWith("[Conversation_ID]:")) {
					setConversationID(data.replace("[Conversation_ID]:", "").trim());
					continue;
				}

				assistantReply += data;
				setCurrentResponse(() => {
					return assistantReply;
				});
			}
		}
	};

	return {
		messages,
		input,
		setInput,
		sendMessage,
		conversationID,
		currentResponse,
		loading,
	};
}
