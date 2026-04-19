// Post-processing helpers for the raw recording Playwright spits out.
// Playwright captures VP8 webm at a conservative default bitrate, and it
// writes a frame every tick even when nothing happens on screen — so a
// demo with long Gemini-thinking pauses ends up blurry AND full of dead
// air. We run the raw clip through a single ffmpeg pass that:
//
//   1. Drops visually-duplicate frames (`mpdecimate`) — collapses the
//      idle/thinking stretches where the browser didn't change.
//   2. Rebuilds presentation timestamps (`setpts`) so what's left plays
//      back smoothly, optionally sped up by a constant factor.
//   3. Re-encodes to H.264 / MP4 at CRF 20 so the output is sharp and
//      plays everywhere (browsers, social platforms, mobile).

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
export const DEFAULT_VIDEO_SPEED = 1.5;

export function resolveVideoSpeed(fallback: number = DEFAULT_VIDEO_SPEED): number {
	const raw = process.env.CAPTURE_VIDEO_SPEED;
	if (!raw) return fallback;
	const parsed = Number.parseFloat(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
	return parsed;
}

/**
 * Re-encodes the raw Playwright recording into the final clip at
 * `outputPath`. Drops idle frames, rebuilds timestamps at `speed`× real
 * time, and emits H.264 MP4.
 *
 * Output extension should be `.mp4` to match the codec — downstream
 * artifact bucketing (`videoExts` in the draft generator) already
 * accepts mp4, so this is a transparent upgrade from the old webm path.
 *
 * `speed <= 0` is treated as "leave timing alone" — mpdecimate + the
 * re-encode still run, so idle frames are still collapsed and the clip
 * still gets sharpened, it just isn't accelerated.
 */
export async function finalizeRecording(
	inputPath: string,
	outputPath: string,
	speed: number,
): Promise<void> {
	const effectiveSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
	const ptsFactor = (1 / effectiveSpeed).toFixed(6);

	// `mpdecimate` drops frames that look identical to the previous one.
	// Thresholds are ffmpeg's documented defaults expressed explicitly so
	// they're tweakable: `hi` rejects frames where any 8×8 block's sum of
	// absolute differences exceeds 768, `lo` sets the noise floor at
	// 320, and `frac` requires 33% of blocks to cross `lo` for the frame
	// to be kept. Together: small cursor jitter is dropped, real UI
	// motion is preserved.
	const mpdecimate = "mpdecimate=hi=64*12:lo=64*5:frac=0.33";
	// `N/FRAME_RATE/TB` rebuilds PTS per surviving frame: frame N lands
	// at pts = N / fps in the time base. Multiplying by (1/speed)
	// compresses the timeline, so 2× → frames land at half the spacing.
	const setpts = `setpts=${ptsFactor}*N/FRAME_RATE/TB`;

	await new Promise<void>((resolve, reject) => {
		const proc = spawn(
			ffmpegPath,
			[
				"-hide_banner",
				"-loglevel",
				"error",
				"-i",
				inputPath,
				"-vf",
				`${mpdecimate},${setpts}`,
				// Constant output framerate; lets players scrub cleanly and
				// keeps encoded size predictable regardless of how many
				// frames mpdecimate kept.
				"-r",
				"30",
				"-c:v",
				"libx264",
				"-preset",
				"veryfast",
				"-crf",
				"20",
				"-pix_fmt",
				"yuv420p",
				// Put the moov atom at the front so the webapp can start
				// playback before the whole file downloads.
				"-movflags",
				"+faststart",
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
