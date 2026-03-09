import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { getDimensions } from "./utils/aspectRatio";
import type { VideoConfigV2 } from "./compositions/types";

const ENTRY_POINT = path.resolve(__dirname, "..", "src", "compositions", "Root.tsx");

function log(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: "video-renderer",
    component: "render",
    msg,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export interface RenderOptions {
  config: VideoConfigV2;
  aspectRatio: string;
  outputPath: string;
}

export async function renderVideo(options: RenderOptions): Promise<void> {
  const { config, aspectRatio, outputPath } = options;
  const dims = getDimensions(aspectRatio);

  const totalFrames = config.scenes.reduce(
    (sum, s) => sum + s.duration_frames,
    0,
  );

  log("info", "preparing render", {
    aspect_ratio: aspectRatio,
    width: dims.width,
    height: dims.height,
    total_frames: totalFrames,
    fps: config.fps,
    duration_seconds: (totalFrames / config.fps).toFixed(2),
    scene_count: config.scenes.length,
    template: config.template,
    output_path: outputPath,
    entry_point: ENTRY_POINT,
  });

  const bundleStart = Date.now();
  log("info", "bundling composition", { entry_point: ENTRY_POINT });

  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
  });

  const bundleDuration = Date.now() - bundleStart;
  log("info", "bundle complete", {
    bundle_duration_ms: bundleDuration,
    bundle_location: bundleLocation,
  });

  const browserExecutable = process.env.CHROMIUM_PATH || undefined;
  const compositionId = "Universal";

  log("info", "selecting composition", {
    composition_id: compositionId,
    browser_executable: browserExecutable || "default",
  });

  const compositionStart = Date.now();
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps: { config },
    browserExecutable,
  });

  composition.width = dims.width;
  composition.height = dims.height;
  composition.durationInFrames = totalFrames;
  composition.fps = config.fps;

  log("info", "composition selected, starting media render", {
    composition_select_ms: Date.now() - compositionStart,
    final_width: composition.width,
    final_height: composition.height,
    final_duration_frames: composition.durationInFrames,
    final_fps: composition.fps,
    codec: "h264",
  });

  const renderStart = Date.now();
  let lastProgress = 0;

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { config },
    browserExecutable,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct >= lastProgress + 25 || pct === 100) {
        log("info", "render progress", {
          progress_pct: pct,
          elapsed_ms: Date.now() - renderStart,
        });
        lastProgress = pct;
      }
    },
  });

  const renderDuration = Date.now() - renderStart;
  const totalDuration = Date.now() - bundleStart;
  log("info", "media render complete", {
    render_duration_ms: renderDuration,
    total_pipeline_ms: totalDuration,
    bundle_ms: bundleDuration,
    output_path: outputPath,
  });
}
