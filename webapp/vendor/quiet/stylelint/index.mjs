// Stylelint plugin for apps built on quiet: `quiet/known-tokens` reports any var(--q-…) that quiet
// doesn't declare (a typo, or a token renamed in a newer quiet), and any --q-* custom property the
// app invents — the --q- namespace is quiet's; a product theme may only set quiet's own tokens.
//
//   // stylelint.config.mjs
//   export default {
//     plugins: ["@optimusfoundry/quiet/stylelint"],
//     rules: { "quiet/known-tokens": true },
//   };
import { existsSync, readFileSync } from "node:fs";
import stylelint from "stylelint";

const {
	createPlugin,
	utils: { report, ruleMessages, validateOptions },
} = stylelint;

const ruleName = "quiet/known-tokens";
const messages = ruleMessages(ruleName, {
	unknown: (name) => `${name} is not a quiet token`,
	invented: (name) =>
		`${name} is not a quiet token; --q-* is quiet's namespace, name your own --app-*`,
});

// The published package ships dist/tokens.json; inside the quiet repo it is generated to src/styles.
const LIST = ["../dist/tokens.json", "../src/styles/tokens.generated.json"]
	.map((p) => new URL(p, import.meta.url))
	.find((u) => existsSync(u));
const known = new Set(LIST ? JSON.parse(readFileSync(LIST, "utf8")) : []);
// A name followed by #{…} is built by SCSS interpolation and can only be checked once compiled.
const USE = /var\(\s*(--q-[a-zA-Z0-9-]+)(#\{)?/g;

/** @type {import("stylelint").Rule<boolean, { definitions?: boolean }>} */
const rule =
	(primary, secondary = {}) =>
	(root, result) => {
		if (!validateOptions(result, ruleName, { actual: primary, possible: [true] })) return;
		if (!LIST) throw new Error(`${ruleName}: no tokens.json next to the plugin`);
		root.walkDecls((decl) => {
			if (
				secondary.definitions !== false &&
				decl.prop.startsWith("--q-") &&
				!known.has(decl.prop)
			) {
				report({
					ruleName,
					result,
					node: decl,
					message: messages.invented(decl.prop),
					word: decl.prop,
				});
			}
			for (const [, name, interpolated] of decl.value.matchAll(USE)) {
				if (!interpolated && !known.has(name))
					report({ ruleName, result, node: decl, message: messages.unknown(name), word: name });
			}
		});
	};
rule.ruleName = ruleName;
rule.messages = messages;
rule.meta = { url: "https://github.com/OptimusFoundry/quiet#styling-your-own-pages" };

export default createPlugin(ruleName, rule);
