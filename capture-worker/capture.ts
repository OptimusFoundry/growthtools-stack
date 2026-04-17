// Shared "run the agent, upload artefacts to S3" path used by both the HTTP
// server and the Kafka consumer. Kept deliberately small — the agent module
// does the Playwright work; this file just orchestrates the call and uploads
// what it produces.

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import { runDemo } from "./agent.ts";

export interface CaptureInput {
	commit: string;
	appUrl: string;
	email: string;
	password: string;
	goal?: string;
	/** Commit summary (message). If provided, the agent skips local git. */
	summary?: string;
	/** Unified diff text. If provided, the agent skips local git. */
	diff?: string;
}

export interface CaptureUpload {
	key: string;
	url?: string;
}

export interface CaptureOutput {
	commit: string;
	captureDir: string;
	stepCount: number;
	uploaded: CaptureUpload[];
}

const s3Bucket = process.env.S3_BUCKET ?? "";
const s3Region = process.env.S3_REGION ?? "us-east-1";
const s3 = s3Bucket
	? new S3Client({
			region: s3Region,
			credentials:
				process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
					? {
							accessKeyId: process.env.S3_ACCESS_KEY_ID,
							secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
						}
					: undefined,
		})
	: null;

function guessContentType(file: string): string {
	if (file.endsWith(".png")) return "image/png";
	if (file.endsWith(".webm")) return "video/webm";
	if (file.endsWith(".json")) return "application/json";
	return "application/octet-stream";
}

async function uploadDir(localDir: string, keyPrefix: string): Promise<string[]> {
	if (!s3 || !s3Bucket) return [];
	const entries = await fs.readdir(localDir);
	const uploaded: string[] = [];
	for (const entry of entries) {
		const full = path.join(localDir, entry);
		const stat = await fs.stat(full);
		if (!stat.isFile()) continue;
		const key = `${keyPrefix}/${entry}`;
		const body = await fs.readFile(full);
		await s3.send(
			new PutObjectCommand({
				Bucket: s3Bucket,
				Key: key,
				Body: body,
				ContentType: guessContentType(entry),
			}),
		);
		uploaded.push(key);
	}
	return uploaded;
}

/**
 * runCapture executes the Playwright demo for one commit and uploads the
 * resulting artefacts to S3. Shared by the HTTP handler and the Kafka
 * consumer so both paths produce the same output shape.
 */
export async function runCapture(input: CaptureInput): Promise<CaptureOutput> {
	const result = await runDemo({
		appUrl: input.appUrl,
		email: input.email,
		password: input.password,
		commit: input.commit,
		goal: input.goal,
		summary: input.summary,
		diff: input.diff,
	});

	const keyPrefix = `captures/${input.commit.slice(0, 12)}/demo`;
	const keys = await uploadDir(result.captureDir, keyPrefix);

	const uploaded: CaptureUpload[] = keys.map((key) => ({
		key,
		url: s3Bucket ? `s3://${s3Bucket}/${key}` : undefined,
	}));

	return {
		commit: input.commit,
		captureDir: result.captureDir,
		stepCount: result.stepCount,
		uploaded,
	};
}

export function isS3Enabled(): boolean {
	return Boolean(s3 && s3Bucket);
}

export function s3BucketName(): string {
	return s3Bucket;
}
