// Capture worker: logs into a deployed app via /test-login, navigates to a
// page, and records a short video + screenshot. Built to be driven either
// from a CLI (dogfood) or imported as a function from a webhook handler.
//
// CLI usage:
//   node index.mjs --page /posts/new --commit 06fdc6f
//   node index.mjs --config fixtures/guinea-pig.json --page /calendar
//
// Env overrides:
//   APP_URL, APP_EMAIL, APP_PASSWORD, OUT_DIR

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {object} CaptureInput
 * @property {string} appUrl         Base URL of the deployed app (no trailing slash).
 * @property {string} email          Seeded test-login email.
 * @property {string} password       Seeded test-login password.
 * @property {string} pagePath       Target path to capture (e.g. "/posts/new").
 * @property {string} [commit]       Commit SHA; used to namespace outputs.
 * @property {string} [testLoginPath] Defaults to "/test-login".
 * @property {string} [outDir]       Defaults to "./captures".
 * @property {number} [dwellMs]      Milliseconds to linger on the page so the video has content. Default 3500.
 */

/**
 * @typedef {object} CaptureResult
 * @property {string} screenshotPath
 * @property {string} videoPath
 * @property {string} metadataPath
 * @property {string} captureDir
 */

/** @param {string} p */
function slugifyPath(p) {
	const trimmed = p.replace(/^\/+|\/+$/g, "");
	if (!trimmed) return "index";
	return trimmed.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
}

/** @param {string | undefined} sha */
function shortSha(sha) {
	if (!sha) return `local-${Date.now()}`;
	return sha.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || `local-${Date.now()}`;
}

/**
 * Drives a full capture. Exported so a webhook/queue worker can import it
 * without a CLI round-trip.
 * @param {CaptureInput} input
 * @returns {Promise<CaptureResult>}
 */
export async function capture(input) {
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
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		recordVideo: { dir: captureDir, size: { width: 1440, height: 900 } },
	});
	const page = await context.newPage();

	let screenshotPath;
	let videoPath;
	try {
		await page.goto(`${appUrl}${testLoginPath}`, { waitUntil: "networkidle" });
		await page.getByTestId("test-login-email").fill(email);
		await page.getByTestId("test-login-password").fill(password);
		await page.getByTestId("test-login-submit").click();

		// Wait until the app reports us on the post-login destination. The hidden
		// login page always redirects to "/" on success.
		await page.waitForURL(`${appUrl}/`, { timeout: 15000 });

		await page.goto(`${appUrl}${pagePath}`, { waitUntil: "networkidle" });
		await page.waitForLoadState("networkidle");

		// Scroll a little so the video isn't a static frame — this is the
		// "linger & reveal" pattern that makes a short clip feel alive.
		const body = await page.$("body");
		if (body) {
			await page.mouse.move(720, 450);
			await page.evaluate(() => window.scrollBy({ top: 200, behavior: "smooth" }));
			await page.waitForTimeout(Math.min(dwellMs, 5000));
			await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
			await page.waitForTimeout(600);
		}

		screenshotPath = path.join(captureDir, "screenshot.png");
		await page.screenshot({ path: screenshotPath, fullPage: true });

		// Video is only finalized when the context closes. Close the page first
		// so Playwright stops recording at a clean moment.
		const video = page.video();
		await page.close();
		await context.close();

		if (video) {
			const rawPath = await video.path();
			videoPath = path.join(captureDir, "recording.webm");
			// Playwright writes to a tmp-ish path; move it to the well-known name.
			await fs.rename(rawPath, videoPath);
		} else {
			videoPath = "";
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

function parseArgs(argv) {
	/** @type {Record<string, string | boolean>} */
	const args = {};
	for (let i = 0; i < argv.length; i++) {
		const token = argv[i];
		if (!token.startsWith("--")) continue;
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

async function loadConfig(configPath) {
	const raw = await fs.readFile(configPath, "utf8");
	return JSON.parse(raw);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const configPath =
		typeof args.config === "string"
			? path.resolve(args.config)
			: path.join(__dirname, "fixtures", "guinea-pig.json");

	let config = {};
	try {
		config = await loadConfig(configPath);
	} catch (err) {
		if (err.code !== "ENOENT") throw err;
	}

	const input = {
		appUrl: process.env.APP_URL ?? args["app-url"] ?? config.appUrl,
		email:
			process.env.APP_EMAIL ?? args.email ?? config.credentials?.email,
		password:
			process.env.APP_PASSWORD ??
			args.password ??
			config.credentials?.password,
		pagePath: args.page ?? args.path ?? "/",
		commit: args.commit ?? null,
		testLoginPath: config.testLoginPath ?? "/test-login",
		outDir:
			process.env.OUT_DIR ??
			args.out ??
			path.join(__dirname, "captures"),
	};

	if (!input.appUrl || !input.email || !input.password) {
		console.error(
			"Missing inputs. Provide --config <path> or APP_URL/APP_EMAIL/APP_PASSWORD.",
		);
		process.exit(1);
	}

	console.log(
		`→ capturing ${input.appUrl}${input.pagePath} (commit=${input.commit ?? "none"})`,
	);
	const result = await capture(input);
	console.log("✓ done");
	console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
