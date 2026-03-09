import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { Kafka, type Consumer, type Producer } from "kafkajs";
import { renderVideo } from "./render";
import { uploadToS3 } from "./s3";
import type { VideoConfigV2 } from "./compositions/types";

const app = express();

const PORT = parseInt(process.env.PORT || "4000", 10);
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || "localhost:9092";
const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "../base-server/media-uploads";

function log(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: "video-renderer",
    msg,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// Health check endpoint (for Docker healthcheck)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

interface RenderRequest {
  job_id: string;
  config: VideoConfigV2;
  aspect_ratio: string;
  output_key: string;
  s3_bucket?: string;
}

interface RenderResult {
  job_id: string;
  status: "completed" | "failed";
  file_url: string;
  error_message: string;
}

const kafka = new Kafka({
  clientId: "video-renderer",
  brokers: KAFKA_BROKERS.split(","),
  retry: {
    initialRetryTime: 1000,
    retries: 10,
  },
});

let producer: Producer;
let consumer: Consumer;

async function processRender(body: RenderRequest): Promise<RenderResult> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-render-"));
  const outputPath = path.join(tmpDir, `${body.job_id}.mp4`);
  const startTime = Date.now();

  log("info", "starting render", {
    job_id: body.job_id,
    aspect_ratio: body.aspect_ratio,
    template: body.config.template,
    scenes: body.config.scenes?.length ?? 0,
    fps: body.config.fps,
    output_key: body.output_key,
    storage_type: body.s3_bucket ? "s3" : "local",
    tmp_dir: tmpDir,
  });

  try {
    await renderVideo({
      config: body.config,
      aspectRatio: body.aspect_ratio,
      outputPath,
    });

    const renderDuration = Date.now() - startTime;
    const stat = fs.statSync(outputPath);
    log("info", "render completed, uploading", {
      job_id: body.job_id,
      render_duration_ms: renderDuration,
      file_size_bytes: stat.size,
      file_size_mb: (stat.size / (1024 * 1024)).toFixed(2),
    });

    const uploadStart = Date.now();
    let fileUrl = "";
    if (STORAGE_TYPE === "s3" && body.s3_bucket) {
      fileUrl = await uploadToS3(outputPath, body.s3_bucket, body.output_key);
    } else {
      fileUrl = await saveToLocal(outputPath, body.output_key);
    }

    const totalDuration = Date.now() - startTime;
    log("info", "job completed successfully", {
      job_id: body.job_id,
      file_url: fileUrl,
      render_duration_ms: renderDuration,
      upload_duration_ms: Date.now() - uploadStart,
      total_duration_ms: totalDuration,
    });

    return {
      job_id: body.job_id,
      status: "completed",
      file_url: fileUrl,
      error_message: "",
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    log("error", "render failed", {
      job_id: body.job_id,
      error: errorMsg,
      stack,
      duration_ms: Date.now() - startTime,
    });
    return {
      job_id: body.job_id,
      status: "failed",
      file_url: "",
      error_message: errorMsg,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      log("info", "cleaned up tmp dir", { job_id: body.job_id, tmp_dir: tmpDir });
    } catch (cleanupErr) {
      log("warn", "failed to clean up tmp dir", {
        job_id: body.job_id,
        tmp_dir: tmpDir,
        error: cleanupErr instanceof Error ? cleanupErr.message : "unknown",
      });
    }
  }
}

async function saveToLocal(sourcePath: string, key: string): Promise<string> {
  const destPath = path.join(OUTPUT_DIR, key);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
  log("info", "saved to local storage", { dest_path: destPath, key });
  return key;
}

async function publishResult(result: RenderResult): Promise<void> {
  try {
    await producer.send({
      topic: "video.render.result",
      messages: [
        {
          key: result.job_id,
          value: JSON.stringify(result),
        },
      ],
    });
    log("info", "published render result", {
      job_id: result.job_id,
      status: result.status,
      error_message: result.error_message || undefined,
    });
  } catch (err) {
    log("error", "failed to publish render result", {
      job_id: result.job_id,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

async function startKafka(): Promise<void> {
  producer = kafka.producer();
  await producer.connect();
  log("info", "kafka producer connected", { brokers: KAFKA_BROKERS });

  consumer = kafka.consumer({ groupId: "video-renderer" });
  await consumer.connect();
  await consumer.subscribe({
    topic: "video.render.request",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message, partition, heartbeat }) => {
      if (!message.value) {
        log("warn", "received empty kafka message, skipping");
        return;
      }

      let body: RenderRequest;
      try {
        body = JSON.parse(message.value.toString()) as RenderRequest;
      } catch (err) {
        log("error", "failed to parse render request", {
          error: err instanceof Error ? err.message : "unknown",
          raw_length: message.value.length,
        });
        return;
      }

      if (!body.job_id || !body.config || !body.aspect_ratio) {
        log("error", "render request missing required fields", {
          job_id: body.job_id || "missing",
          has_config: !!body.config,
          has_aspect_ratio: !!body.aspect_ratio,
        });
        return;
      }

      log("info", "received render request", {
        job_id: body.job_id,
        partition,
        aspect_ratio: body.aspect_ratio,
        output_key: body.output_key,
      });

      // Fire-and-forget render processing (matches previous 202 pattern)
      processRender(body)
        .then((result) => publishResult(result))
        .catch((err) => {
          log("error", "unhandled error in render pipeline", {
            job_id: body.job_id,
            error: err instanceof Error ? err.message : "unknown",
            stack: err instanceof Error ? err.stack : undefined,
          });
        });
    },
  });

  log("info", "kafka consumer started", { topic: "video.render.request" });
}

async function main(): Promise<void> {
  log("info", "starting video renderer", {
    port: PORT,
    kafka_brokers: KAFKA_BROKERS,
    storage_type: STORAGE_TYPE,
    output_dir: OUTPUT_DIR,
    chromium_path: process.env.CHROMIUM_PATH || "default",
    node_version: process.version,
    pid: process.pid,
  });

  // Start Express for health checks
  app.listen(PORT, () => {
    log("info", "health check server listening", { port: PORT });
  });

  // Start Kafka consumer/producer
  await startKafka();
}

main().catch((err) => {
  log("error", "failed to start video renderer", {
    error: err instanceof Error ? err.message : "unknown",
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
