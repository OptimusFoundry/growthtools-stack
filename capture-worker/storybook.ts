// Direct-navigate Storybook capture: given a set of story IDs, screenshot
// each one's iframe view and upload the result via the same S3 helpers
// capture.ts uses for the demo-agent path. No login, no exploration — this
// is a much simpler capture strategy reserved for component-only commits
// (see B3 in the tech plan for how storyIds get populated).

import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import type { Page } from "playwright";
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

// Social cards render 16:9 without cropping on X, Bluesky and Threads. 2x
// density keeps text and hairlines crisp: files come out 2400x1350.
export const FRAME = { width: 1200, height: 675 };
const DEVICE_SCALE_FACTOR = 2;

// Stories render components at true size in the middle of the canvas, which
// left a 54x21 Badge as a speck in the frame. Zoom the component so it fills
// this share of the frame (whichever axis binds first), within [1, MAX_ZOOM].
const TARGET_WIDTH_SHARE = 0.6;
const TARGET_HEIGHT_SHARE = 0.5;
const MAX_ZOOM = 4;

export interface Box {
	width: number;
	height: number;
}

/**
 * computeZoom returns the CSS zoom that makes `content` fill the target share
 * of `frame`. Never shrinks (min 1) so already-large components are untouched,
 * and caps at MAX_ZOOM so tiny ones don't turn into pixel-art blobs.
 */
export function computeZoom(content: Box, frame: Box = FRAME): number {
	if (content.width <= 0 || content.height <= 0) return 1;
	const zoom = Math.min(
		(frame.width * TARGET_WIDTH_SHARE) / content.width,
		(frame.height * TARGET_HEIGHT_SHARE) / content.height,
	);
	return Math.round(Math.min(MAX_ZOOM, Math.max(1, zoom)) * 100) / 100;
}

/**
 * captureStory screenshots one story at FRAME size with the component zoomed
 * up. Returns false (and writes nothing) when Storybook shows its error
 * screen, so a broken story never becomes post media.
 */
export async function captureStory(page: Page, url: string, outPath: string): Promise<boolean> {
	await page.goto(url, { waitUntil: "networkidle" });
	await page.waitForTimeout(SETTLE_MS);

	const rendered = await page.evaluate(() => !document.body.classList.contains("sb-show-errordisplay"));
	if (!rendered) return false;

	// The preview decorator renders a centered flex canvas as the first child
	// of #storybook-root; its children are the story's content. The fixed
	// watermark footer is a sibling of the canvas and is left alone.
	const content = await page.evaluate(() => {
		const canvas = document.querySelector("#storybook-root > div");
		const kids = canvas ? Array.from(canvas.children) : [];
		if (kids.length === 0) return null;
		let left = Number.POSITIVE_INFINITY;
		let top = Number.POSITIVE_INFINITY;
		let right = Number.NEGATIVE_INFINITY;
		let bottom = Number.NEGATIVE_INFINITY;
		for (const kid of kids) {
			const r = kid.getBoundingClientRect();
			left = Math.min(left, r.left);
			top = Math.min(top, r.top);
			right = Math.max(right, r.right);
			bottom = Math.max(bottom, r.bottom);
		}
		return { width: right - left, height: bottom - top };
	});

	const zoom = content ? computeZoom(content) : 1;
	if (zoom > 1) {
		await page.evaluate((z) => {
			const canvas = document.querySelector("#storybook-root > div");
			for (const kid of Array.from(canvas?.children ?? [])) {
				(kid as HTMLElement).style.zoom = String(z);
			}
		}, zoom);
		await page.waitForTimeout(SETTLE_MS);
	}

	await page.screenshot({ path: outPath });
	return true;
}

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
		const page = await browser.newPage({ viewport: FRAME, deviceScaleFactor: DEVICE_SCALE_FACTOR });

		for (const storyId of input.storyIds) {
			try {
				const componentName = input.storyComponents?.[storyId] ?? storyId;
				const slug = slugifyComponent(componentName);
				const url = `${input.storybookUrl}/iframe.html?id=${storyId}&viewMode=story`;
				const fileName = `${slug}--${storyId}.png`;
				if (!(await captureStory(page, url, path.join(storybookDir, fileName)))) {
					console.warn(`[storybook] story ${storyId} rendered Storybook's error screen; skipping`);
					continue;
				}
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
