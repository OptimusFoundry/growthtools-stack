# Capture Worker — Two-Pass Demo Mode

**Goal:** Split the current single-pass Playwright/Gemini demo agent into an Explore pass (no recording, outputs a structured plan) followed by a Record pass (follows the plan, records a polished clip).
**Scope:** capture-worker only — no base-server or webapp changes required.

---

## Architecture Summary

### Why two passes?

The single-pass agent has 30 steps to simultaneously figure out what changed, find the right page, explore the UI, AND record a clean clip. In practice the model spends 5–15 steps on dead-end navigation before finding the right screen. All that exploration ends up on the video, producing shaky, non-linear demos.

Separating concerns means:
- Pass 1 can take as long as it needs to understand the app (no video cost).
- Pass 2 knows exactly where to go, so every step on the recording is intentional.

### File changes

| File | Change |
|------|--------|
| `capture-worker/types.ts` | **New** — shared TypeScript types (`ExplorationPlan`, `DemoStep`, etc.) |
| `capture-worker/explore.ts` | **New** — Pass 1: exploration agent (no recording) |
| `capture-worker/agent.ts` | **Modified** — `runDemo` gains optional `plan` param; delegates Pass 1 to `explore.ts` |
| `capture-worker/capture.ts` | **Modified** — `CaptureInput` gains optional `plan` field; passes it through |
| `capture-worker/server.ts` | **Modified** — HTTP body gains optional `twoPass` / `plan` fields |
| `capture-worker/kafka.ts` | **Modified** — Kafka message may carry `plan`; passes through |

No new npm dependencies — `@google/genai` and `playwright` already cover everything needed.

---

## Types

### New file: `capture-worker/types.ts`

```typescript
// Shared types for the two-pass capture system.

/**
 * A single step the Record agent should execute.
 * The Explore agent emits an ordered array of these.
 */
export interface DemoStep {
  /** Human-readable label for the transcript / debugging. */
  label: string;

  /**
   * The tool to invoke during the Record pass.
   * Must be one of the Record-pass tool names.
   */
  tool: "navigate" | "click" | "fill" | "press" | "scroll" | "wait" | "screenshot";

  /** Tool arguments — same shape as the Gemini function call args. */
  args: Record<string, unknown>;
}

/**
 * Output of the Explore pass. Written to explore/plan.json inside the
 * captureDir so it can be inspected / replayed independently.
 */
export interface ExplorationPlan {
  /** SHA of the commit this plan was built for. */
  commit: string;

  /** The commit message / summary used as context. */
  summary: string;

  /**
   * Goal sentence the Record agent will receive as its mission.
   * Derived from the diff by the Explore agent.
   */
  goal: string;

  /**
   * The entry URL the Record agent should navigate to first.
   * Always an absolute URL (the Explore agent resolves it from appUrl).
   */
  startUrl: string;

  /** Ordered sequence of interactions to replay in the Record pass. */
  steps: DemoStep[];

  /**
   * 1-3 sentence narration to call `done` with at the end of the Record
   * pass. Written by the Explore agent so the Record agent doesn't have
   * to improvise.
   */
  narration: string;

  /** ISO-8601 timestamp of when the plan was generated. */
  generatedAt: string;

  /** How many Explore-pass steps it took to produce this plan. */
  exploreStepCount: number;
}
```

---

## Pass 1 — Explore Agent

### New file: `capture-worker/explore.ts`

#### Overview

- Launches Playwright **without** `recordVideo` — the context is disposable.
- Uses a different, broader tool set focused on understanding rather than interacting.
- Runs for up to `maxExploreSteps` (default 40) tool calls with a separate wall-clock budget (`wallClockMs`, default 4 min).
- Output is an `ExplorationPlan` object written to `{captureDir}/explore/plan.json`.

#### Explore-pass tool set

The explore tools intentionally overlap with the record tools for navigation/clicking (the agent needs to actually drive the browser to understand it), but add discovery tools and remove recording-specific constraints.

```typescript
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
            "Ordered list of interactions the Record agent should execute. " +
            "Each step: { label: string, tool: string, args: object }. " +
            "tool must be one of: navigate, click, fill, press, scroll, wait, screenshot. " +
            "args must match that tool's parameter schema.",
          items: { type: Type.OBJECT },
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
```

#### `list_elements` implementation

```typescript
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
      for (const el of document.querySelectorAll(sel)) {
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
```

#### Explore system prompt

```
You are a demo planner. You drive a real browser to understand a web app and
produce a structured plan that a second agent will use to record a polished demo.

SESSION STATE:
- The browser is ALREADY SIGNED IN. Do NOT visit /test-login or fill credentials.
- You may navigate anywhere in the app freely — nothing you do is recorded.

YOUR JOB:
1. Read the commit diff to identify which user-visible feature changed.
2. Use navigate, click, scroll, list_elements, and screenshot to find the exact
   page and workflow that best showcases what the commit changed.
3. Try multiple paths if needed — exploration is free. Undo wrong turns with navigate.
4. Once you understand the ideal demo flow, call `done` with:
   - goal: one sentence describing the shipped feature
   - startUrl: the absolute URL where the Record agent should land first
   - steps: an ordered list of { label, tool, args } interactions that produce
     a clean, intentional demo. Keep it to 5-10 steps.
   - narration: 1-3 sentences for the end-of-video voiceover.

LOCATOR PRIORITY: prefer testid (grep diff for data-testid). Fall back to
role+name, then visible text. Be specific — avoid selectors that match
multiple elements.

HARD LIMITS: at most {maxExploreSteps} tool calls. Aim to call done by step 30.
```

#### Function signature

```typescript
export interface ExploreInput {
  appUrl: string;
  email: string;
  password: string;
  commit: string;
  summary: string;
  diff: string;
  captureDir: string;         // base capture dir; explore writes to {captureDir}/explore/
  maxExploreSteps?: number;   // default 40
  wallClockMs?: number;       // default 4 * 60_000
  model?: string;             // default "gemini-2.5-flash"
}

export interface ExploreResult {
  plan: ExplorationPlan;
  planPath: string;           // absolute path to plan.json
  exploreDir: string;         // directory where explore screenshots live
  stepCount: number;
}

export async function runExplore(input: ExploreInput): Promise<ExploreResult>
```

#### Internal structure of `runExplore`

1. Create `exploreDir = path.join(captureDir, "explore")` and `mkdir` it.
2. Call `captureLoginStorageState` (same as record pass) to get auth.
3. Open a browser context **without** `recordVideo`, inject `cursorOverlayScript`.
4. Navigate to `appUrl + "/"`.
5. Take an initial snapshot (same `snapshot()` helper or inline equivalent).
6. Build Gemini history with system prompt + user prompt containing `summary` and `diff`.
7. Run the same `callWithRetry` loop as `runDemo`, but with `exploreTools` and the explore system prompt.
8. When the model calls `done`:
   - Parse `args.steps` as `DemoStep[]`.
   - Validate each step has `label`, `tool` (must be a valid record-pass tool), and `args`.
   - Construct `ExplorationPlan`.
   - Write to `path.join(exploreDir, "plan.json")`.
9. Return `ExploreResult`.

`list_elements` is handled in the tool executor: call `executeListElements(page)`, return it as `message` (no screenshot needed).

---

## Pass 2 — Record Agent (changes to `agent.ts`)

### Changes to `DemoInput`

```typescript
export interface DemoInput {
  appUrl: string;
  email: string;
  password: string;
  commit: string;
  goal?: string;
  summary?: string;
  diff?: string;
  repoRoot?: string;
  outDir?: string;
  maxSteps?: number;
  wallClockMs?: number;
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
```

### Changes to `DemoResult`

```typescript
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
```

### Changes to `runDemo` body

At the top of `runDemo`, after resolving `summary` and `diff`, insert:

```typescript
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
    captureDir,
    maxExploreSteps: input.maxExploreSteps,
    wallClockMs: input.exploreWallClockMs,
    model,
  });
  activePlan = exploreResult.plan;
  console.log(`[agent] explore done in ${exploreResult.stepCount} steps → ${exploreResult.planPath}`);
}
```

### How the plan is fed into the Record pass

When `activePlan` is defined, two things change:

**1. System prompt gains a plan section:**

```typescript
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
```

Append `planSection` to the existing `systemInstruction` string.

**2. User prompt is replaced when a plan is active:**

```typescript
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
      // ... existing single-pass user prompt unchanged ...
    ].join("\n");
```

**3. `maxSteps` default changes** when a plan is supplied:

```typescript
// If following a plan, we know the step count up front — cap tightly.
const effectiveMaxSteps =
  maxSteps ?? (activePlan ? activePlan.steps.length + 5 : 30);
```

(The `+ 5` is a small buffer for retries and the final `done` call.)

### Return value

At the end of `runDemo`, add plan info to the return object:

```typescript
return {
  captureDir,
  videoPath,
  narrationPath,
  transcriptPath,
  stepCount: stepIndex.value,
  plan: activePlan,
  planPath: activePlan
    ? path.join(captureDir, "explore", "plan.json")
    : undefined,
};
```

---

## Changes to `capture.ts`

### `CaptureInput`

```typescript
export interface CaptureInput {
  commit: string;
  appUrl: string;
  email: string;
  password: string;
  goal?: string;
  summary?: string;
  diff?: string;
  /** Pass a pre-computed plan to skip the Explore pass. */
  plan?: ExplorationPlan;
  /** Enable two-pass mode (explore then record). Ignored when plan is supplied. */
  twoPass?: boolean;
  maxExploreSteps?: number;
  exploreWallClockMs?: number;
}
```

### `runCapture`

Pass `plan` and `twoPass` through to `runDemo`:

```typescript
export async function runCapture(input: CaptureInput): Promise<CaptureOutput> {
  const result = await runDemo({
    appUrl: input.appUrl,
    email: input.email,
    password: input.password,
    commit: input.commit,
    goal: input.goal,
    summary: input.summary,
    diff: input.diff,
    plan: input.plan,
    twoPass: input.twoPass,
    maxExploreSteps: input.maxExploreSteps,
    exploreWallClockMs: input.exploreWallClockMs,
  });
  // ... existing S3 upload unchanged ...
}
```

### `CaptureOutput`

Add plan path so callers can inspect it:

```typescript
export interface CaptureOutput {
  commit: string;
  captureDir: string;
  stepCount: number;
  uploaded: CaptureUpload[];
  /** Set when an explore pass ran or a plan was supplied. */
  planPath?: string;
}
```

---

## Changes to `server.ts`

### `CaptureBody`

```typescript
interface CaptureBody {
  commit?: string;
  pagePath?: string;
  goal?: string;
  appUrl?: string;
  email?: string;
  password?: string;
  /** Enable two-pass mode for this request. */
  twoPass?: boolean;
  /** Supply a pre-computed plan (skips explore). Must be a valid ExplorationPlan JSON object. */
  plan?: unknown;
}
```

### `handle`

Pass the new fields through to `runCapture`:

```typescript
const output = await runCapture({
  commit,
  appUrl,
  email,
  password,
  goal: body.goal,
  twoPass: body.twoPass === true,
  plan: body.plan as ExplorationPlan | undefined,
});
```

---

## Changes to `kafka.ts`

### `CaptureRequestMessage`

```typescript
interface CaptureRequestMessage {
  commit_id: string;
  sha: string;
  owner: string;
  repo: string;
  message: string;
  diff?: string;
  app_url?: string;
  /** If true, the worker runs the explore pass before recording. */
  two_pass?: boolean;
}
```

### `eachMessage` handler

```typescript
const output = await runCapture({
  commit: request.sha,
  appUrl,
  email: defaultEmail,
  password: defaultPassword,
  goal: request.message,
  summary: request.message,
  diff: request.diff ?? "",
  twoPass: request.two_pass === true,
});
```

---

## CLI — Testing Locally

### Existing `npm run demo` (single-pass, unchanged)

```sh
GEMINI_API_KEY=... npm run demo -- --commit 06fdc6f
```

### New `--two-pass` flag

Add to the `main()` function in `agent.ts`:

```typescript
// In parseArgs result usage:
const result = await runDemo({
  appUrl,
  email,
  password,
  commit,
  goal: stringArg(args, "goal"),
  model: modelArg,
  twoPass: args["two-pass"] === true,
  maxExploreSteps: args["max-explore-steps"]
    ? Number(args["max-explore-steps"])
    : undefined,
});
```

Usage:

```sh
# Run explore then record (default two-pass):
GEMINI_API_KEY=... npm run demo -- --commit 06fdc6f --two-pass

# Override explore step budget:
GEMINI_API_KEY=... npm run demo -- --commit 06fdc6f --two-pass --max-explore-steps 50

# Supply a pre-baked plan (skip explore entirely):
GEMINI_API_KEY=... npm run demo -- --commit 06fdc6f --plan ./captures/06fdc6f/explore/plan.json
```

For the `--plan` flag, `main()` reads the JSON file and passes it as `plan: ExplorationPlan`:

```typescript
const planArg = stringArg(args, "plan");
const plan: ExplorationPlan | undefined = planArg
  ? JSON.parse(await fs.readFile(planArg, "utf8")) as ExplorationPlan
  : undefined;

const result = await runDemo({
  // ...
  twoPass: args["two-pass"] === true || plan !== undefined,
  plan,
});
```

---

## Directory Layout After a Two-Pass Run

```
captures/
  06fdc6f123ab/
    demo/
      step-01.png          ← record-pass screenshots
      step-02.png
      recording.mp4        ← final polished video
      narration.json
      transcript.json
    explore/
      plan.json            ← ExplorationPlan (the bridge between passes)
      step-01.png          ← explore-pass screenshots (for debugging)
      step-02.png
      ...
```

---

## Detailed Implementation Steps (for the executing agent)

### Step 1 — Create `capture-worker/types.ts`

Create the file with exactly the `DemoStep` and `ExplorationPlan` interfaces shown in the Types section above. No other exports.

### Step 2 — Create `capture-worker/explore.ts`

The file must:
1. Import from `@google/genai`, `playwright`, `./auth.ts`, `./types.ts`.
2. Re-use the `callWithRetry` and `extractRetryMs` helpers — copy them verbatim from `agent.ts` (do not import, to avoid circular deps).
3. Re-use the `cursorOverlayScript` string and `resolveLocator` function — copy them from `agent.ts`.
4. Define `exploreTools` as shown above.
5. Define `executeListElements(page: Page): Promise<string>` as shown above.
6. Define a local `ToolContext` and `snapshot()` that write to `exploreDir`.
7. Define a local `executeTool` that handles all explore tool names including `list_elements` (no video-specific logic).
8. Export `ExploreInput`, `ExploreResult`, and `runExplore` with the signatures shown above.
9. The `done` handler in the explore tool executor must parse `args.steps` and validate each entry has `tool` in `["navigate","click","fill","press","scroll","wait","screenshot"]`. Invalid entries are skipped with a `console.warn`.
10. Write `plan.json` with `JSON.stringify(plan, null, 2) + "\n"`.

### Step 3 — Modify `capture-worker/agent.ts`

1. Add `import type { ExplorationPlan } from "./types.ts";` at the top.
2. Add `import { runExplore } from "./explore.ts";` at the top.
3. Extend `DemoInput` and `DemoResult` as shown above.
4. In `runDemo`, after the `fetchCommitContext` block, insert the two-pass explore block shown above.
5. Build `planSection` and append to `systemInstruction`.
6. Gate `userPrompt` construction on whether `activePlan` is set.
7. Replace `maxSteps` with `effectiveMaxSteps` throughout the loop condition.
8. Extend the return value with `plan` and `planPath`.
9. In `main()`, add handling for `--two-pass` and `--plan` flags as shown above.

### Step 4 — Modify `capture-worker/capture.ts`

1. Add `import type { ExplorationPlan } from "./types.ts";` at the top.
2. Extend `CaptureInput` with `plan?`, `twoPass?`, `maxExploreSteps?`, `exploreWallClockMs?`.
3. Extend `CaptureOutput` with `planPath?: string`.
4. In `runCapture`, pass the new fields to `runDemo` and surface `result.planPath` in the return.

### Step 5 — Modify `capture-worker/server.ts`

1. Extend `CaptureBody` with `twoPass?: boolean` and `plan?: unknown`.
2. In `handle`, pass `twoPass` and `plan` to `runCapture`.
3. Include `planPath` in the HTTP response JSON if present.

### Step 6 — Modify `capture-worker/kafka.ts`

1. Extend `CaptureRequestMessage` with `two_pass?: boolean`.
2. Pass `twoPass: request.two_pass === true` to `runCapture`.

---

## Key Constraints to Preserve

- `DemoInput` is backward compatible: omitting `twoPass` and `plan` gives exactly the current single-pass behaviour.
- `CaptureInput` / `CaptureOutput` in `capture.ts` are backward compatible: no existing callers break.
- `callWithRetry` and `extractRetryMs` are duplicated into `explore.ts` rather than extracted into a shared module, to avoid circular dependencies (`agent.ts` → `explore.ts` is fine; a shared `utils.ts` would also be fine but adds a file).
- The explore pass uses the same `captureLoginStorageState` auth helper — login is not repeated on camera.
- The explore browser context never has `recordVideo` set — no stray video file is produced.
- `list_elements` returns JSON as the tool response message string; no screenshot is appended to that turn (it would waste tokens).
- The Record pass `systemInstruction` still includes all the original guard rails (do not navigate to `/test-login`, locator priority, etc.) — the plan section is appended after them.
