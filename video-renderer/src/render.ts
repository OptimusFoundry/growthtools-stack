import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { getDimensions } from "./utils/aspectRatio";
import type { VideoConfig } from "./compositions/TextOnGradient/types";

const ENTRY_POINT = path.resolve(__dirname, "compositions/Root.tsx");

export interface RenderOptions {
  config: VideoConfig;
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

  const bundleLocation = await bundle({
    entryPoint: ENTRY_POINT,
  });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "TextOnGradient",
    inputProps: { config },
  });

  composition.width = dims.width;
  composition.height = dims.height;
  composition.durationInFrames = totalFrames;
  composition.fps = config.fps;

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { config },
  });
}
