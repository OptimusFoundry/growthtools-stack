#!/usr/bin/env node
// Vendors quiet into an app, and checks the vendored copy is untouched.
//
//   node <path-to-quiet>/scripts/quiet.mjs sync [--to vendor/quiet]   (run in the app)
//   npx quiet check [--to vendor/quiet]                                 (in the app, e.g. in CI)
//
// sync copies quiet's source (no stories, tests or reference mirror) into the app, replacing what
// was there, and writes a package.json whose exports point at that source, so the app depends on
// it with "@optimusfoundry/quiet": "file:./vendor/quiet" and imports stay `@optimusfoundry/quiet`.
// It also places quiet's Claude Code plugin (claude/: the quiet-app skill, the quiet-screen-reviewer
// agent and the quiet-guard hooks) at .claude/skills/quiet/ in the project root, where Claude Code
// loads it as a skills-directory plugin: no settings.json entry, and it loads in place, so a pull
// takes effect at the next session. The project root is the nearest folder from the app up to the
// git root that has a .claude/ (else the git root), or --claude-root <dir>; in a monorepo (app in
// webapp/) that is the repo root.
// The copy is read-only: fixes go to the quiet repo, then sync again. check fails when a vendored
// or placed file was edited, added or removed since the last sync (quiet.manifest.json holds the
// hashes), or when settings.json still registers the quiet-guard hooks older syncs added.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MANIFEST = "quiet.manifest.json";
// What an app needs from quiet, relative to the quiet repo root.
const COPY = [
	"src",
	"stylelint",
	"docs/guidelines",
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
// quiet's Claude Code plugin, and where it goes in the project root.
const PLUGIN = "claude";
const PLUGIN_AT = ".claude/skills/quiet";
const SETTINGS = ".claude/settings.json";
const GUARD = "quiet-guard.mjs";

// Every file below root, dotfiles included (the plugin's manifest is .claude-plugin/plugin.json).
const files = (root) =>
	readdirSync(root, { recursive: true })
		.filter((f) => f !== MANIFEST && !f.endsWith(".DS_Store") && statSync(join(root, f)).isFile())
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
	const placed = place(source, root, previous?.placed ?? {});
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
	console.log(
		`Claude: plugin quiet → ${relative(app, join(root, PLUGIN_AT))} (${Object.keys(placed).length} files)`,
	);
	if (staleHooks(root))
		console.warn(
			`warning: ${relative(app, join(root, SETTINGS))} still registers ${GUARD}; the plugin runs it now. Remove those hook entries (quiet check fails until you do).`,
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
  claude trust    the plugin loads once the workspace is trusted, in sessions started at the project root
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

/** Places quiet's plugin at <root>/.claude/skills/quiet/, replacing it, and removes files an
 * earlier sync placed that this one doesn't (older syncs put the skill and agent in .claude/ directly). */
function place(source, root, before) {
	const to = join(root, PLUGIN_AT);
	rmSync(to, { recursive: true, force: true });
	cpSync(join(source, PLUGIN), to, { recursive: true });
	const placed = Object.fromEntries(files(to).map((f) => [join(PLUGIN_AT, f), sha(join(to, f))]));
	for (const f of Object.keys(before)) {
		if (f in placed) continue;
		rmSync(join(root, f), { force: true });
		// Drop the folders it leaves empty, below .claude/.
		const claude = join(root, ".claude");
		for (let dir = dirname(join(root, f)); dir.startsWith(claude + sep); dir = dirname(dir)) {
			if (!existsSync(dir) || readdirSync(dir).length) break;
			rmSync(dir, { recursive: true });
		}
	}
	return placed;
}

/** Whether settings.json still registers quiet-guard, as syncs before the plugin did. */
function staleHooks(root) {
	try {
		return JSON.stringify(
			JSON.parse(readFileSync(join(root, SETTINGS), "utf8")).hooks ?? {},
		).includes(GUARD);
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
		...(staleHooks(root)
			? [
					`stale    ${GUARD} hooks in ${relative(process.cwd(), join(root, SETTINGS))} (the plugin runs them)`,
				]
			: []),
	];
	if (problems.length) {
		console.error(problems.join("\n"));
		fail(
			`${problems.length} problem(s) since quiet ${manifest.version} was synced. Make the change in the quiet repo and sync again.`,
		);
	}
	console.log(
		`quiet ${manifest.version} (${manifest.commit?.slice(0, 7) ?? "no git"}): ${now.length} vendored and ${Object.keys(manifest.placed ?? {}).length} placed files untouched`,
	);
}

function fail(message) {
	console.error(`quiet: ${message}`);
	process.exit(1);
}

if (command === "sync") sync();
else if (command === "check") check();
else fail("usage: quiet sync [--to vendor/quiet] | quiet check [--to vendor/quiet]");
