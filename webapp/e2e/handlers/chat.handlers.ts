/**
 * Chat API handlers
 *
 * Covers:
 *   POST /api/protected/chat              — SSE stream (200 on open, error on failure)
 *   GET  /api/protected/conversations     — list
 *   GET  /api/protected/conversations/:id — single
 *   DELETE /api/protected/conversations/:id
 */
import { HttpResponse, http } from "msw";
import { setupEndpoint } from "../helpers/endpoint";

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

const sseChatHandler = () =>
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
	});

export const chatEndpoints = {
	chat: setupEndpoint("POST", "*/api/protected/chat", { ok: true }),
	listConversations: setupEndpoint("GET", "*/api/protected/conversations", {
		conversations: mockConversations,
	}),
	getConversation: setupEndpoint("GET", "*/api/protected/conversations/:id", {
		conversation: mockConversations[0],
		messages: mockMessages,
	}),
	deleteConversation: setupEndpoint(
		"DELETE",
		"*/api/protected/conversations/:id",
		{ message: "conversation deleted" },
		{ successStatus: 200 },
	),
};

// Streaming happy-path overrides the generic JSON success for chat.
chatEndpoints.chat[200] = sseChatHandler;

export const chatHandlers = Object.values(chatEndpoints).map((e) => e[200]());

export const chatScenarios = {};
