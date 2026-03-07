/**
 * Chat E2E Tests
 *
 * Tests for the AI chat assistant page.
 */
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";

test.describe("Chat", () => {
	// =========================================================================
	// Page Load
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows welcome message", async ({ page }) => {
			await page.goto("/chat");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/ai content assistant/i);
		});

		test("shows helpful description text", async ({ page }) => {
			await page.goto("/chat");
			await page.waitForLoadState("networkidle");

			const content = await page.textContent("body");
			expect(content).toMatch(/generate social media posts|brainstorm|refine/i);
		});
	});

	// =========================================================================
	// Chat Interface
	// =========================================================================

	test.describe("Chat Interface", () => {
		test("has message input", async ({ page }) => {
			await page.goto("/chat");
			await page.waitForLoadState("networkidle");

			const input = page.getByLabel(/chat message input/i);
			expect(await input.isVisible()).toBeTruthy();
		});

		test("has send button", async ({ page }) => {
			await page.goto("/chat");
			await page.waitForLoadState("networkidle");

			const sendBtn = page.getByLabel(/send message/i);
			expect(await sendBtn.isVisible()).toBeTruthy();
		});

		test("send button is disabled when input is empty", async ({ page }) => {
			await page.goto("/chat");
			await page.waitForLoadState("networkidle");

			const sendBtn = page.getByLabel(/send message/i);
			expect(await sendBtn.isDisabled()).toBeTruthy();
		});
	});

	// =========================================================================
	// Error Handling
	// =========================================================================

	test.describe("Error Handling", () => {
		test("handles chat API error gracefully", async ({ network, page }) => {
			network.use(
				http.post("*/api/protected/chat", () => {
					return HttpResponse.json(
						{ error: "Chat unavailable" },
						{ status: 503 },
					);
				}),
			);

			await page.goto("/chat");
			await page.waitForLoadState("networkidle");

			// Page should still load even with broken chat endpoint
			const content = await page.textContent("body");
			expect(content).toMatch(/ai content assistant/i);
		});
	});
});
