import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";

function log(level: "info" | "error", msg: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: "video-renderer",
    component: "s3",
    msg,
    ...meta,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

const s3Region = process.env.S3_REGION || "us-east-1";

const s3 = new S3Client({
  region: s3Region,
  credentials:
    process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export async function uploadToS3(
  filePath: string,
  bucket: string,
  key: string,
): Promise<string> {
  const stat = fs.statSync(filePath);
  log("info", "starting S3 upload", {
    bucket,
    key,
    file_size_bytes: stat.size,
    file_size_mb: (stat.size / (1024 * 1024)).toFixed(2),
    region: s3Region,
  });

  const uploadStart = Date.now();
  const fileStream = fs.createReadStream(filePath);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentType: "video/mp4",
  });

  await s3.send(command);

  const url = `https://${bucket}.s3.amazonaws.com/${key}`;
  log("info", "S3 upload complete", {
    bucket,
    key,
    url,
    upload_duration_ms: Date.now() - uploadStart,
  });

  return url;
}
