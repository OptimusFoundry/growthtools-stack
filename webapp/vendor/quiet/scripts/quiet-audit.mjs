#!/usr/bin/env node
// quiet-audit: measure rendered screens against quiet's tokens — off-scale spacing, type,
// radius and colour, heading/landmark structure, card-in-card, sideways scroll.
//
//   quiet-audit <url|story-id...> [--width 1280,390] [--theme foundry,foundry-dark]
//               [--base http://localhost:6020] [--json]
//
// A bare Storybook id (patterns-dashboard--default) expands to <base>/iframe.html?id=…
// Exit code 1 when anything other than "derived" colour is found.
import { auditUrl, group, RULES } from "./quiet-audit-core.mjs";

const args = process.argv.slice(2);
const opt = (name, def) => {
	const i = args.indexOf(`--${name}`);
	if (i < 0) return def;
	const v = args[i + 1];
	args.splice(i, 2);
	return v;
};
const json = args.includes("--json");
if (json) args.splice(args.indexOf("--json"), 1);
const widths = opt("width", "1280").split(",").map(Number);
const themes = opt("theme", "").split(",").filter(Boolean);
const base = opt("base", "http://localhost:6020");
if (!args.length || args.includes("--help")) {
	console.log(
		"usage: quiet-audit <url|story-id...> [--width 1280,390] [--theme foundry,foundry-dark] [--base url] [--json]",
	);
	process.exit(args.length ? 0 : 2);
}

let chromium;
try {
	({ chromium } = await import("@playwright/test"));
} catch {
	try {
		({ chromium } = await import("playwright"));
	} catch {
		console.error(
			"quiet-audit needs Playwright: npm i -D @playwright/test && npx playwright install chromium",
		);
		process.exit(2);
	}
}

const targets = args.map((a) =>
	/^[a-z0-9-]+--[a-z0-9-]+$/.test(a) ? `${base}/iframe.html?id=${a}&viewMode=story` : a,
);
const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];
for (const url of targets) {
	if (/[?&]id=catalog--/.test(url)) {
		results.push({
			url,
			skipped:
				"the catalog is the Claude Design reference copied as-is; audit quiet's own screens instead",
		});
		continue;
	}
	for (const width of widths) {
		for (const theme of themes.length ? themes : [undefined]) {
			const r = await auditUrl(page, url, { width, theme });
			results.push({ url, width, theme, tokens: r.tokens, findings: r.findings });
		}
	}
}
await browser.close();

// "derived" (colour-mix over tokens) is reported but doesn't fail the run
const total = results.reduce(
	(n, r) => n + (r.findings?.filter((f) => f.rule !== "derived").length ?? 0),
	0,
);
if (json) {
	console.log(
		JSON.stringify(
			results.map((r) =>
				r.findings ? { ...r, groups: group(r.findings), findings: undefined } : r,
			),
			null,
			2,
		),
	);
} else {
	for (const r of results) {
		const label = r.url.replace(/^.*[?&]id=([^&]+).*$/, "$1");
		if (r.skipped) {
			console.log(`\n${label}: skipped (${r.skipped})`);
			continue;
		}
		console.log(
			`\n${label} @${r.width}${r.theme ? ` ${r.theme}` : ""}: ${r.findings.length ? `${r.findings.length} findings` : "clean"}${r.tokens ? "" : " (no --q-* tokens found — is quiet's CSS loaded?)"}`,
		);
		const g = group(r.findings);
		for (const rule of RULES) {
			if (!g[rule]) continue;
			console.log(`  ${rule}`);
			for (const x of g[rule].slice(0, 8))
				console.log(`    ${String(x.count).padStart(3)}× ${x.value}  [${x.owner}]  ${x.example}`);
			if (g[rule].length > 8) console.log(`    … ${g[rule].length - 8} more values`);
		}
	}
	console.log(`\n${total} findings across ${results.length} runs`);
}
process.exit(total ? 1 : 0);
