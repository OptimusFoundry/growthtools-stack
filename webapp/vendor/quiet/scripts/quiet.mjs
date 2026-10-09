#!/usr/bin/env node
// Vendors quiet into an app, and checks the vendored copy is untouched.
//
//   node <path-to-quiet>/scripts/quiet.mjs sync [--to vendor/quiet]   (run in the app)
//   npx quiet check [--to vendor/quiet]                                 (in the app, e.g. in CI)
//
// sync copies quiet's source (no stories, tests or reference mirror) into the app, replacing what
// was there, and writes a package.json whose exports point at that source, so the app depends on
// it with "@optimusfoundry/quiet": "file:./vendor/quiet" and imports stay `@optimusfoundry/quiet`.
// It also places quiet's app-facing Claude assets where Claude Code reads them (claude/skills/** →
// .claude/skills/, claude/agents/** → .claude/agents/, sub-folders kept, e.g. agents/qa/) and
// registers claude/hooks/quiet-guard.mjs in .claude/settings.json, which blocks edits to the copy and
// lints changed CSS. In a monorepo (app in webapp/, .claude/ at the repo root) they go to the project
// root: the nearest folder from the app up to the git root that has a .claude/ (else the git root),
// or --claude-root <dir>. Only quiet's own
// entries are added or replaced; files quiet no longer ships are removed on the next sync.
// The copy is read-only: fixes go to the quiet repo, then sync again. check fails when a vendored
// or placed file was edited, added or removed since the last sync (quiet.manifest.json holds the
// hashes), or when the hook is no longer registered.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
	existsSync,
	globSync,
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST = "quiet.manifest.json";
// What an app needs from quiet, relative to the quiet repo root.
const COPY = [
	"src",
	"stylelint",
	"docs/guidelines",
	"claude",
	"DESIGN.md",
	"scripts/quiet.mjs",
	"scripts/quiet-audit.mjs",
	"scripts/quiet-audit-core.mjs",
	"scripts/quiet-audit-core.d.mts",
];
const SKIP = ["src/stories"];

const [command, ...args] = process.argv.slice(2);
const flag = (name, fallback) => {
	const i = args.indexOf(name);
	return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const target = resolve(flag("--to", "vendor/quiet"));

const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
// Claude assets placed in the app: <kind> under claude/ → .claude/<kind>/.
const PLACED_KINDS = ["skills", "agents"];
const SETTINGS = ".claude/settings.json";
const GUARD = "quiet-guard.mjs";
const HOOKS = [
	["PreToolUse", "Edit|Write|MultiEdit|NotebookEdit", "pre"],
	["PostToolUse", "Edit|Write|MultiEdit", "post"],
];

const files = (root) =>
	globSync("**/*", { cwd: root })
		.filter((f) => f !== MANIFEST && statSync(join(root, f)).isFile())
		.sort();

function sync() {
	const source = resolve(dirname(fileURLToPath(import.meta.url)), "..");
	if (!existsSync(join(source, "src/index.ts")) || existsSync(join(source, MANIFEST))) {
		fail(
			"sync runs from the quiet repo (node <quiet>/scripts/quiet.mjs sync), not a vendored copy",
		);
	}
	if (resolve(source) === resolve(process.cwd()))
		fail("run sync in the app, not in the quiet repo");
	const pkg = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
	const git = (...a) => {
		try {
			return execFileSync("git", ["-C", source, ...a], { encoding: "utf8" }).trim();
		} catch {
			return "";
		}
	};
	const dirty = git("status", "--porcelain", "--", ...COPY) !== "";
	const app = process.cwd();
	const where = relative(app, target) || ".";
	const root = projectRoot(app);
	const fromRoot = relative(root, target);
	const previous = existsSync(join(target, MANIFEST))
		? JSON.parse(readFileSync(join(target, MANIFEST), "utf8"))
		: null;

	rmSync(target, { recursive: true, force: true });
	for (const path of COPY) {
		cpSync(join(source, path), join(target, path), {
			recursive: true,
			filter: (from) => !SKIP.some((s) => from.startsWith(join(source, s))),
		});
	}
	writeFileSync(
		join(target, "package.json"),
		`${JSON.stringify(
			{
				name: pkg.name,
				version: pkg.version,
				description: `${pkg.description} Vendored by quiet sync — do not edit; change quiet and sync again.`,
				type: "module",
				private: true,
				sideEffects: ["**/*.css", "**/*.scss"],
				exports: {
					".": "./src/index.ts",
					"./style.css": "./src/styles/index.scss",
					"./fonts.css": "./src/styles/fonts.css",
					"./tokens.json": "./src/styles/tokens.generated.json",
					"./stylelint": "./stylelint/index.mjs",
					"./stylelint/config": "./stylelint/config.mjs",
				},
				bin: { quiet: "scripts/quiet.mjs", "quiet-audit": "scripts/quiet-audit.mjs" },
				dependencies: pkg.dependencies,
				peerDependencies: {
					react: pkg.peerDependencies.react,
					"react-dom": pkg.peerDependencies["react-dom"],
				},
			},
			null,
			"\t",
		)}\n`,
	);
	const placed = place(root, previous?.placed ?? {});
	const hooks = registerHooks(root, fromRoot);
	const manifest = {
		version: pkg.version,
		commit: git("rev-parse", "HEAD") || null,
		dirty,
		files: Object.fromEntries(files(target).map((f) => [f, sha(join(target, f))])),
		claudeRoot: relative(app, root) || ".",
		placed,
	};
	writeFileSync(join(target, MANIFEST), `${JSON.stringify(manifest, null, "\t")}\n`);

	console.log(
		`quiet ${pkg.version} (${manifest.commit?.slice(0, 7) ?? "no git"}) → ${where}: ${Object.keys(manifest.files).length} files`,
	);
	const claudeDir = relative(app, join(root, ".claude")) || ".claude";
	console.log(`Claude (${claudeDir}): ${Object.keys(placed).join(", ")}`);
	console.log(
		hooks
			? `Claude: ${relative(app, join(root, SETTINGS))} runs ${GUARD} (blocks edits to ${where}, lints changed CSS)`
			: `Claude: couldn't parse ${SETTINGS}; add the ${GUARD} hooks by hand (see ${where}/claude/hooks/${GUARD})`,
	);
	if (dirty)
		console.warn(
			"warning: the quiet repo has uncommitted changes in the synced files; the manifest's commit doesn't fully describe this copy",
		);
	console.log(`
First sync only, in the app:
  package.json    "dependencies": { "@optimusfoundry/quiet": "file:./${where}" }, then npm install
                  devDependencies quiet's source needs: sass-embedded, typescript (>= 5.8), react >= 19.2
  entry           import "@optimusfoundry/quiet/style.css";  import "@optimusfoundry/quiet/fonts.css";
  stylelint       extends: ["@optimusfoundry/quiet/stylelint/config"], ignoreFiles: ["${where}/**"]
                  (devDependencies: stylelint, stylelint-declaration-strict-value)
  biome/eslint    ignore ${where}/**
  CI              npx quiet check
  claude rules    if the project routes skills by path (.claude/rules/*.md), list quiet-app there for UI work
Commit the sync on its own: git add ${where} ${claudeDir} && git commit -m "chore: quiet ${pkg.version}"`);
}

/** Where the app's Claude Code config lives: --claude-root, else the nearest folder from the app up
 * to the git root that has a .claude/ (never above it: ~/.claude is the user's), else the git root. */
function projectRoot(app) {
	const explicit = flag("--claude-root", null);
	if (explicit) return resolve(explicit);
	let top = app;
	try {
		top = execFileSync("git", ["-C", app, "rev-parse", "--show-toplevel"], {
			encoding: "utf8",
		}).trim();
	} catch {}
	for (let dir = app; ; dir = dirname(dir)) {
		if (existsSync(join(dir, ".claude"))) return dir;
		if (dir === top || dir === dirname(dir)) return top;
	}
}

/** Copies the vendored claude/<kind>/** into <root>/.claude/<kind>/, removing ones quiet dropped. */
function place(app, before) {
	const placed = {};
	const from = join(target, "claude");
	for (const f of existsSync(from) ? files(from) : []) {
		const [kind, ...rest] = f.split("/");
		if (!PLACED_KINDS.includes(kind)) continue;
		const to = join(".claude", kind, ...rest);
		mkdirSync(dirname(join(app, to)), { recursive: true });
		cpSync(join(from, f), join(app, to));
		placed[to] = sha(join(app, to));
	}
	for (const f of Object.keys(before)) if (!(f in placed)) rmSync(join(app, f), { force: true });
	return placed;
}

/** Adds (or replaces) quiet-guard's hook entries in .claude/settings.json, leaving the rest alone. */
function registerHooks(app, where) {
	const path = join(app, SETTINGS);
	let text = "";
	let settings = {};
	if (existsSync(path)) {
		text = readFileSync(path, "utf8");
		try {
			settings = JSON.parse(text);
		} catch {
			return false;
		}
	}
	settings.hooks ??= {};
	for (const [event, matcher, mode] of HOOKS) {
		const kept = (settings.hooks[event] ?? [])
			.map((g) => ({
				...g,
				hooks: (g.hooks ?? []).filter((h) => !String(h.command).includes(GUARD)),
			}))
			.filter((g) => g.hooks.length);
		const command = `node "$CLAUDE_PROJECT_DIR/${where}/claude/hooks/${GUARD}" ${mode} ${where}`;
		settings.hooks[event] = [...kept, { matcher, hooks: [{ type: "command", command }] }];
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(settings, null, /^\t/m.test(text) ? "\t" : 2)}\n`);
	return true;
}

function hooksRegistered(app) {
	const path = join(app, SETTINGS);
	if (!existsSync(path)) return false;
	try {
		const hooks = JSON.parse(readFileSync(path, "utf8")).hooks ?? {};
		return HOOKS.every(([event]) =>
			(hooks[event] ?? []).some((g) =>
				(g.hooks ?? []).some((h) => String(h.command).includes(GUARD)),
			),
		);
	} catch {
		return false;
	}
}

function check() {
	const path = join(target, MANIFEST);
	if (!existsSync(path)) fail(`no ${relative(process.cwd(), path)}; run quiet sync first`);
	const manifest = JSON.parse(readFileSync(path, "utf8"));
	const root = resolve(manifest.claudeRoot ?? ".");
	const now = files(target);
	const problems = [
		...now.filter((f) => !(f in manifest.files)).map((f) => `added    ${f}`),
		...Object.keys(manifest.files)
			.filter((f) => !now.includes(f))
			.map((f) => `removed  ${f}`),
		...now
			.filter((f) => f in manifest.files && manifest.files[f] !== sha(join(target, f)))
			.map((f) => `edited   ${f}`),
		...Object.entries(manifest.placed ?? {}).flatMap(([f, hash]) => {
			const at = join(root, f);
			const shown = relative(process.cwd(), at);
			return !existsSync(at)
				? [`removed  ${shown}`]
				: sha(at) !== hash
					? [`edited   ${shown}`]
					: [];
		}),
		...(hooksRegistered(root)
			? []
			: [`missing  ${GUARD} hooks in ${relative(process.cwd(), join(root, SETTINGS))}`]),
	];
	if (problems.length) {
		console.error(problems.join("\n"));
		fail(
			`${problems.length} problem(s) since quiet ${manifest.version} was synced. Make the change in the quiet repo and sync again.`,
		);
	}
	console.log(
		`quiet ${manifest.version} (${manifest.commit?.slice(0, 7) ?? "no git"}): ${now.length} vendored and ${Object.keys(manifest.placed ?? {}).length} placed files untouched, hooks registered`,
	);
}

function fail(message) {
	console.error(`quiet: ${message}`);
	process.exit(1);
}

if (command === "sync") sync();
else if (command === "check") check();
else fail("usage: quiet sync [--to vendor/quiet] | quiet check [--to vendor/quiet]");
