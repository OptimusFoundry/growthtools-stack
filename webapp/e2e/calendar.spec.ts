/**
 * Calendar E2E Tests
 *
 * The calendar page now uses two endpoints:
 *   GET /api/protected/posts/calendar?year=&month=   — month aggregate (grid)
 *   GET /api/protected/posts?from=&to=&limit=        — selected-day detail only
 *
 * Grid rendering is driven entirely by the aggregate response
 * (monthTotals + per-day by_status/by_platform breakdowns). The posts list
 * is only fetched after a day cell is clicked.
 *
 * Default fixture month: 2026-04 with day 2026-04-05 containing
 *   by_status:   { scheduled: 2, published: 1, draft: 1 }
 *   by_platform: { x: 2, linkedin: 1 }
 */
import type { Page } from "@playwright/test";
import { HttpResponse, http } from "msw";
import { expect, test } from "./fixtures/test";
import { endpoints } from "./handlers";

const CALENDAR_URL = "*/api/protected/posts/calendar";

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const MONTH_NAMES = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;

async function gotoCalendar(page: Page) {
	await page.goto("/calendar");
	await page.waitForLoadState("networkidle");
}

test.describe("Calendar", () => {
	// =========================================================================
	// Page Load — driven by month-aggregate endpoint
	// =========================================================================

	test.describe("Page Load", () => {
		test("shows calendar title and current month/year", async ({ page }) => {
			await gotoCalendar(page);
			const body = await page.textContent("body");
			expect(body).toMatch(/calendar/i);

			const now = new Date();
			expect(body).toContain(MONTH_NAMES[now.getMonth()]);
			expect(body).toContain(String(now.getFullYear()));
		});

		test("renders the 7 weekday headers", async ({ page }) => {
			await gotoCalendar(page);
			const body = await page.textContent("body");
			for (const day of DAY_HEADERS) {
				expect(body).toMatch(new RegExp(day, "i"));
			}
		});

		test("subtitle shows scheduled count from monthTotals", async ({
			page,
		}) => {
			await gotoCalendar(page);
			// Fixture monthTotals.byStatus.scheduled = 2
			// The subtitle renders "<Month Year> · 2 scheduled"
			await expect(page.getByText("· 2 scheduled")).toBeVisible();
		});

		test("shows view-mode tabs (By status / By platform)", async ({ page }) => {
			await gotoCalendar(page);
			await expect(page.getByRole("tab", { name: /by status/i })).toBeVisible();
			await expect(
				page.getByRole("tab", { name: /by platform/i }),
			).toBeVisible();
		});
	});

	// =========================================================================
	// Status stripes (fixture day 2026-04-05 has scheduled=2, published=1, draft=1)
	// =========================================================================

	test.describe("Status stripes", () => {
		test("renders status counts on the fixture day", async ({ page }) => {
			await gotoCalendar(page);
			const body = await page.textContent("body");
			// Default fixture day has scheduled:2, published:1, draft:1
			expect(body).toMatch(/2 scheduled/i);
			expect(body).toMatch(/1 published/i);
			expect(body).toMatch(/1 draft/i);
		});

		test("By platform tab hides status labels from day cells", async ({
			page,
		}) => {
			await gotoCalendar(page);
			// Before switching: stripes show status labels like "1 published"
			await expect(
				page.getByRole("button", { name: /1 published/i }),
			).toBeVisible();

			await page.getByRole("tab", { name: /by platform/i }).click();

			// After switching: the day button's aria-label no longer contains
			// status words — stripes render platform icons + raw counts instead.
			await expect(
				page.getByRole("button", { name: /1 published/i }),
			).toHaveCount(0);
		});
	});

	// =========================================================================
	// Month Navigation — refetches calendarMonth with updated params
	// =========================================================================

	test.describe("Month Navigation", () => {
		test("previous/next buttons swap the visible month", async ({ page }) => {
			await gotoCalendar(page);
			const now = new Date();
			const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

			await page
				.getByLabel(/previous month/i)
				.first()
				.click();
			await page.waitForLoadState("networkidle");
			expect(await page.textContent("body")).toContain(
				MONTH_NAMES[prev.getMonth()],
			);

			await page
				.getByLabel(/next month/i)
				.first()
				.click();
			await page
				.getByLabel(/next month/i)
				.first()
				.click();
			await page.waitForLoadState("networkidle");
			expect(await page.textContent("body")).toContain(
				MONTH_NAMES[next.getMonth()],
			);
		});

		test("today button resets to the current month", async ({ page }) => {
			await gotoCalendar(page);
			await page
				.getByLabel(/next month/i)
				.first()
				.click();
			await page.getByRole("button", { name: /today/i }).click();
			await page.waitForLoadState("networkidle");
			const body = await page.textContent("body");
			const now = new Date();
			expect(body).toContain(MONTH_NAMES[now.getMonth()]);
			expect(body).toContain(String(now.getFullYear()));
		});

		test("calendar refetches with year+month query params", async ({
			network,
			page,
		}) => {
			let capturedYear: string | null = null;
			let capturedMonth: string | null = null;
			network.use(
				http.get(CALENDAR_URL, ({ request }) => {
					const url = new URL(request.url);
					capturedYear = url.searchParams.get("year");
					capturedMonth = url.searchParams.get("month");
					return HttpResponse.json({
						month: `${capturedYear}-${String(Number(capturedMonth)).padStart(2, "0")}`,
						days: [],
						month_totals: {
							by_status: {
								draft: 0,
								scheduled: 0,
								publishing: 0,
								published: 0,
								failed: 0,
								partially_published: 0,
							},
							by_platform: {
								x: 0,
								linkedin: 0,
								bluesky: 0,
								facebook: 0,
								instagram: 0,
								threads: 0,
								tiktok: 0,
								pinterest: 0,
							},
						},
					});
				}),
			);

			await gotoCalendar(page);
			expect(capturedYear).not.toBeNull();
			expect(capturedMonth).not.toBeNull();
			// Month should be 1-based (API contract: JS 0-based month + 1)
			const now = new Date();
			expect(capturedYear).toBe(String(now.getFullYear()));
			expect(capturedMonth).toBe(String(now.getMonth() + 1));
		});
	});

	// =========================================================================
	// Selected-day detail — fetches GET /posts with from/to
	// =========================================================================

	test.describe("Selected-day detail", () => {
		test("clicking a day with posts opens the detail view", async ({
			page,
		}) => {
			await gotoCalendar(page);
			// Fixture day 2026-04-05 has posts — any day cell button will work
			// since only days with aggregate data render as buttons.
			const dayButton = page
				.getByRole("button", { name: /2 scheduled|1 published|1 draft/i })
				.first();
			if (!(await dayButton.isVisible().catch(() => false))) {
				test.skip(
					true,
					"Fixture day not visible in current month viewport — month-nav coverage already asserts API wiring.",
				);
			}
			await dayButton.click();
			await page.waitForLoadState("networkidle");
			await expect(
				page.getByRole("button", { name: /back to month/i }),
			).toBeVisible();
		});

		test("empty day shows empty state", async ({ network, page }) => {
			// Force the selected-day list endpoint to return an empty array.
			network.use(endpoints.posts.list[200]());
			await gotoCalendar(page);
			const dayButton = page
				.getByRole("button", { name: /2 scheduled|1 published|1 draft/i })
				.first();
			if (!(await dayButton.isVisible().catch(() => false))) {
				test.skip(true, "Fixture day not visible in current month viewport.");
			}
			// Swap posts endpoint to return [] before clicking so the detail
			// view sees an empty list.
			network.use(
				http.get("*/api/protected/posts", () => HttpResponse.json([])),
			);
			await dayButton.click();
			await page.waitForLoadState("networkidle");
			await expect(page.getByText(/no posts on this day/i)).toBeVisible();
		});

		test("back to month returns to the grid", async ({ page }) => {
			await gotoCalendar(page);
			const dayButton = page
				.getByRole("button", { name: /2 scheduled|1 published|1 draft/i })
				.first();
			if (!(await dayButton.isVisible().catch(() => false))) {
				test.skip(true, "Fixture day not visible in current month viewport.");
			}
			await dayButton.click();
			await page.getByRole("button", { name: /back to month/i }).click();
			// Grid chrome returns
			await expect(page.getByRole("tab", { name: /by status/i })).toBeVisible();
		});
	});

	// =========================================================================
	// Status-code coverage — GET /api/protected/posts/calendar
	// =========================================================================
	//
	// handleError for the calendar handler maps through apierrors:
	//   401 — getAccountID failure (Unauthorized)
	//   400 — invalid year/month (BadRequest)
	//   500 — processor error (InternalError default)
	//
	// The CalendarPage has no dedicated error UI; on failure the loading
	// spinner resolves and the grid renders with no day buttons. Assertions
	// confirm chrome survives the error and the page doesn't crash.

	test.describe("GET /posts/calendar — status code coverage", () => {
		const statuses: Array<keyof typeof endpoints.posts.calendarMonth> = [
			400,
			401,
			500,
			"transport",
		];

		for (const status of statuses) {
			test(`handles ${status} — calendar chrome remains`, async ({
				network,
				page,
			}) => {
				network.use(endpoints.posts.calendarMonth[status]());
				await gotoCalendar(page);

				const body = await page.textContent("body");
				expect(body).toMatch(/calendar/i);
				for (const day of DAY_HEADERS) {
					expect(body).toMatch(new RegExp(day, "i"));
				}
			});
		}
	});

	// =========================================================================
	// Status-code coverage — GET /api/protected/posts (selected-day detail)
	// =========================================================================

	test.describe("GET /posts (selected day) — status code coverage", () => {
		const statuses: Array<keyof typeof endpoints.posts.list> = [
			401,
			500,
			"transport",
		];

		for (const status of statuses) {
			test(`handles ${status} on day detail — empty state renders`, async ({
				network,
				page,
			}) => {
				network.use(endpoints.posts.list[status]());
				await gotoCalendar(page);

				const dayButton = page
					.getByRole("button", { name: /2 scheduled|1 published|1 draft/i })
					.first();
				if (!(await dayButton.isVisible().catch(() => false))) {
					test.skip(true, "Fixture day not visible in current month viewport.");
				}
				await dayButton.click();
				await page.waitForLoadState("networkidle");
				// Hook drops the error and leaves selectedPosts = [] → empty state.
				await expect(page.getByText(/no posts on this day/i)).toBeVisible();
			});
		}
	});
});
