// Pass 1: Exploration agent.
//
// Drives Playwright WITHOUT recording to understand the app and produce a
// structured ExplorationPlan. The plan is then handed to the Record pass
// (agent.ts) so every recorded step is intentional.
//
// callWithRetry, extractRetryMs, cursorOverlayScript, resolveLocator, and
// animateMouseToLocator are copied verbatim from agent.ts to avoid circular
// dependencies (agent.ts → explore.ts is fine; a shared utils.ts would also
// be fine but adds a file the plan asks us not to create).

import fs from "node:fs/promises";
import path from "node:path";
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
import type { DemoStep, ExplorationPlan } from "./types.ts";

// ---------------------------------------------------------------------------
// Shared helpers — copied verbatim from agent.ts to avoid circular deps
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
			console.log(`[explore] 429; sleeping ${sleepMs}ms (attempt ${attempt + 1})`);
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

interface LocatorSpec {
	by: string;
	value: string;
	name?: string;
}

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
// Explore-pass tool set
// ---------------------------------------------------------------------------

// Single source of truth for tool names accepted by the Record agent.
// Used both in the `done` schema (as an enum the model must satisfy) and in
// post-hoc validation. Keeping these in sync is critical: if the model emits
// a step whose tool isn't here, the Record agent can't execute it.
const VALID_RECORD_TOOLS_LIST = [
	"navigate",
	"click",
	"fill",
	"press",
	"scroll",
	"wait",
	"screenshot",
] as const;
const VALID_RECORD_TOOLS = new Set<string>(VALID_RECORD_TOOLS_LIST);

// Minimum interactions required for a plan to be considered useful. Fewer
// than this means the explore agent didn't actually find the affected
// surface and the Record agent would burn budget on a dud.
const MIN_PLAN_STEPS = 3;

// Validate the raw `steps` array the model passes to done(). Returns the
// successfully-parsed steps and a human-readable list of problems with the
// rejected entries. Used both:
//   1. inside executeExploreTool's `done` case — to send feedback to the
//      model so it can retry instead of producing a 0-step plan, and
//   2. after the explore loop exits — as a final defensive check before
//      writing plan.json.
function validatePlanSteps(rawSteps: unknown): {
	valid: DemoStep[];
	problems: string[];
} {
	const valid: DemoStep[] = [];
	const problems: string[] = [];
	if (!Array.isArray(rawSteps)) {
		return { valid, problems: ["steps is not an array"] };
	}
	rawSteps.forEach((entry, idx) => {
		if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
			problems.push(`steps[${idx}]: not an object`);
			return;
		}
		const step = entry as Record<string, unknown>;
		const label = typeof step.label === "string" ? step.label.trim() : "";
		const tool = typeof step.tool === "string" ? step.tool.trim() : "";
		const args =
			step.args != null &&
			typeof step.args === "object" &&
			!Array.isArray(step.args)
				? (step.args as Record<string, unknown>)
				: null;
		if (!label) problems.push(`steps[${idx}]: missing/empty label`);
		if (!tool) problems.push(`steps[${idx}]: missing/empty tool`);
		else if (!VALID_RECORD_TOOLS.has(tool))
			problems.push(
				`steps[${idx}]: tool="${tool}" is not one of ${VALID_RECORD_TOOLS_LIST.join(", ")}`,
			);
		if (!args) problems.push(`steps[${idx}]: missing/invalid args object`);
		if (label && tool && VALID_RECORD_TOOLS.has(tool) && args) {
			valid.push({ label, tool: tool as DemoStep["tool"], args });
		}
	});
	return { valid, problems };
}

const exploreTools: FunctionDeclaration[] = [
	{
		name: "navigate",
		description:
			"Go to a URL. Use this freely — exploration is cheap. Accepts absolute URLs or leading-slash paths.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				url: { type: Type.STRING },
			},
			required: ["url"],
		},
	},
	{
		name: "click",
		description:
			"Click an element to discover what happens. Same locator strategies as the record pass.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				by: { type: Type.STRING, enum: ["testid", "text", "role", "label", "placeholder"] },
				value: { type: Type.STRING },
				name: { type: Type.STRING },
			},
			required: ["by", "value"],
		},
	},
	{
		name: "fill",
		description: "Type into an input to explore a form.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				by: { type: Type.STRING, enum: ["testid", "text", "role", "label", "placeholder"] },
				value: { type: Type.STRING },
				name: { type: Type.STRING },
				text: { type: Type.STRING },
			},
			required: ["by", "value", "text"],
		},
	},
	{
		name: "press",
		description: "Press a keyboard key.",
		parameters: {
			type: Type.OBJECT,
			properties: { key: { type: Type.STRING } },
			required: ["key"],
		},
	},
	{
		name: "scroll",
		description: "Scroll to reveal more of the page.",
		parameters: {
			type: Type.OBJECT,
			properties: { pixels: { type: Type.NUMBER } },
			required: ["pixels"],
		},
	},
	{
		name: "wait",
		description: "Wait for the UI to settle (max 5 s).",
		parameters: {
			type: Type.OBJECT,
			properties: { ms: { type: Type.NUMBER } },
			required: ["ms"],
		},
	},
	{
		name: "screenshot",
		description: "Capture the current view to examine it more closely.",
		parameters: { type: Type.OBJECT, properties: {} },
	},
	{
		name: "list_elements",
		description:
			"Return a JSON list of interactive elements on the current page (buttons, links, inputs). " +
			"Use this to understand what actions are available before deciding what to click.",
		parameters: { type: Type.OBJECT, properties: {} },
	},
	{
		name: "done",
		description:
			"Signal that exploration is complete. Provide the structured demo plan.",
		parameters: {
			type: Type.OBJECT,
			properties: {
				goal: {
					type: Type.STRING,
					description: "One sentence describing what this commit ships to users.",
				},
				startUrl: {
					type: Type.STRING,
					description:
						"Absolute URL of the first page the Record agent should open (e.g. https://app.example.com/posts).",
				},
				steps: {
					type: Type.ARRAY,
					description:
						`Ordered list of at least ${MIN_PLAN_STEPS} interactions the Record agent should execute. ` +
						"Each step MUST include all three fields — label, tool, args — populated. " +
						"Empty objects {} are NOT acceptable; they will be rejected. " +
						"args must match the named tool's parameter schema (same as the explore tools).",
					items: {
						type: Type.OBJECT,
						properties: {
							label: {
								type: Type.STRING,
								description:
									"Short human-readable description of what this step accomplishes (non-empty).",
							},
							tool: {
								type: Type.STRING,
								enum: [...VALID_RECORD_TOOLS_LIST],
								description: "The Record-agent tool to invoke for this step.",
							},
							args: {
								type: Type.OBJECT,
								description:
									"Arguments matching the tool's parameter schema (e.g. {url} for navigate, {by, value, name?} for click).",
							},
						},
						required: ["label", "tool", "args"],
					},
				},
				narration: {
					type: Type.STRING,
					description: "1-3 sentence narration for the end of the video.",
				},
			},
			required: ["goal", "startUrl", "steps", "narration"],
		},
	},
];

// ---------------------------------------------------------------------------
// list_elements implementation
// ---------------------------------------------------------------------------

async function executeListElements(page: Page): Promise<string> {
	const elements = await page.evaluate(() => {
		const selectors = [
			"button:not([disabled])",
			"a[href]",
			"input:not([type=hidden])",
			"select",
			"textarea",
			"[role=button]",
			"[data-testid]",
		];
		const seen = new Set<string>();
		const result: Array<{ tag: string; text: string; testid?: string; role?: string; href?: string }> = [];
		for (const sel of selectors) {
			for (const el of Array.from(document.querySelectorAll(sel))) {
				const key = el.outerHTML.slice(0, 120);
				if (seen.has(key)) continue;
				seen.add(key);
				result.push({
					tag: el.tagName.toLowerCase(),
					text: (el.textContent ?? "").trim().slice(0, 80),
					testid: (el as HTMLElement).dataset.testid,
					role: el.getAttribute("role") ?? undefined,
					href: el instanceof HTMLAnchorElement ? el.href : undefined,
				});
			}
		}
		return result.slice(0, 60); // cap to keep response size sane
	});
	return JSON.stringify(elements, null, 2);
}

// ---------------------------------------------------------------------------
// Local ToolContext and snapshot helper
// ---------------------------------------------------------------------------

interface ExploreToolContext {
	page: Page;
	appUrl: string;
	exploreDir: string;
	stepIndex: { value: number };
	done: { value: boolean; args?: Record<string, unknown> };
}

async function snapshot(ctx: ExploreToolContext, message: string) {
	ctx.stepIndex.value += 1;
	const fname = `step-${String(ctx.stepIndex.value).padStart(2, "0")}.png`;
	const outPath = path.join(ctx.exploreDir, fname);
	const buf = await ctx.page.screenshot({ path: outPath, fullPage: false });
	return {
		message,
		screenshotBase64: buf.toString("base64"),
		screenshotPath: outPath,
	};
}

async function executeExploreTool(
	call: FunctionCall,
	ctx: ExploreToolContext,
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
		case "list_elements": {
			// list_elements returns JSON as the tool response message string;
			// no screenshot is appended to that turn (it would waste tokens).
			const json = await executeListElements(page);
			return { message: json };
		}
		case "done": {
			// Validate the plan BEFORE accepting done. If steps is malformed
			// (e.g. the model sent `[{}]` or fewer than MIN_PLAN_STEPS valid
			// entries), refuse and respond with an error message so the
			// model gets feedback and can retry within the existing budget.
			// Without this, a bad done() silently produces a 0-step plan and
			// the whole capture fails after the browser closes.
			const { valid, problems } = validatePlanSteps(args.steps);
			if (valid.length < MIN_PLAN_STEPS) {
				const detail = problems.length
					? problems.slice(0, 8).join("; ")
					: `only ${valid.length} valid step(s)`;
				console.warn(
					`[explore] done() rejected: ${valid.length}/${MIN_PLAN_STEPS} valid steps. ${detail}`,
				);
				return {
					message:
						`done() rejected: need at least ${MIN_PLAN_STEPS} fully-populated steps but got ${valid.length} valid. ` +
						`Problems: ${detail}. ` +
						"Each step object MUST have non-empty label (string), tool (one of " +
						`${VALID_RECORD_TOOLS_LIST.join("/")}), and args (object matching that tool's schema). ` +
						"Continue exploring or call done() again with properly-populated steps.",
				};
			}
			ctx.done.value = true;
			ctx.done.args = args;
			return { message: "done" };
		}
		default:
			return { message: `unknown tool: ${call.name}` };
	}
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ExploreInput {
	appUrl: string;
	email: string;
	password: string;
	commit: string;
	summary: string;
	diff: string;
	captureDir: string;       // base capture dir; explore writes to {captureDir}/explore/
	maxExploreSteps?: number; // default 40
	wallClockMs?: number;     // default 4 * 60_000
	model?: string;           // default "gemini-2.5-flash-lite"
}

export interface ExploreResult {
	plan: ExplorationPlan;
	planPath: string;   // absolute path to plan.json
	exploreDir: string; // directory where explore screenshots live
	stepCount: number;
}

export async function runExplore(input: ExploreInput): Promise<ExploreResult> {
	const {
		appUrl,
		email,
		password,
		commit,
		summary,
		diff,
		captureDir,
		maxExploreSteps = 100,
		wallClockMs = 8 * 60_000,
		model = "gemini-2.5-flash-lite",
	} = input;

	const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
	if (!apiKey) {
		throw new Error("Set GEMINI_API_KEY (or GOOGLE_AI_API_KEY) to run the explore agent.");
	}

	// 1. Create explore dir
	const exploreDir = path.join(captureDir, "explore");
	await fs.mkdir(exploreDir, { recursive: true });

	const browser = await chromium.launch();

	// 2. Log in in a throwaway context — login is not recorded / on-camera
	const storageState = await captureLoginStorageState(browser, {
		appUrl,
		email,
		password,
	});

	// 3. Open a browser context WITHOUT recordVideo
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		storageState,
	});

	// Inject cursor overlay (consistent with record pass; not strictly needed
	// for exploration but keeps screenshots look the same).
	await context.addInitScript(cursorOverlayScript);

	const page = await context.newPage();
	const stepIndex = { value: 0 };
	const doneState: { value: boolean; args?: Record<string, unknown> } = { value: false };

	try {
		// 4. Navigate to the app
		await page.goto(`${appUrl}/`, { waitUntil: "networkidle" });

		// 5. Take an initial snapshot
		const ctx: ExploreToolContext = { page, appUrl, exploreDir, stepIndex, done: doneState };
		const initialSnap = await snapshot(ctx, "initial state after login");

		const ai = new GoogleGenAI({ apiKey });

		// 6. Build Gemini history with system prompt + user prompt
		const systemInstruction = [
			"You are the founder of this product, sitting down to record a short clip for",
			"today's 'what shipped' post. You know the app cold — every screen, every",
			"setting, every corner of the sidebar. The diff in front of you is a change",
			"YOU just merged. Your job is to open the app and show it off.",
			"",
			"A reader opens the post and watches your clip. You want them to think",
			"'oh, neat' — so you pick the framing that makes the change feel real. If it's",
			"a new page, you visit it and use it. If it's a faster save, you save something.",
			"If it's a new batch of themes, you open the theme picker and flip through the",
			"new ones. If it's a quiet backend tweak, you find the screen where a user",
			"would feel the difference. You don't need a procedure — you know the product,",
			"so you know where to go.",
			"",
			"Before you navigate anywhere, glance at the diff and say out loud (to",
			"yourself) what the user gets from this change. That sentence is your compass.",
			"If reading the diff leaves you unsure which surface to open, look at what it",
			"touches — component names, route files, registry entries, token names — and",
			"let the vocabulary guide you to the screen that hosts them.",
			"",
			"SESSION STATE:",
			"- The browser is ALREADY SIGNED IN. Do NOT visit /test-login or fill credentials.",
			"- You may navigate anywhere freely — nothing you do here is recorded.",
			"",
			"When you're on the right surface, call `done` with:",
			"- goal: one sentence a newsletter reader would understand",
			"- startUrl: the absolute URL the recording should open on",
			"- steps: an ordered list of { label, tool, args } — the shortest interaction",
			"  sequence that makes the change feel tangible on camera. At least 3 real",
			"  interactions; as many more as the change genuinely warrants. Don't pad.",
			"- narration: 1-3 sentences for the voiceover.",
			"",
			"LOCATOR PRIORITY: prefer testid (grep diff for data-testid). Fall back to",
			"role+name, then visible text. Be specific — avoid selectors that match",
			"multiple elements.",
			"",
			`HARD LIMITS: at most ${maxExploreSteps} tool calls. Call done well before the ceiling — leave room for a second look if your first guess was wrong.`,
		].join("\n");

		const userPrompt = [
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
					tools: [{ functionDeclarations: exploreTools }],
					toolConfig: {
						functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
					},
				},
			});

		// 7. Run the tool-call loop
		while (!doneState.value && stepIndex.value < maxExploreSteps && Date.now() < deadline) {
			const response = await callWithRetry(generate, deadline);

			const modelContent = response.candidates?.[0]?.content;
			const parts = modelContent?.parts ?? [];
			const functionCall = parts.find((p) => p.functionCall)?.functionCall;

			if (!functionCall) {
				const text = parts.map((p) => p.text ?? "").join("").trim();
				console.log(`[explore] no tool call; model said: ${text || "(empty)"}`);
				break;
			}

			const result: {
				message: string;
				screenshotBase64?: string;
				screenshotPath?: string;
			} = await executeExploreTool(functionCall, ctx).catch((err: unknown) => ({
				message: `error: ${err instanceof Error ? err.message : String(err)}`,
			}));

			console.log(
				`[explore] ${functionCall.name}(${JSON.stringify(functionCall.args)}) -> ${result.message.slice(0, 120)}`,
			);

			// Echo the model's full content so thought_signature parts round-trip correctly.
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
	} finally {
		await page.close();
		await context.close();
		await browser.close();
	}

	// 8. Parse and validate the done args
	if (!doneState.value || !doneState.args) {
		throw new Error("[explore] explore agent did not call done() within the step/time budget");
	}

	const doneArgs = doneState.args;
	const goal = String(doneArgs.goal ?? "");
	const startUrl = String(doneArgs.startUrl ?? "");
	const narration = String(doneArgs.narration ?? "");

	// Defensive: the `done` case in executeExploreTool already validates that
	// at least MIN_PLAN_STEPS steps are valid before flipping doneState. This
	// re-runs the same validator so any future code path that sets doneState
	// directly still gets caught here.
	const { valid: steps, problems } = validatePlanSteps(doneArgs.steps);
	for (const problem of problems) {
		console.warn(`[explore] ${problem}`);
	}

	const plan: ExplorationPlan = {
		commit,
		summary,
		goal,
		startUrl,
		steps,
		narration,
		generatedAt: new Date().toISOString(),
		exploreStepCount: stepIndex.value,
	};

	// 9. Write plan.json (write first so we can debug rejected plans)
	const planPath = path.join(exploreDir, "plan.json");
	await fs.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);

	console.log(`[explore] plan written to ${planPath} (${steps.length} steps)`);

	// 10. Reject thin plans — defence in depth. The `done` tool already
	// rejects malformed step arrays inside the explore loop; this is the
	// final guard before handing off to the Record agent.
	if (steps.length < MIN_PLAN_STEPS) {
		throw new Error(
			`[explore] plan has only ${steps.length} valid step(s) (min ${MIN_PLAN_STEPS}); ` +
				`see ${planPath} for what the model returned. ` +
				"Explore likely did not locate the UI surface affected by the commit.",
		);
	}

	return {
		plan,
		planPath,
		exploreDir,
		stepCount: stepIndex.value,
	};
}
