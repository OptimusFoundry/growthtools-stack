// Bundlers replace `process.env.NODE_ENV` at build time. The declaration is scoped to this module, so
// quiet needs no Node types and doesn't clash with an app's @types/node.
declare const process: { env: { NODE_ENV?: string } };

/** True outside production builds (and wherever `process` doesn't exist), for dev-only warnings. */
export function isDev(): boolean {
	return typeof process === "undefined" || process.env.NODE_ENV !== "production";
}
