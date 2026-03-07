import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { renderVideo } from "./render";
import { uploadToS3 } from "./s3";
import type { VideoConfig } from "./compositions/TextOnGradient/types";

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = parseInt(process.env.PORT || "4000", 10);
const RENDERER_SECRET = process.env.RENDERER_SECRET || "";
const CALLBACK_URL = process.env.CALLBACK_URL || "";

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

interface RenderRequest {
  job_id: string;
  config: VideoConfig;
  aspect_ratio: string;
  s3_key: string;
  s3_bucket: string;
}

app.post("/render", (req, res) => {
  const secret = req.headers["x-renderer-secret"];
  if (RENDERER_SECRET && secret !== RENDERER_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const body = req.body as RenderRequest;
  if (!body.job_id || !body.config || !body.aspect_ratio) {
    res.status(400).json({ error: "missing required fields" });
    return;
  }

  // Accept immediately, render async
  res.status(202).json({ message: "render started", job_id: body.job_id });

  // Process render in background
  processRender(body).catch((err) => {
    console.error(`Render failed for job ${body.job_id}:`, err);
  });
});

async function processRender(body: RenderRequest): Promise<void> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-render-"));
  const outputPath = path.join(tmpDir, `${body.job_id}.mp4`);

  try {
    await renderVideo({
      config: body.config,
      aspectRatio: body.aspect_ratio,
      outputPath,
    });

    let s3Url = "";
    if (body.s3_bucket && body.s3_key) {
      s3Url = await uploadToS3(outputPath, body.s3_bucket, body.s3_key);
    }

    await sendCallback(body.job_id, "completed", s3Url, undefined);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "unknown error";
    await sendCallback(body.job_id, "failed", undefined, errorMsg);
  } finally {
    // Cleanup temp files
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function sendCallback(
  jobId: string,
  status: "completed" | "failed",
  s3Url?: string,
  errorMessage?: string,
): Promise<void> {
  if (!CALLBACK_URL) {
    console.log(`Callback skipped (no CALLBACK_URL). Job ${jobId}: ${status}`);
    return;
  }

  try {
    await fetch(CALLBACK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(RENDERER_SECRET
          ? { "X-Renderer-Secret": RENDERER_SECRET }
          : {}),
      },
      body: JSON.stringify({
        job_id: jobId,
        status,
        s3_url: s3Url,
        error_message: errorMessage,
      }),
    });
  } catch (err) {
    console.error(`Failed to send callback for job ${jobId}:`, err);
  }
}

app.listen(PORT, () => {
  console.log(`Video renderer listening on port ${PORT}`);
});
