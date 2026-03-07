import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
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
  const fileStream = fs.createReadStream(filePath);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentType: "video/mp4",
  });

  await s3.send(command);
  return `https://${bucket}.s3.amazonaws.com/${key}`;
}
