export interface Dimensions {
  width: number;
  height: number;
}

const ASPECT_RATIO_MAP: Record<string, Dimensions> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

export function getDimensions(aspectRatio: string): Dimensions {
  const dims = ASPECT_RATIO_MAP[aspectRatio];
  if (!dims) {
    throw new Error(`Unsupported aspect ratio: ${aspectRatio}`);
  }
  return dims;
}
