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
import { captureLoginStorageState } from "./auth.ts";
import { runExplore } from "./explore.ts";
import type { ExplorationPlan } from "./types.ts";
import { finalizeRecording, resolveVideoSpeed } from "./video.ts";

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DemoInput {
	appUrl: string;
	email: string;
	password: string;
	commit: string;
	/** Override the goal derived from the diff. */
	goal?: string;
	/**
	 * Pre-fetched commit summary (message). In prod the base-server fetches
	 * this via the GitHub API and passes it through Kafka, so the container
	 * doesn't need a local git clone. When both `summary` and `diff` are
	 * supplied the agent skips the local `git show` fallback entirely.
	 */
	summary?: string;
	/** Pre-fetched unified diff text. See `summary`. */
	diff?: string;
	/** Repo root for git diff. Only used when summary/diff aren't supplied. */
	repoRoot?: string;
	/** Output root. Defaults to ./captures. */
	outDir?: string;
	/** Hard caps on the agent loop. */
	maxSteps?: number;
	wallClockMs?: number;
	/** Gemini model id. Defaults to gemini-2.5-flash-lite. */
	model?: string;
	/**
	 * If provided, skip Pass 1 and use this plan directly.
	 * When omitted AND twoPass is true, runExplore is called first.
	 */
	plan?: ExplorationPlan;
	/**
	 * Whether to run the Explore pass before recording.
	 * Default false for backward compat; ignored when `plan` is already supplied.
	 */
	twoPass?: boolean;
	/** Caps on the explore pass (only used when twoPass=true and plan is absent). */
	maxExploreSteps?: number;
	exploreWallClockMs?: number;
}

export interface DemoResult {
	captureDir: string;
	videoPath: string;
	narrationPath: string;
	transcriptPath: string;
	stepCount: number;
	/** Present when the Explore pass ran. */
	plan?: ExplorationPlan;
	/** Absolute path to explore/plan.json when explore ran. */
	planPath?: string;
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

// Runs inside the browser on every navigation. Creates a floating cursor
// element that tracks the latest mousemove — gives the recorded video
// something to show while the agent is "thinking" and animates clicks.
const cursorOverlayScript = `
(() => {
  if (window.__pwCursorInstalled) return;
  window.__pwCursorInstalled = true;

  const cursor = document.createElement('div');
  cursor.id = '__pw_cursor';
  cursor.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:22px',
    'height:22px',
    'border-radius:50%',
    'background:radial-gradient(circle,rgba(255,40,60,0.9) 0%,rgba(255,40,60,0.45) 55%,transparent 80%)',
    'border:2px solid rgba(255,255,255,0.9)',
    'box-shadow:0 0 10px rgba(0,0,0,0.35)',
    'pointer-events:none',
    'z-index:2147483647',
    'transform:translate(-50%,-50%)',
    'transition:transform 40ms linear,opacity 120ms',
    'opacity:0'
  ].join(';');

  const attach = () => {
    if (document.body && !cursor.isConnected) document.body.appendChild(cursor);
  };
  if (document.body) attach();
  else document.addEventListener('DOMContentLoaded', attach, { once: true });

  let currentX = 0;
  let currentY = 0;
  document.addEventListener('mousemove', (e) => {
    currentX = e.clientX;
    currentY = e.clientY;
    cursor.style.opacity = '1';
    cursor.style.transform = 'translate(' + (currentX) + 'px,' + (currentY) + 'px) translate(-50%,-50%)';
  }, true);

  // Pulse when clicked so the video shows something happening.
  document.addEventListener('mousedown', () => {
    cursor.animate(
      [
        { boxShadow: '0 0 0 0 rgba(255,40,60,0.6)' },
        { boxShadow: '0 0 0 16px rgba(255,40,60,0)' },
      ],
      { duration: 350, easing: 'ease-out' },
    );
  }, true);
})();
`;

// Animate the real mouse pointer from its current position to the center of
// the target element with many small steps — the injected cursor overlay
// renders the motion in the video.
async function animateMouseToLocator(
	page: Page,
	loc: Awaited<ReturnType<Page["locator"]>>,
): Promise<void> {
	try {
		const box = await loc.boundingBox({ timeout: 3000 });
		if (!box) return;
		const targetX = box.x + box.width / 2;
		const targetY = box.y + box.height / 2;
		// 25 steps over ~400ms gives a visible but snappy glide.
		await page.mouse.move(targetX, targetY, { steps: 25 });
		await page.waitForTimeout(120);
	} catch {
		// Element not visible / detached — fall through and let the click retry.
	}
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
			await animateMouseToLocator(page, loc);
			await loc.click({ timeout: 5000 });
			return snapshot(ctx, `clicked ${JSON.stringify(args)}`);
		}
		case "fill": {
			const loc = resolveLocator(page, args as unknown as LocatorSpec);
			await animateMouseToLocator(page, loc);
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
		summary: providedSummary,
		diff: providedDiff,
		repoRoot = path.resolve(__dirname, ".."),
		outDir = path.join(__dirname, "captures"),
		maxSteps,
		// Generous budget because Gemini free tier caps at 5 RPM so a 20-step
		// run will likely spend a couple of minutes waiting out 429s.
		wallClockMs = 5 * 60_000,
		model = "gemini-2.5-flash-lite",
	} = input;

	const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
	if (!apiKey) {
		throw new Error("Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) to run the demo agent.");
	}

	const captureDir = path.join(outDir, commit.slice(0, 12), "demo");
	await fs.mkdir(captureDir, { recursive: true });

	// In prod the caller (Kafka bridge) supplies summary + diff fetched from
	// GitHub's API. In local dev they're usually omitted, in which case we
	// fall back to shelling out to `git show` in the repo root.
	const { summary, diff } =
		providedSummary !== undefined || providedDiff !== undefined
			? { summary: providedSummary ?? "", diff: providedDiff ?? "" }
			: await fetchCommitContext(commit, repoRoot);

	// The base dir for this commit run is one level above the demo dir.
	// e.g. captures/06fdc6f123ab/  (demo/ and explore/ are siblings under it)
	const commitBaseDir = path.dirname(captureDir);

	// --- Two-pass: run Explore if requested and no plan supplied ---
	let activePlan: ExplorationPlan | undefined = input.plan;
	if (!activePlan && input.twoPass) {
		console.log("[agent] two-pass mode: starting explore pass");
		const exploreResult = await runExplore({
			appUrl,
			email,
			password,
			commit,
			summary,
			diff,
			captureDir: commitBaseDir,
			maxExploreSteps: input.maxExploreSteps,
			wallClockMs: input.exploreWallClockMs,
			model,
		});
		activePlan = exploreResult.plan;
		console.log(`[agent] explore done in ${exploreResult.stepCount} steps → ${exploreResult.planPath}`);
	}

	// If following a plan, we know the step count up front — cap tightly.
	const effectiveMaxSteps = maxSteps ?? 100;

	const browser = await chromium.launch();

	// Log in in a throwaway context so the /test-login page, credentials,
	// and redirect never land on the recorded video. We then open a fresh
	// recording context seeded with the resulting cookies + localStorage,
	// so Playwright starts recording at the post-login landing page.
	const storageState = await captureLoginStorageState(browser, {
		appUrl,
		email,
		password,
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		recordVideo: { dir: captureDir, size: { width: 1440, height: 900 } },
		storageState,
	});

	// Inject a visible cursor that follows mousemove events. Playwright's
	// video recorder doesn't render the OS cursor, so without this the clip
	// shows content changing with no apparent cause.
	await context.addInitScript(cursorOverlayScript);

	const page = await context.newPage();
	const stepIndex = { value: 0 };
	const doneState: { value: boolean; narration?: string } = { value: false };
	const transcript: Array<{ step: number; tool: string; args: unknown; result: string }> = [];

	let videoPath = "";
	let narrationPath = "";
	const transcriptPath = path.join(captureDir, "transcript.json");

	try {
		// Land the recording context on the app's post-login page so the
		// video opens on something meaningful rather than about:blank.
		await page.goto(`${appUrl}/`, { waitUntil: "networkidle" });

		const initialSnap = await snapshot(
			{ page, appUrl, captureDir, stepIndex, done: doneState },
			"initial state after login",
		);

		const ai = new GoogleGenAI({ apiKey });

		const currentUrl = page.url();

		const planSection = activePlan
			? [
					"",
					"DEMO PLAN — FOLLOW THIS EXACTLY:",
					`Goal: ${activePlan.goal}`,
					`Start URL: ${activePlan.startUrl}`,
					"",
					"Steps to execute IN ORDER:",
					...activePlan.steps.map(
						(s, i) =>
							`  ${i + 1}. [${s.label}] → tool=${s.tool} args=${JSON.stringify(s.args)}`,
					),
					"",
					`Narration for done(): "${activePlan.narration}"`,
					"",
					"Do NOT improvise. Execute steps 1-N in order, then call done() with the narration above.",
					"If a step fails, try once with a slightly different locator, then skip it and continue.",
				].join("\n")
			: "";

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
			"IF a click or fill fails with 'strict mode violation ... resolved to N elements', the text is not unique. Switch to `by=role` with a specific `name` (e.g. by=role value=button name='Publish') or pick a more specific label. Don't retry the same ambiguous locator.",
			`HARD LIMITS: at most ${effectiveMaxSteps} tool calls. Aim for 5-10 for a clean clip.`,
			planSection,
		].join("\n");

		const userPrompt = activePlan
			? [
					`Goal: ${activePlan.goal}`,
					"",
					`Navigate first to: ${activePlan.startUrl}`,
					"",
					`Commit ${commit.slice(0, 12)} — ${summary}`,
					"",
					"A demo plan has been pre-computed. Your system prompt contains the exact steps.",
					"Execute them in order, then call done().",
				].join("\n")
			: [
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

		while (!doneState.value && stepIndex.value < effectiveMaxSteps && Date.now() < deadline) {
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
			// Final clip is MP4 (H.264) — sharper than Playwright's VP8
			// default and plays on every social platform without
			// transcoding. finalizeRecording also drops idle frames so
			// Gemini-thinking pauses don't show up as dead air.
			videoPath = path.join(captureDir, "recording.mp4");
			await finalizeRecording(raw, videoPath, resolveVideoSpeed());
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
						: stepIndex.value >= effectiveMaxSteps
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
		plan: activePlan,
		planPath: activePlan
			? path.join(commitBaseDir, "explore", "plan.json")
			: undefined,
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
	const planArg = stringArg(args, "plan");
	const plan: ExplorationPlan | undefined = planArg
		? (JSON.parse(await fs.readFile(planArg, "utf8")) as ExplorationPlan)
		: undefined;

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
		twoPass: args["two-pass"] === true || plan !== undefined,
		plan,
		maxExploreSteps: args["max-explore-steps"]
			? Number(args["max-explore-steps"])
			: undefined,
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
