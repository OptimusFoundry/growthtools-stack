import type { Locator, Page } from "@playwright/test";

// Scoped to the Notifications region: Spinner, non-error Alert and DataGrid's
// live span are also role=status, so a bare role query breaks strict mode.
export function toastLocator(
	page: Page,
	role: "status" | "alert",
	hasText?: string | RegExp,
): Locator {
	const toasts = page
		.getByRole("region", { name: "Notifications", exact: true })
		.getByRole(role);
	return hasText === undefined ? toasts : toasts.filter({ hasText });
}
