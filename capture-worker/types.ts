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
