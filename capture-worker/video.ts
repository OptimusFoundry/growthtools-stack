// Post-processing helpers for the captured webm. Playwright can only
// record at wall-clock rate, so to ship a snappier demo clip we run the
// raw recording through ffmpeg and speed it up by re-timestamping frames.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

// The installer package's default export varies between CJS/ESM consumers;
// the `.path` property is the stable interface.
const ffmpegPath: string = ffmpegInstaller.path;

/**
 * Default playback speed for finalized demo recordings. Overridable via
 * the CAPTURE_VIDEO_SPEED env var (parsed as a float). 1.0 = real time.
 */
export const DEFAULT_VIDEO_SPEED = 2.0;

export function resolveVideoSpeed(fallback: number = DEFAULT_VIDEO_SPEED): number {
	const raw = process.env.CAPTURE_VIDEO_SPEED;
	if (!raw) return fallback;
	const parsed = Number.parseFloat(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return parsed;
}

/**
 * Produces a new webm at `outputPath` that plays back at `speed` times
 * real time. `speed === 1` short-circuits to a plain rename so we don't
 * pay the ffmpeg roundtrip when no change is requested.
 */
export async function speedUpWebm(
	inputPath: string,
	outputPath: string,
	speed: number,
): Promise<void> {
	if (!(speed > 0) || speed === 1) {
		await fs.rename(inputPath, outputPath);
		return;
	}

	// setpts multiplies presentation timestamps; to play at N× speed we
	// divide PTS by N. -an strips audio (Playwright's recordings are
	// silent anyway, but the flag keeps the output deterministic).
	const ptsFactor = (1 / speed).toFixed(6);
	await new Promise<void>((resolve, reject) => {
		const proc = spawn(
			ffmpegPath,
			[
				"-hide_banner",
				"-loglevel",
				"error",
				"-i",
				inputPath,
				"-filter:v",
				`setpts=${ptsFactor}*PTS`,
				"-an",
				"-y",
				outputPath,
			],
			{ stdio: ["ignore", "inherit", "inherit"] },
		);
		proc.on("error", reject);
		proc.on("exit", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`ffmpeg exited with code ${code}`));
		});
	});

	// Best-effort cleanup of the raw recording — we no longer need it.
	await fs.rm(inputPath, { force: true });
}
