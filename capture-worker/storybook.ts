// Direct-navigate Storybook capture: given a set of story IDs, screenshot
// each one's iframe view and upload the result via the same S3 helpers
// capture.ts uses for the demo-agent path. No login, no exploration — this
// is a much simpler capture strategy reserved for component-only commits
// (see B3 in the tech plan for how storyIds get populated).

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { commitArtifactsDir, uploadCommitArtifacts } from "./capture.ts";
import type { CaptureOutput } from "./capture.ts";

export interface StorybookCaptureInput {
	commit: string;
	storybookUrl: string;
	storyIds: string[];
	storyComponents?: Record<string, string>;
}

// Short fixed settle delay after network-idle, mirroring the demo agent's
// scroll/animation settle convention (agent.ts's post-scroll waitForTimeout).
const SETTLE_MS = 500;

// Component names come from B3's Go-side resolution and could in principle
// contain anything; slug them down to something filesystem-safe. storyIds
// are Storybook-generated kebab-case slugs already and are left as-is.
function slugifyComponent(name: string): string {
	const slug = name
		.trim()
		.replace(/[^a-zA-Z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.toLowerCase();
	return slug || "component";
}

export async function runStorybookCapture(input: StorybookCaptureInput): Promise<CaptureOutput> {
	const captureDir = commitArtifactsDir(input.commit);

	if (input.storyIds.length === 0) {
		return { commit: input.commit, captureDir, stepCount: 0, uploaded: [] };
	}

	const storybookDir = path.join(captureDir, "storybook");
	await fs.mkdir(storybookDir, { recursive: true });

	const browser = await chromium.launch();
	let stepCount = 0;
	try {
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

		for (const storyId of input.storyIds) {
			try {
				const componentName = input.storyComponents?.[storyId] ?? storyId;
				const slug = slugifyComponent(componentName);
				const url = `${input.storybookUrl}/iframe.html?id=${storyId}&viewMode=story`;
				await page.goto(url, { waitUntil: "networkidle" });
				await page.waitForTimeout(SETTLE_MS);
				const fileName = `${slug}--${storyId}.png`;
				await page.screenshot({ path: path.join(storybookDir, fileName) });
				stepCount += 1;
			} catch (err) {
				console.error(`[storybook] capture failed for story ${storyId}:`, err);
			}
		}
	} finally {
		await browser.close();
	}

	const uploaded = await uploadCommitArtifacts(input.commit);

	return {
		commit: input.commit,
		captureDir,
		stepCount,
		uploaded,
	};
}
