// Demo agent: given a commit, drives Playwright via Gemini tool-use to
// produce a short video showing off what changed. Records the whole session
// regardless of what the model does, so even a failed demo yields a clip.
//
// CLI usage:
//   GEMINI_API_KEY=... npm run demo -- --commit 06fdc6f
//   (or add --goal "Show the new /test-login page" to override the auto-goal)

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
	type Content,
	type FunctionCall,
	FunctionCallingConfigMode,
	type FunctionDeclaration,
	GoogleGenAI,
	Type,
} from "@google/genai";
import { type Page, chromium } from "playwright";
import { loginAs } from "./auth.ts";

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DemoInput {
	appUrl: string;
	email: string;
	password: string;
	commit: string;
	/** Override the goal derived from the diff. */
	goal?: string;
	/** Repo root for git diff. Defaults to this repo. */
	repoRoot?: string;
	/** Output root. Defaults to ./captures. */
	outDir?: string;
	/** Hard caps on the agent loop. */
	maxSteps?: number;
	wallClockMs?: number;
	/** Gemini model id. Defaults to gemini-2.5-flash. */
	model?: string;
}

export interface DemoResult {
	captureDir: string;
	videoPath: string;
	narrationPath: string;
	transcriptPath: string;
	stepCount: number;
}

// ---------------------------------------------------------------------------
// Tool schemas exposed to Gemini. Each tool is a thin wrapper over Playwright.
// Keep the vocabulary small so the model has few wrong turns to take.
// ---------------------------------------------------------------------------

const SELECTOR_BY_VALUES = ["testid", "text", "role", "label", "placeholder"];

const tools: FunctionDeclaration[] = [
	{
		name: "navigate",
		description: "Go to a URL. Accepts an absolute URL or a path (will be joined with the app base URL).",
		parameters: {
			type: Type.OBJECT,
			properties: {
				url: { type: Type.STRING, description: "Absolute URL or leading-slash path like /posts/new" },
			},
			required: ["url"],
		},
	},
	{
		name: "click",
		description:
			"Click an element. Pick the most specific locator strategy: testid > role+name > label > text.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				by: {
					type: Type.STRING,
					enum: SELECTOR_BY_VALUES,
					description: "Locator strategy",
				},
				value: { type: Type.STRING, description: "Selector value (test-id, visible text, role name, etc.)" },
				name: { type: Type.STRING, description: "Accessible name when by=role (e.g. button's visible text)." },
			},
			required: ["by", "value"],
		},
	},
	{
		name: "fill",
		description: "Type text into an input. Same locator strategy as click.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				by: { type: Type.STRING, enum: SELECTOR_BY_VALUES },
				value: { type: Type.STRING },
				name: { type: Type.STRING },
				text: { type: Type.STRING, description: "Text to type into the element." },
			},
			required: ["by", "value", "text"],
		},
	},
	{
		name: "press",
		description: "Press a keyboard key (Enter, Tab, Escape, etc.).",
		parameters: {
			type: Type.OBJECT,
			properties: { key: { type: Type.STRING } },
			required: ["key"],
		},
	},
	{
		name: "scroll",
		description: "Scroll the page vertically by a number of pixels (positive = down).",
		parameters: {
			type: Type.OBJECT,
			properties: { pixels: { type: Type.NUMBER } },
			required: ["pixels"],
		},
	},
	{
		name: "wait",
		description: "Pause for N milliseconds (useful after an action that triggers an animation or network call).",
		parameters: {
			type: Type.OBJECT,
			properties: { ms: { type: Type.NUMBER } },
			required: ["ms"],
		},
	},
	{
		name: "screenshot",
		description: "Take an explicit screenshot. Each other action already returns a fresh screenshot, so use this only to linger on the current view.",
		parameters: { type: Type.OBJECT, properties: {} },
	},
	{
		name: "done",
		description: "End the demo. Provide a one-paragraph narration describing what was shown.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				narration: {
					type: Type.STRING,
					description: "Short human-readable summary of the demo, 1-3 sentences.",
				},
			},
			required: ["narration"],
		},
	},
];

// ---------------------------------------------------------------------------
// Locator resolution — maps the model's {by, value, name} to a Playwright locator.
// ---------------------------------------------------------------------------

interface LocatorSpec {
	by: string;
	value: string;
	name?: string;
}

function resolveLocator(page: Page, spec: LocatorSpec) {
	switch (spec.by) {
		case "testid":
			return page.getByTestId(spec.value);
		case "text":
			return page.getByText(spec.value);
		case "role":
			return page.getByRole(
				spec.value as Parameters<typeof page.getByRole>[0],
				spec.name ? { name: spec.name } : undefined,
			);
		case "label":
			return page.getByLabel(spec.value);
		case "placeholder":
			return page.getByPlaceholder(spec.value);
		default:
			throw new Error(`Unknown locator strategy: ${spec.by}`);
	}
}

// ---------------------------------------------------------------------------
// Tool executor — runs a Gemini function call on the live Playwright page and
// returns a JSON-serializable result plus a screenshot for the next turn.
// ---------------------------------------------------------------------------

interface ToolContext {
	page: Page;
	appUrl: string;
	captureDir: string;
	stepIndex: { value: number };
	done: { value: boolean; narration?: string };
}

async function executeTool(
	call: FunctionCall,
	ctx: ToolContext,
): Promise<{ message: string; screenshotBase64?: string; screenshotPath?: string }> {
	const args = (call.args ?? {}) as Record<string, unknown>;
	const { page, appUrl } = ctx;

	switch (call.name) {
		case "navigate": {
			const rawUrl = String(args.url ?? "");
			const url = rawUrl.startsWith("http") ? rawUrl : `${appUrl}${rawUrl}`;
			await page.goto(url, { waitUntil: "networkidle" });
			return snapshot(ctx, `navigated to ${url}`);
		}
		case "click": {
			const loc = resolveLocator(page, args as unknown as LocatorSpec);
			await loc.click({ timeout: 5000 });
			return snapshot(ctx, `clicked ${JSON.stringify(args)}`);
		}
		case "fill": {
			const loc = resolveLocator(page, args as unknown as LocatorSpec);
			await loc.fill(String(args.text ?? ""), { timeout: 5000 });
			return snapshot(ctx, `filled ${JSON.stringify({ ...args, text: "***" })}`);
		}
		case "press": {
			await page.keyboard.press(String(args.key ?? ""));
			return snapshot(ctx, `pressed ${args.key}`);
		}
		case "scroll": {
			const pixels = Number(args.pixels ?? 0);
			await page.evaluate((p) => window.scrollBy({ top: p, behavior: "smooth" }), pixels);
			await page.waitForTimeout(400);
			return snapshot(ctx, `scrolled ${pixels}px`);
		}
		case "wait": {
			const ms = Math.min(Number(args.ms ?? 0), 5000);
			await page.waitForTimeout(ms);
			return snapshot(ctx, `waited ${ms}ms`);
		}
		case "screenshot":
			return snapshot(ctx, "screenshot");
		case "done":
			ctx.done.value = true;
			ctx.done.narration = String(args.narration ?? "");
			return { message: "done" };
		default:
			return { message: `unknown tool: ${call.name}` };
	}
}

async function snapshot(ctx: ToolContext, message: string) {
	ctx.stepIndex.value += 1;
	const fname = `step-${String(ctx.stepIndex.value).padStart(2, "0")}.png`;
	const outPath = path.join(ctx.captureDir, fname);
	const buf = await ctx.page.screenshot({ path: outPath, fullPage: false });
	return {
		message,
		screenshotBase64: buf.toString("base64"),
		screenshotPath: outPath,
	};
}

// ---------------------------------------------------------------------------
// Diff fetch — we hand the raw diff (truncated) to the model as context.
// ---------------------------------------------------------------------------

// Gemini free tier throttles at 5 req/min. On a 429 the API returns the
// exact retry delay in the RetryInfo detail; honour it, clamped to a sane
// ceiling and our overall wall clock budget.
async function callWithRetry<T>(
	fn: () => Promise<T>,
	deadline: number,
	maxAttempts = 4,
): Promise<T> {
	let lastErr: unknown;
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			const status = (err as { status?: number }).status;
			if (status !== 429) throw err;
			const retryMs = extractRetryMs(err) ?? 15_000;
			const remaining = deadline - Date.now();
			if (remaining <= 0) throw err;
			const sleepMs = Math.min(retryMs, remaining - 500);
			console.log(`[agent] 429; sleeping ${sleepMs}ms (attempt ${attempt + 1})`);
			if (sleepMs <= 0) throw err;
			await new Promise((resolve) => setTimeout(resolve, sleepMs));
		}
	}
	throw lastErr;
}

function extractRetryMs(err: unknown): number | null {
	const msg = (err as { message?: string }).message ?? "";
	const match = msg.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
	if (!match?.[1]) return null;
	return Math.ceil(Number.parseFloat(match[1]) * 1000);
}

async function fetchCommitContext(commit: string, repoRoot: string): Promise<{
	summary: string;
	diff: string;
}> {
	const { stdout: summary } = await execFileP(
		"git",
		["show", "--stat", "--format=%s%n%n%b", commit],
		{ cwd: repoRoot, maxBuffer: 1024 * 1024 },
	);
	const { stdout: diffOut } = await execFileP(
		"git",
		["show", "--format=", commit],
		{ cwd: repoRoot, maxBuffer: 4 * 1024 * 1024 },
	);
	// Keep the diff bounded so we stay in the model's happy zone.
	const diff = diffOut.length > 40_000 ? `${diffOut.slice(0, 40_000)}\n… [truncated]` : diffOut;
	return { summary: summary.trim(), diff };
}

// ---------------------------------------------------------------------------
// Main entry — runs the demo loop.
// ---------------------------------------------------------------------------

export async function runDemo(input: DemoInput): Promise<DemoResult> {
	const {
		appUrl,
		email,
		password,
		commit,
		goal,
		repoRoot = path.resolve(__dirname, ".."),
		outDir = path.join(__dirname, "captures"),
		maxSteps = 20,
		// Generous budget because Gemini free tier caps at 5 RPM so a 20-step
		// run will likely spend a couple of minutes waiting out 429s.
		wallClockMs = 5 * 60_000,
		model = "gemini-2.5-flash",
	} = input;

	const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
	if (!apiKey) {
		throw new Error("Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) to run the demo agent.");
	}

	const captureDir = path.join(outDir, commit.slice(0, 12), "demo");
	await fs.mkdir(captureDir, { recursive: true });

	const { summary, diff } = await fetchCommitContext(commit, repoRoot);

	const browser = await chromium.launch();
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		recordVideo: { dir: captureDir, size: { width: 1440, height: 900 } },
	});
	const page = await context.newPage();
	const stepIndex = { value: 0 };
	const doneState: { value: boolean; narration?: string } = { value: false };
	const transcript: Array<{ step: number; tool: string; args: unknown; result: string }> = [];

	let videoPath = "";
	let narrationPath = "";
	const transcriptPath = path.join(captureDir, "transcript.json");

	try {
		await loginAs(page, { appUrl, email, password });

		const initialSnap = await snapshot(
			{ page, appUrl, captureDir, stepIndex, done: doneState },
			"initial state after login",
		);

		const ai = new GoogleGenAI({ apiKey });

		const currentUrl = page.url();
		const systemInstruction = [
			"You are a product demo agent. You drive a real browser via tools to record a short, marketing-quality clip showing off what a commit changed.",
			"",
			"SESSION STATE — READ CAREFULLY:",
			"- The browser is ALREADY SIGNED IN as a real demo user. Authentication is done.",
			"- The first attached screenshot shows the current authenticated state of the browser.",
			"- Do NOT navigate to /test-login, /signin, or any other authentication page. Do NOT fill email/password fields or click login buttons — doing so will log the user out and ruin the demo.",
			"- The ONLY exception: if the commit is itself a change to a login page, you may view it, but do not type credentials.",
			"",
			"YOUR JOB:",
			"1. Read the diff to figure out which user-visible screen / component changed.",
			"2. Navigate directly to the affected page in the app.",
			"3. Interact just enough to reveal the new behaviour on camera (fill a field, click the new button, hover the new element).",
			"4. Call `done` with a 1-2 sentence narration of what the commit ships to users — describe the feature, not your steps.",
			"",
			"LOCATOR PRIORITY: prefer testid (grep the diff for `data-testid`). Fall back to role+name, then visible text.",
			`HARD LIMITS: at most ${maxSteps} tool calls. Aim for 5-10 for a clean clip.`,
		].join("\n");

		const userPrompt = [
			`Goal: ${goal ?? "Demonstrate the user-visible change introduced in this commit."}`,
			"",
			`Current browser URL: ${currentUrl}  (already authenticated — start from here)`,
			"",
			`Commit ${commit.slice(0, 12)} — ${summary}`,
			"",
			"Diff:",
			"```",
			diff,
			"```",
		].join("\n");

		const history: Content[] = [
			{
				role: "user",
				parts: [
					{ text: userPrompt },
					{
						inlineData: {
							mimeType: "image/png",
							data: initialSnap.screenshotBase64 ?? "",
						},
					},
				],
			},
		];

		const deadline = Date.now() + wallClockMs;

		const generate = () =>
			ai.models.generateContent({
				model,
				contents: history,
				config: {
					systemInstruction,
					tools: [{ functionDeclarations: tools }],
					// Force a function call every turn. Without this, Gemini 2.5
					// sometimes regresses to emitting pseudo-Python `tool_code`
					// text instead of structured function calls. `done` is the
					// only way out of the loop.
					toolConfig: {
						functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
					},
				},
			});

		while (!doneState.value && stepIndex.value < maxSteps && Date.now() < deadline) {
			const response = await callWithRetry(generate, deadline);

			const modelContent = response.candidates?.[0]?.content;
			const parts = modelContent?.parts ?? [];
			const functionCall = parts.find((p) => p.functionCall)?.functionCall;

			if (!functionCall) {
				const text = parts.map((p) => p.text ?? "").join("").trim();
				console.log(`[agent] no tool call; model said: ${text || "(empty)"}`);
				doneState.value = true;
				doneState.narration = text || "Model ended without a narration.";
				break;
			}

			const ctx: ToolContext = { page, appUrl, captureDir, stepIndex, done: doneState };
			const result: {
				message: string;
				screenshotBase64?: string;
				screenshotPath?: string;
			} = await executeTool(functionCall, ctx).catch((err: unknown) => ({
				message: `error: ${err instanceof Error ? err.message : String(err)}`,
			}));

			transcript.push({
				step: stepIndex.value,
				tool: functionCall.name ?? "",
				args: functionCall.args,
				result: result.message,
			});

			console.log(`[agent] ${functionCall.name}(${JSON.stringify(functionCall.args)}) -> ${result.message}`);

			// Echo the model's full content (parts included) so any thought_signature
			// parts Gemini 3 emits round-trip correctly — stripping them fails with
			// "Function call is missing a thought_signature" on follow-up requests.
			if (modelContent) {
				history.push(modelContent);
			}

			const responseParts: Content["parts"] = [
				{
					functionResponse: {
						name: functionCall.name ?? "",
						response: { message: result.message },
					},
				},
			];
			if (result.screenshotBase64) {
				responseParts.push({
					inlineData: {
						mimeType: "image/png",
						data: result.screenshotBase64,
					},
				});
			}
			history.push({ role: "user", parts: responseParts });
		}

		const video = page.video();
		await page.close();
		await context.close();
		if (video) {
			const raw = await video.path();
			videoPath = path.join(captureDir, "recording.webm");
			await fs.rename(raw, videoPath);
		}

		narrationPath = path.join(captureDir, "narration.json");
		await fs.writeFile(
			narrationPath,
			`${JSON.stringify(
				{
					commit,
					summary,
					goal: goal ?? null,
					narration: doneState.narration ?? null,
					endedBy: doneState.value
						? "done"
						: stepIndex.value >= maxSteps
							? "max-steps"
							: "wall-clock",
					stepCount: stepIndex.value,
				},
				null,
				2,
			)}\n`,
		);
		await fs.writeFile(transcriptPath, `${JSON.stringify(transcript, null, 2)}\n`);
	} finally {
		await browser.close();
	}

	return {
		captureDir,
		videoPath,
		narrationPath,
		transcriptPath,
		stepCount: stepIndex.value,
	};
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

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

function stringArg(args: CliArgs, key: string): string | undefined {
	const value = args[key];
	return typeof value === "string" ? value : undefined;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const configPath = path.join(__dirname, "fixtures", "guinea-pig.json");
	const configRaw = await fs.readFile(configPath, "utf8");
	const config = JSON.parse(configRaw) as {
		appUrl: string;
		credentials: { email: string; password: string };
	};

	const commit = stringArg(args, "commit");
	if (!commit) {
		console.error("Usage: npm run demo -- --commit <sha> [--goal '...']");
		process.exit(1);
	}

	const appUrl = process.env.APP_URL ?? config.appUrl;
	const email = process.env.APP_EMAIL ?? config.credentials.email;
	const password = process.env.APP_PASSWORD ?? config.credentials.password;

	const modelArg = stringArg(args, "model");
	console.log(
		`→ demo run for commit ${commit} on ${appUrl} (model=${modelArg ?? "default"})`,
	);
	const result = await runDemo({
		appUrl,
		email,
		password,
		commit,
		goal: stringArg(args, "goal"),
		model: modelArg,
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
