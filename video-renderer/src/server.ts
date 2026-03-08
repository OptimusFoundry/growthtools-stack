import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import { Kafka, type Consumer, type Producer } from "kafkajs";
import { renderVideo } from "./render";
import { uploadToS3 } from "./s3";
import type { VideoConfig } from "./compositions/TextOnGradient/types";

const app = express();

const PORT = parseInt(process.env.PORT || "4000", 10);
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || "localhost:9092";
const STORAGE_TYPE = process.env.STORAGE_TYPE || "local";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "../base-server/media-uploads";

// Health check endpoint (for Docker healthcheck)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

interface RenderRequest {
  job_id: string;
  config: VideoConfig;
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

  try {
    await renderVideo({
      config: body.config,
      aspectRatio: body.aspect_ratio,
      outputPath,
    });

    let fileUrl = "";
    if (STORAGE_TYPE === "s3" && body.s3_bucket) {
      fileUrl = await uploadToS3(outputPath, body.s3_bucket, body.output_key);
    } else {
      fileUrl = await saveToLocal(outputPath, body.output_key);
    }

    return {
      job_id: body.job_id,
      status: "completed",
      file_url: fileUrl,
      error_message: "",
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "unknown error";
    return {
      job_id: body.job_id,
      status: "failed",
      file_url: "",
      error_message: errorMsg,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function saveToLocal(sourcePath: string, key: string): Promise<string> {
  const destPath = path.join(OUTPUT_DIR, key);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
  console.log(`Video saved to local storage: ${destPath}`);
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
    console.log(
      `Published render result for job ${result.job_id}: ${result.status}`,
    );
  } catch (err) {
    console.error(
      `Failed to publish render result for job ${result.job_id}:`,
      err,
    );
  }
}

async function startKafka(): Promise<void> {
  producer = kafka.producer();
  await producer.connect();
  console.log("Kafka producer connected");

  consumer = kafka.consumer({ groupId: "video-renderer" });
  await consumer.connect();
  await consumer.subscribe({
    topic: "video.render.request",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      let body: RenderRequest;
      try {
        body = JSON.parse(message.value.toString()) as RenderRequest;
      } catch (err) {
        console.error("Failed to parse render request:", err);
        return;
      }

      if (!body.job_id || !body.config || !body.aspect_ratio) {
        console.error("Render request missing required fields:", body.job_id);
        return;
      }

      console.log(`Received render request for job ${body.job_id}`);

      // Fire-and-forget render processing (matches previous 202 pattern)
      processRender(body)
        .then((result) => publishResult(result))
        .catch((err) => {
          console.error(`Render failed for job ${body.job_id}:`, err);
        });
    },
  });

  console.log("Kafka consumer started on topic: video.render.request");
}

async function main(): Promise<void> {
  // Start Express for health checks
  app.listen(PORT, () => {
    console.log(`Video renderer health check on port ${PORT}`);
  });

  // Start Kafka consumer/producer
  await startKafka();
}

main().catch((err) => {
  console.error("Failed to start video renderer:", err);
  process.exit(1);
});
