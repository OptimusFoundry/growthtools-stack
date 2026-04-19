/**
 * Content Generation & AI Chat API handlers
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";

const generatedContent = {
	content:
		"Here are 5 tips for building a strong developer community on social media:\n\n1. Share your real experiences, not just polished wins.\n2. Engage with replies and build genuine conversations.\n3. Post consistently, even when the engagement is low.\n4. Use visuals to break up technical content.\n5. Collaborate with other developers in your niche.",
	contentType: "text",
	suggestedTags: ["community", "developers", "tips"],
};

const streamingChatHandler = () =>
	http.post("*/api/protected/chat", () => {
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			start(controller) {
				const chunks = [
					'data: {"content":"I can "}\n\n',
					'data: {"content":"help you "}\n\n',
					'data: {"content":"create engaging "}\n\n',
					'data: {"content":"social media content!"}\n\n',
					"data: [DONE]\n\n",
				];
				for (const chunk of chunks) {
					controller.enqueue(encoder.encode(chunk));
				}
				controller.close();
			},
		});

		return new HttpResponse(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	});

export const contentEndpoints = {
	generate: setupEndpoint(
		"POST",
		"*/api/protected/content/generate",
		generatedContent,
		{ successStatus: 200 },
	),
	// `chat` uses a streaming response — we keep the streaming happy-path as a
	// custom handler, but expose the numeric error statuses via setupEndpoint.
	chat: setupEndpoint("POST", "*/api/protected/chat", { ok: true }),
};

// Streaming happy-path overrides the generic JSON success for chat.
contentEndpoints.chat[200] = streamingChatHandler;

export const contentHandlers = Object.values(contentEndpoints).map((e) =>
	e[200](),
);

export const contentScenarios = {};
