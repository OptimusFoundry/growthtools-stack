export function trimTrailingPeriod(text: string): string {
	const trimmed = text.trimEnd();
	if (!trimmed.endsWith(".") || trimmed.endsWith("..")) return text;
	return trimmed.slice(0, -1).trimEnd();
}
