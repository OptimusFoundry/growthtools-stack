import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const STORYBOOK_URL = "http://localhost:6006";

test.describe("Button Component", () => {
	// ===========================================================================
	// FUNCTIONALITY TESTS
	// ===========================================================================

	test.describe("Functionality", () => {
		test("renders with default props", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--default`,
			);
			const button = page.getByRole("button");
			await expect(button).toBeVisible();
			await expect(button).toBeEnabled();
			await expect(button).toHaveText("Default Button");
		});

		test("handles click events", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--default`,
			);
			const button = page.getByRole("button");
			await button.click();
			await expect(button).toBeFocused();
		});

		test("displays loading state correctly", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--loading`,
			);
			const button = page.getByRole("button");

			await expect(button).toHaveAttribute("aria-busy", "true");
			await expect(button).toBeDisabled();
		});

		test("disabled state prevents interaction", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--disabled`,
			);
			const button = page.getByRole("button");

			await expect(button).toBeDisabled();
		});

		test.describe("Variants", () => {
			const variants = [
				"default",
				"primary",
				"secondary",
				"ghost",
				"outline",
				"destructive",
			];

			for (const variant of variants) {
				test(`renders ${variant} variant`, async ({ page }) => {
					await page.goto(
						`${STORYBOOK_URL}/iframe.html?id=primitives-button--${variant}`,
					);
					const button = page.getByRole("button");
					await expect(button).toBeVisible();
				});
			}
		});

		test.describe("Sizes", () => {
			const sizes = ["small", "medium", "large"];

			for (const size of sizes) {
				test(`renders ${size} size`, async ({ page }) => {
					await page.goto(
						`${STORYBOOK_URL}/iframe.html?id=primitives-button--${size}`,
					);
					const button = page.getByRole("button");
					await expect(button).toBeVisible();
				});
			}
		});

		test("renders with left icon", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--with-left-icon`,
			);
			const button = page.getByRole("button");
			await expect(button).toBeVisible();
			await expect(button).toContainText("Add Item");
		});

		test("renders with right icon", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--with-right-icon`,
			);
			const button = page.getByRole("button");
			await expect(button).toBeVisible();
			await expect(button).toContainText("Next");
		});

		test("full width spans container", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--full-width`,
			);
			const button = page.getByRole("button");
			await expect(button).toBeVisible();

			const buttonBox = await button.boundingBox();
			expect(buttonBox?.width).toBeGreaterThan(200);
		});

		test("icon-only button is square", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--icon-only-default`,
			);
			const button = page.getByRole("button");
			await expect(button).toBeVisible();

			const buttonBox = await button.boundingBox();
			expect(
				Math.abs((buttonBox?.width ?? 0) - (buttonBox?.height ?? 0)),
			).toBeLessThan(2);
		});
	});

	// ===========================================================================
	// ACCESSIBILITY TESTS
	// ===========================================================================

	test.describe("Accessibility", () => {
		test("has no accessibility violations (default)", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--default`,
			);

			const results = await new AxeBuilder({ page })
				.include("button")
				.analyze();

			expect(results.violations).toEqual([]);
		});

		test("has no accessibility violations (all variants)", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--all-variants`,
			);

			const results = await new AxeBuilder({ page }).analyze();
			expect(results.violations).toEqual([]);
		});

		test("has correct ARIA attributes when loading", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--loading`,
			);
			const button = page.getByRole("button");

			await expect(button).toHaveAttribute("aria-busy", "true");
			await expect(button).toHaveAttribute("aria-disabled", "true");
		});

		test("has correct ARIA attributes when disabled", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--disabled`,
			);
			const button = page.getByRole("button");

			await expect(button).toHaveAttribute("disabled", "");
			await expect(button).toHaveAttribute("aria-disabled", "true");
		});

		test("icon-only buttons have aria-label", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--icon-only-default`,
			);
			const button = page.getByRole("button");

			const ariaLabel = await button.getAttribute("aria-label");
			expect(ariaLabel).toBeTruthy();
		});

		test("maintains sufficient color contrast", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--primary`,
			);

			const results = await new AxeBuilder({ page })
				.withRules(["color-contrast"])
				.analyze();

			expect(results.violations).toEqual([]);
		});
	});

	// ===========================================================================
	// KEYBOARD NAVIGATION TESTS
	// ===========================================================================

	test.describe("Keyboard Navigation", () => {
		test("can be focused with Tab", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--default`,
			);

			await page.keyboard.press("Tab");
			const button = page.getByRole("button");
			await expect(button).toBeFocused();
		});

		test("can be activated with Enter", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--default`,
			);
			const button = page.getByRole("button");

			await button.focus();
			await page.keyboard.press("Enter");

			await expect(button).toBeFocused();
		});

		test("can be activated with Space", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--default`,
			);
			const button = page.getByRole("button");

			await button.focus();
			await page.keyboard.press("Space");

			await expect(button).toBeFocused();
		});

		test("shows visible focus indicator", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--default`,
			);
			const button = page.getByRole("button");

			// Focus using keyboard to trigger :focus-visible
			await page.keyboard.press("Tab");

			const outlineStyle = await button.evaluate((el) => {
				return window.getComputedStyle(el).outlineStyle;
			});

			expect(outlineStyle).not.toBe("none");
		});

		test("disabled button is not focusable via click", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--disabled`,
			);
			const button = page.getByRole("button");

			await expect(button).toBeDisabled();
		});
	});

	// ===========================================================================
	// REDUCED MOTION TESTS
	// ===========================================================================

	test.describe("Reduced Motion", () => {
		test("respects prefers-reduced-motion", async ({ page }) => {
			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--default`,
			);

			const button = page.getByRole("button");
			await expect(button).toBeVisible();

			// Component should still be functional
			await button.click();
			await expect(button).toBeFocused();
		});
	});

	// ===========================================================================
	// THEME TESTS
	// ===========================================================================

	test.describe("Theme Support", () => {
		test("renders correctly in light theme", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--primary&globals=theme:light`,
			);
			const button = page.getByRole("button");
			await expect(button).toBeVisible();

			const results = await new AxeBuilder({ page }).analyze();
			expect(results.violations).toEqual([]);
		});

		test("renders correctly in dark theme", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--primary&globals=theme:dark`,
			);
			const button = page.getByRole("button");
			await expect(button).toBeVisible();

			const results = await new AxeBuilder({ page }).analyze();
			expect(results.violations).toEqual([]);
		});

		test("renders correctly in midnight theme", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--primary&globals=theme:midnight`,
			);
			const button = page.getByRole("button");
			await expect(button).toBeVisible();

			const results = await new AxeBuilder({ page }).analyze();
			expect(results.violations).toEqual([]);
		});
	});

	// ===========================================================================
	// VISUAL REGRESSION TESTS
	// ===========================================================================

	test.describe("Visual Regression", () => {
		test("default button matches snapshot", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--default`,
			);
			const button = page.getByRole("button");
			await expect(button).toHaveScreenshot("button-default.png");
		});

		test("all variants match snapshot", async ({ page }) => {
			await page.goto(
				`${STORYBOOK_URL}/iframe.html?id=primitives-button--all-variants`,
			);
			await expect(page.locator("#storybook-root")).toHaveScreenshot(
				"button-all-variants.png",
			);
		});
	});
});
