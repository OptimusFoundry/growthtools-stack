// Capture worker: logs into a deployed app via /test-login, navigates to a
// page, and records a short video + screenshot. Built to be driven either
// from a CLI (dogfood) or imported as a function from a webhook handler.
//
// CLI usage:
//   npm run capture -- --page /posts/new --commit 06fdc6f
//   npm run capture -- --config fixtures/guinea-pig.json --page /calendar
//
// Env overrides:
//   APP_URL, APP_EMAIL, APP_PASSWORD, OUT_DIR

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { captureLoginStorageState } from "./auth.ts";
import { finalizeRecording, resolveVideoSpeed } from "./video.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CaptureInput {
	/** Base URL of the deployed app (no trailing slash). */
	appUrl: string;
	/** Seeded test-login email. */
	email: string;
	/** Seeded test-login password. */
	password: string;
	/** Target path to capture (e.g. "/posts/new"). */
	pagePath: string;
	/** Commit SHA; used to namespace outputs. */
	commit?: string | null;
	/** Defaults to "/test-login". */
	testLoginPath?: string;
	/** Defaults to "./captures". */
	outDir?: string;
	/** Milliseconds to linger on the page so the video has content. Default 3500. */
	dwellMs?: number;
}

export interface CaptureResult {
	screenshotPath: string;
	videoPath: string;
	metadataPath: string;
	captureDir: string;
}

interface GuineaPigConfig {
	name?: string;
	repo?: string;
	appUrl?: string;
	testLoginPath?: string;
	credentials?: { email?: string; password?: string };
}

function slugifyPath(p: string): string {
	const trimmed = p.replace(/^\/+|\/+$/g, "");
	if (!trimmed) return "index";
	return trimmed.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
}

function shortSha(sha: string | null | undefined): string {
	if (!sha) return `local-${Date.now()}`;
	return sha.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || `local-${Date.now()}`;
}

/**
 * Drives a full capture. Exported so a webhook/queue worker can import it
 * without a CLI round-trip.
 */
export async function capture(input: CaptureInput): Promise<CaptureResult> {
	const {
		appUrl,
		email,
		password,
		pagePath,
		commit,
		testLoginPath = "/test-login",
		outDir = path.join(process.cwd(), "captures"),
		dwellMs = 3500,
	} = input;

	if (!appUrl || !email || !password || !pagePath) {
		throw new Error(
			"capture() requires appUrl, email, password, and pagePath",
		);
	}

	const captureDir = path.join(outDir, shortSha(commit), slugifyPath(pagePath));
	await fs.mkdir(captureDir, { recursive: true });

	const browser = await chromium.launch();

	// Log in off-camera in a no-video context, hand the session cookies +
	// localStorage to the recording context via storageState. The video
	// starts fresh at the target page — no /test-login, no credentials,
	// no login redirect on the clip.
	const storageState = await captureLoginStorageState(browser, {
		appUrl,
		email,
		password,
		testLoginPath,
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		recordVideo: { dir: captureDir, size: { width: 1440, height: 900 } },
		storageState,
	});
	const page = await context.newPage();

	let screenshotPath = "";
	let videoPath = "";
	try {
		await page.goto(`${appUrl}${pagePath}`, { waitUntil: "networkidle" });
		await page.waitForLoadState("networkidle");

		// Scroll a little so the video isn't a static frame — this is the
		// "linger & reveal" pattern that makes a short clip feel alive.
		await page.mouse.move(720, 450);
		await page.evaluate(() =>
			window.scrollBy({ top: 200, behavior: "smooth" }),
		);
		await page.waitForTimeout(Math.min(dwellMs, 5000));
		await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
		await page.waitForTimeout(600);

		screenshotPath = path.join(captureDir, "screenshot.png");
		await page.screenshot({ path: screenshotPath, fullPage: true });

		// Video is only finalized when the context closes. Close the page first
		// so Playwright stops recording at a clean moment.
		const video = page.video();
		await page.close();
		await context.close();

		if (video) {
			const rawPath = await video.path();
			// Final clip is MP4 (H.264, CRF 20) — sharper than Playwright's
			// VP8 default and plays on every social platform without
			// transcoding. finalizeRecording also drops idle frames and
			// applies the configured playback speed (default 2×).
			videoPath = path.join(captureDir, "recording.mp4");
			await finalizeRecording(rawPath, videoPath, resolveVideoSpeed());
		}
	} finally {
		await browser.close();
	}

	const metadata = {
		appUrl,
		pagePath,
		commit: commit ?? null,
		capturedAt: new Date().toISOString(),
		viewport: { width: 1440, height: 900 },
	};
	const metadataPath = path.join(captureDir, "metadata.json");
	await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

	return { screenshotPath, videoPath, metadataPath, captureDir };
}

type CliArgs = Record<string, string | boolean>;

function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {};
	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (!token?.startsWith("--")) continue;
		const key = token.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith("--")) {
			args[key] = true;
		} else {
			args[key] = next;
			i++;
		}
	}
	return args;
}

async function loadConfig(configPath: string): Promise<GuineaPigConfig> {
	try {
		const raw = await fs.readFile(configPath, "utf8");
		return JSON.parse(raw) as GuineaPigConfig;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
		throw err;
	}
}

function stringArg(args: CliArgs, key: string): string | undefined {
	const value = args[key];
	return typeof value === "string" ? value : undefined;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const configArg = stringArg(args, "config");
	const configPath = configArg
		? path.resolve(configArg)
		: path.join(__dirname, "fixtures", "guinea-pig.json");

	const config = await loadConfig(configPath);

	const appUrl =
		process.env.APP_URL ?? stringArg(args, "app-url") ?? config.appUrl;
	const email =
		process.env.APP_EMAIL ??
		stringArg(args, "email") ??
		config.credentials?.email;
	const password =
		process.env.APP_PASSWORD ??
		stringArg(args, "password") ??
		config.credentials?.password;
	const pagePath = stringArg(args, "page") ?? stringArg(args, "path") ?? "/";
	const commit = stringArg(args, "commit") ?? null;
	const outDir =
		process.env.OUT_DIR ??
		stringArg(args, "out") ??
		path.join(__dirname, "captures");

	if (!appUrl || !email || !password) {
		console.error(
			"Missing inputs. Provide --config <path> or APP_URL/APP_EMAIL/APP_PASSWORD.",
		);
		process.exit(1);
	}

	console.log(`→ capturing ${appUrl}${pagePath} (commit=${commit ?? "none"})`);
	const result = await capture({
		appUrl,
		email,
		password,
		pagePath,
		commit,
		testLoginPath: config.testLoginPath,
		outDir,
	});
	console.log("✓ done");
	console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((err: unknown) => {
		console.error(err);
		process.exit(1);
	});
}
