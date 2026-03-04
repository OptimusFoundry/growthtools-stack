/**
 * Format price from cents to display string
 *
 * @param unitAmount - Price in cents (e.g., 2900 = $29.00)
 * @param currency - ISO 4217 currency code (e.g., "usd")
 * @returns Formatted price string (e.g., "$29.00")
 */
export function formatPrice(
	unitAmount: number | null,
	currency: string | null,
): string {
	if (unitAmount === null || unitAmount === 0) {
		return "Free";
	}

	const amount = unitAmount / 100;
	const currencyCode = currency?.toUpperCase() ?? "USD";

	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currencyCode,
		}).format(amount);
	} catch {
		// Fallback for invalid currency codes
		return `$${amount.toFixed(2)}`;
	}
}
