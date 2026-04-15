import { useCallback, useState } from "react";
import type { VideoConfigData } from "@/types/video";

type ChatMessage = {
	role: "user" | "assistant";
	content: string;
};

export function useRefineVideoConfig() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [currentResponse, setCurrentResponse] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const sendMessage = useCallback(
		async (
			configId: string,
			message: string,
		): Promise<VideoConfigData | null> => {
			if (!message.trim()) return null;

			const userMessage: ChatMessage = { role: "user", content: message };
			setMessages((prev) => [...prev, userMessage]);
			setLoading(true);
			setCurrentResponse("");

			let updatedConfig: VideoConfigData | null = null;

			try {
				const res = await fetch(
					`${import.meta.env.VITE_API_URL}/api/protected/video/configs/${configId}/refine`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "text/event-stream",
						},
						credentials: "include",
						body: JSON.stringify({ message }),
					},
				);

				const reader = res.body?.getReader();
				if (!reader) {
					throw new Error("Failed to get reader from response body");
				}

				const decoder = new TextDecoder("utf-8");
				let assistantReply = "";
				let currentEvent = "";

				while (true) {
					const { value, done } = await reader.read();
					if (done) break;

					const chunk = decoder.decode(value, { stream: true });
					const lines = chunk.split("\n");

					for (const line of lines) {
						if (line.startsWith("event: ")) {
							currentEvent = line.slice(7).trim();
							continue;
						}

						if (line.startsWith("data: ")) {
							const data = line.slice(6);

							if (currentEvent === "config") {
								try {
									updatedConfig = JSON.parse(data) as VideoConfigData;
								} catch {
									// ignore parse errors
								}
								currentEvent = "";
								continue;
							}

							if (currentEvent === "done") {
								currentEvent = "";
								continue;
							}

							if (currentEvent === "error") {
								currentEvent = "";
								continue;
							}

							// Default: text streaming chunks
							assistantReply += data;
							setCurrentResponse(assistantReply);
							currentEvent = "";
						}
					}
				}

				setCurrentResponse(null);
				if (assistantReply) {
					setMessages((prev) => [
						...prev,
						{ role: "assistant", content: assistantReply },
					]);
				}

				return updatedConfig;
			} catch (err) {
				console.error("Failed to refine video config:", err);
				setCurrentResponse(null);
				return null;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const setInitialMessages = useCallback((msgs: ChatMessage[]) => {
		setMessages(msgs);
	}, []);

	return {
		messages,
		currentResponse,
		loading,
		sendMessage,
		setInitialMessages,
	};
}
