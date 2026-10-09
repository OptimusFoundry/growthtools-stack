#!/usr/bin/env node
// Claude Code hook of quiet's plugin (hooks/hooks.json), for apps that vendor quiet.
//   pre   (PreToolUse, Edit|Write|MultiEdit|NotebookEdit): blocks any edit inside the vendored copy
//         or this plugin — quiet is fixed in the quiet repo and re-synced, never patched in an app.
//   post  (PostToolUse, Edit|Write|MultiEdit): lints a changed .css/.scss with the Stylelint of the
//         package it belongs to (in a monorepo, webapp/'s), and feeds problems back. Never blocks;
//         skips if that package has no Stylelint.
// The vendored copy is the folder holding quiet.manifest.json, wherever the app keeps it.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const mode = process.argv[2];
const root = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
const plugin = process.env.CLAUDE_PLUGIN_ROOT ? resolve(process.env.CLAUDE_PLUGIN_ROOT) : null;

let input = {};
try {
	input = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
	process.exit(0);
}
const file = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!file) process.exit(0);
const path = resolve(root, file);
const rel = relative(root, path);
const inside = (dir) => path === dir || path.startsWith(dir + sep);

/** The vendored copy holding this file: the nearest folder below the project root with quiet's manifest. */
function vendoredCopy() {
	for (let dir = dirname(path); dir !== root && dir.startsWith(root + sep); dir = dirname(dir)) {
		if (existsSync(join(dir, "quiet.manifest.json"))) return dir;
	}
	return null;
}
const owned = vendoredCopy() ?? (plugin && inside(plugin) ? plugin : null);

if (mode === "pre" && owned) {
	process.stderr.write(
		`${rel} is part of quiet (${relative(root, owned)}), which is read-only: \`npx quiet check\` fails on any edit and the next sync overwrites it. Make the change in the quiet repo, then run \`node <quiet>/scripts/quiet.mjs sync\` here. If quiet blocks the task, say so instead of patching the copy.\n`,
	);
	process.exit(2);
}

if (mode === "post" && !owned && /\.s?css$/.test(rel)) {
	// The nearest package from the file up to the project root that has Stylelint installed.
	let pkg = dirname(path);
	while (!existsSync(join(pkg, "node_modules/.bin/stylelint"))) {
		if (pkg === root || pkg === dirname(pkg)) process.exit(0);
		pkg = dirname(pkg);
	}
	try {
		execFileSync(join(pkg, "node_modules/.bin/stylelint"), [relative(pkg, path)], {
			cwd: pkg,
			encoding: "utf8",
			stdio: "pipe",
		});
	} catch (e) {
		process.stderr.write(`stylelint ${rel}\n${e.stdout || ""}${e.stderr || ""}`);
		process.exit(2);
	}
}
process.exit(0);
