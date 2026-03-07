/**
 * Content Generation & AI Chat API handlers
 */
import { HttpResponse, http } from "msw";

/**
 * Default handlers - content generation and AI chat
 */
export const contentHandlers = [
	// Generate content
	http.post("*/api/protected/content/generate", () => {
		return HttpResponse.json({
			content:
				"Here are 5 tips for building a strong developer community on social media:\n\n1. Share your real experiences, not just polished wins.\n2. Engage with replies and build genuine conversations.\n3. Post consistently, even when the engagement is low.\n4. Use visuals to break up technical content.\n5. Collaborate with other developers in your niche.",
			contentType: "text",
			suggestedTags: ["community", "developers", "tips"],
		});
	}),

	// AI Chat (SSE stream mock)
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
	}),
];

/**
 * Scenario factories for test overrides
 */
export const contentScenarios = {
	/** Generation error */
	generationError: () =>
		http.post("*/api/protected/content/generate", () => {
			return HttpResponse.json(
				{ error: "Content generation failed" },
				{ status: 500 },
			);
		}),

	/** Chat error */
	chatError: () =>
		http.post("*/api/protected/chat", () => {
			return HttpResponse.json({ error: "Chat unavailable" }, { status: 503 });
		}),
};
