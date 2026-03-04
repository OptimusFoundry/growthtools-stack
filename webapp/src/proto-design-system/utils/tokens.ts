/**
 * Runtime token access utilities
 */

/**
 * Get a CSS custom property value at runtime
 */
export function getToken(tokenName: string, element?: HTMLElement): string {
	const target = element ?? document.documentElement;
	return getComputedStyle(target).getPropertyValue(`--${tokenName}`).trim();
}

/**
 * Set a CSS custom property value at runtime
 */
export function setToken(
	tokenName: string,
	value: string,
	element?: HTMLElement,
): void {
	const target = element ?? document.documentElement;
	target.style.setProperty(`--${tokenName}`, value);
}

/**
 * Remove a CSS custom property at runtime
 */
export function removeToken(tokenName: string, element?: HTMLElement): void {
	const target = element ?? document.documentElement;
	target.style.removeProperty(`--${tokenName}`);
}

/**
 * Get multiple tokens at once
 */
export function getTokens(
	tokenNames: string[],
	element?: HTMLElement,
): Record<string, string> {
	return tokenNames.reduce(
		(acc, name) => {
			acc[name] = getToken(name, element);
			return acc;
		},
		{} as Record<string, string>,
	);
}

/**
 * Convert a token reference to a CSS var() call
 */
export function tokenVar(tokenName: string, fallback?: string): string {
	if (fallback) {
		return `var(--${tokenName}, ${fallback})`;
	}
	return `var(--${tokenName})`;
}
