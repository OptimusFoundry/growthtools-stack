/**
 * Chat API handlers
 *
 * Covers:
 *   POST /api/protected/chat              — SSE stream (200 on open, error event on failure)
 *   GET  /api/protected/conversations     — list
 *   GET  /api/protected/conversations/:id — single
 *   DELETE /api/protected/conversations/:id
 */
import { HttpResponse, http } from "msw";

const CONV_ID = "conv_test_123";
const CONV_ID_2 = "conv_test_456";
const now = new Date().toISOString();

export const mockConversations = [
	{
		id: CONV_ID,
		account_id: "acc_123",
		title: "How to grow on LinkedIn",
		created_at: now,
		updated_at: now,
	},
	{
		id: CONV_ID_2,
		account_id: "acc_123",
		title: "Content ideas for developers",
		created_at: now,
		updated_at: now,
	},
];

export const mockMessages = [
	{
		id: "msg_1",
		conversation_id: CONV_ID,
		role: "user",
		content: "How do I grow my LinkedIn audience?",
		created_at: now,
	},
	{
		id: "msg_2",
		conversation_id: CONV_ID,
		role: "assistant",
		content:
			"Here are some proven strategies for growing your LinkedIn audience...",
		created_at: now,
	},
];

/**
 * Default happy-path handlers
 */
export const chatHandlers = [
	// POST /chat — respond with a minimal SSE stream
	http.post("*/api/protected/chat", () => {
		const body = [
			`data: Hello from the AI assistant\n\n`,
			`event: done\ndata: {"conversation_id":"${CONV_ID}"}\n\n`,
		].join("");
		return new HttpResponse(body, {
			status: 200,
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	}),

	// GET /conversations — list
	http.get("*/api/protected/conversations", () => {
		return HttpResponse.json({ conversations: mockConversations });
	}),

	// GET /conversations/:id — single
	http.get("*/api/protected/conversations/:id", ({ params }) => {
		const conv = mockConversations.find((c) => c.id === params.id);
		if (!conv) {
			return HttpResponse.json(
				{ error: "Conversation not found" },
				{ status: 404 },
			);
		}
		return HttpResponse.json({ conversation: conv, messages: mockMessages });
	}),

	// DELETE /conversations/:id
	http.delete("*/api/protected/conversations/:id", ({ params }) => {
		const conv = mockConversations.find((c) => c.id === params.id);
		if (!conv) {
			return HttpResponse.json(
				{ error: "Conversation not found" },
				{ status: 404 },
			);
		}
		return HttpResponse.json({ message: "conversation deleted" });
	}),
];

// ============================================================================
// Scenario factories — one per non-2xx status code / failure mode
// ============================================================================

export const chatScenarios = {
	// POST /chat — 401 (account ID missing from context / cookie expired)
	chatUnauthorized: () =>
		http.post("*/api/protected/chat", () =>
			HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
		),

	// POST /chat — 400 (missing required message field)
	chatBadRequest: () =>
		http.post("*/api/protected/chat", () =>
			HttpResponse.json({ error: "message is required" }, { status: 400 }),
		),

	// POST /chat — 500 (processor/stream failure)
	chatServerError: () =>
		http.post("*/api/protected/chat", () =>
			HttpResponse.json(
				{ error: "failed to process message" },
				{ status: 500 },
			),
		),

	// POST /chat — 503 (stream unavailable / AI provider down)
	chatServiceUnavailable: () =>
		http.post("*/api/protected/chat", () =>
			HttpResponse.json(
				{ error: "Failed to stream response" },
				{ status: 503 },
			),
		),

	// POST /chat — transport-level failure (no response at all)
	chatNetworkError: () =>
		http.post("*/api/protected/chat", () => HttpResponse.error()),

	// GET /conversations — 401
	listConversationsUnauthorized: () =>
		http.get("*/api/protected/conversations", () =>
			HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
		),

	// GET /conversations — 500
	listConversationsServerError: () =>
		http.get("*/api/protected/conversations", () =>
			HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
		),

	// GET /conversations — transport failure
	listConversationsNetworkError: () =>
		http.get("*/api/protected/conversations", () => HttpResponse.error()),

	// GET /conversations/:id — 401
	getConversationUnauthorized: () =>
		http.get("*/api/protected/conversations/:id", () =>
			HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
		),

	// GET /conversations/:id — 404 (already deleted or wrong account)
	getConversationNotFound: () =>
		http.get("*/api/protected/conversations/:id", () =>
			HttpResponse.json({ error: "Conversation not found" }, { status: 404 }),
		),

	// GET /conversations/:id — 500
	getConversationServerError: () =>
		http.get("*/api/protected/conversations/:id", () =>
			HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
		),

	// DELETE /conversations/:id — 401
	deleteConversationUnauthorized: () =>
		http.delete("*/api/protected/conversations/:id", () =>
			HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
		),

	// DELETE /conversations/:id — 404
	deleteConversationNotFound: () =>
		http.delete("*/api/protected/conversations/:id", () =>
			HttpResponse.json({ error: "Conversation not found" }, { status: 404 }),
		),

	// DELETE /conversations/:id — 500
	deleteConversationServerError: () =>
		http.delete("*/api/protected/conversations/:id", () =>
			HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
		),
};
