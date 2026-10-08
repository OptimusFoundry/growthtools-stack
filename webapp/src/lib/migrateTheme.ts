const PROTO_KEY = "proto-theme";
const QUIET_KEY = "quiet-theme";

export function migrateProtoTheme(): void {
	try {
		const proto = localStorage.getItem(PROTO_KEY);
		if (proto === null) return;
		if (localStorage.getItem(QUIET_KEY) === null) {
			localStorage.setItem(
				QUIET_KEY,
				proto === "carbon" ? "foundry-dark" : "foundry",
			);
		}
		localStorage.removeItem(PROTO_KEY);
	} catch {
		// Storage can be blocked (private mode); the app starts on the default theme.
	}
}
