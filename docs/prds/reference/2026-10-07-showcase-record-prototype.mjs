// Records a Storybook story as a feed-ready MP4, frame by frame.
// usage: node record.mjs <storybook-url> <story-id> <out.mp4> [seconds=8] [w=1080] [h=1350] [theme]
//
// Real-time capture (recordVideo, screencast) is limited to 1x and drops frames
// when a story is expensive to paint. Instead the page clock is frozen and
// stepped 1/FPS at a time (timers, rAF, performance.now via page.clock; CSS
// animations and transitions via the Web Animations API), and each step is a
// 2x screenshot. Every frame is exact, and the 2x frames are downsampled for
// crisp edges, text and canvas dots.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(process.env.PW_FROM ?? import.meta.url);
const { chromium } = require("@playwright/test");

const [base, id, out, secs = "8", w = "1080", h = "1350", theme] = process.argv.slice(2);
const width = Number(w);
const height = Number(h);
const FPS = 30;
const SCALE = 2;
const frames = Math.round(Number(secs) * FPS);
const step = 1000 / FPS;
const dir = mkdtempSync(join(tmpdir(), "rec-"));

// GPU flags only speed up rendering on macOS; on Linux servers Chrome falls
// back to software rendering, which is slower but frame-identical here.
const browser = await chromium.launch({
	args:
		process.platform === "darwin"
			? ["--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--use-angle=metal"]
			: [],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: SCALE });
await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
const globals = theme ? `&globals=theme:${theme}` : "";
await page.goto(`${base}/iframe.html?id=${id}&viewMode=story${globals}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.clock.runFor(500);

// Pauses every CSS animation/transition as it appears and pins its time to the
// virtual clock, so compositor-driven motion advances in step with the frames.
await page.evaluate(() => {
	const seen = new Map();
	window.__syncAnimations = (now) => {
		for (const a of document.getAnimations()) {
			if (!seen.has(a)) {
				seen.set(a, { base: a.currentTime ?? 0, at: now });
				a.pause();
			}
			const s = seen.get(a);
			a.currentTime = s.base + (now - s.at);
		}
	};
});

for (let i = 0; i < frames; i++) {
	await page.clock.runFor(step);
	await page.evaluate((now) => window.__syncAnimations(now), (i + 1) * step);
	await page.screenshot({
		path: join(dir, `f${String(i).padStart(5, "0")}.jpg`),
		type: "jpeg",
		quality: 96,
		animations: "allow",
	});
}
await browser.close();

execFileSync("ffmpeg", [
	"-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(dir, "f%05d.jpg"),
	"-vf", `scale=${width}:${height}:flags=lanczos`,
	"-c:v", "libx264", "-preset", "slow", "-pix_fmt", "yuv420p", "-crf", "14", "-movflags", "+faststart", out,
]);
console.log(`${out} (${frames} frames at ${width * SCALE}x${height * SCALE}, downsampled)`);
