// Shared "run the agent, upload artefacts to S3" path used by both the HTTP
// server and the Kafka consumer. Kept deliberately small — the agent module
// does the Playwright work; this file just orchestrates the call and uploads
// what it produces.

import {
	DeleteObjectsCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDemo } from "./agent.ts";
import type { ExplorationPlan } from "./types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
	/** Pass a pre-computed plan to skip the Explore pass. */
	plan?: ExplorationPlan;
	/** Enable two-pass mode (explore then record). Ignored when plan is supplied. */
	twoPass?: boolean;
	maxExploreSteps?: number;
	exploreWallClockMs?: number;
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
	/** Set when an explore pass ran or a plan was supplied. */
	planPath?: string;
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
	if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
	if (file.endsWith(".mp4")) return "video/mp4";
	if (file.endsWith(".mov")) return "video/quicktime";
	if (file.endsWith(".webm")) return "video/webm";
	if (file.endsWith(".json")) return "application/json";
	return "application/octet-stream";
}

// uploadTree walks a local directory recursively and uploads every file under
// keyPrefix, preserving the relative path. Returns the list of uploaded S3
// keys. Unlike the old uploadDir (flat, single-level), this keeps subdirs
// like explore/ and demo/ structured so the commit's full working directory
// round-trips to S3.
async function uploadTree(localRoot: string, keyPrefix: string): Promise<string[]> {
	if (!s3 || !s3Bucket) return [];
	const client = s3;
	const bucket = s3Bucket;
	const uploaded: string[] = [];

	async function walk(dir: string) {
		const entries = await fs.readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
				continue;
			}
			if (!entry.isFile()) continue;
			const rel = path.relative(localRoot, full);
			const key = `${keyPrefix}/${rel.split(path.sep).join("/")}`;
			const body = await fs.readFile(full);
			await client.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					Body: body,
					ContentType: guessContentType(entry.name),
				}),
			);
			uploaded.push(key);
		}
	}

	await walk(localRoot);
	return uploaded;
}

// clearPrefix deletes every object under keyPrefix. Used on retry so the new
// run's artifacts fully replace the prior run's — prevents stale plan.json
// from a failed explore lingering next to a successful demo.
async function clearPrefix(keyPrefix: string): Promise<number> {
	if (!s3 || !s3Bucket) return 0;
	let deleted = 0;
	let continuationToken: string | undefined;
	do {
		const listed = await s3.send(
			new ListObjectsV2Command({
				Bucket: s3Bucket,
				Prefix: `${keyPrefix}/`,
				ContinuationToken: continuationToken,
			}),
		);
		const objects = (listed.Contents ?? [])
			.map((o) => o.Key)
			.filter((k): k is string => Boolean(k));
		if (objects.length > 0) {
			await s3.send(
				new DeleteObjectsCommand({
					Bucket: s3Bucket,
					Delete: { Objects: objects.map((Key) => ({ Key })), Quiet: true },
				}),
			);
			deleted += objects.length;
		}
		continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
	} while (continuationToken);
	return deleted;
}

// commitArtifactsDir returns the on-disk root where the agent writes every
// artifact for a commit run — demo/, explore/, any future siblings. Must
// mirror the outDir + commit slice layout in agent.ts.
export function commitArtifactsDir(commit: string): string {
	return path.join(__dirname, "captures", commit.slice(0, 12));
}

export function commitS3Prefix(commit: string): string {
	return `captures/${commit.slice(0, 12)}`;
}

// uploadCommitArtifacts wipes the commit's S3 prefix and re-uploads everything
// currently on disk under commitArtifactsDir. Called from both the success
// and failure paths so failed runs leave plan.json, transcripts, and explore
// screenshots behind for debugging. Safe to call even when nothing is on
// disk (returns []).
export async function uploadCommitArtifacts(commit: string): Promise<CaptureUpload[]> {
	if (!s3 || !s3Bucket) return [];
	const dir = commitArtifactsDir(commit);
	try {
		await fs.access(dir);
	} catch {
		console.log(`[capture] no artifacts on disk for ${commit.slice(0, 12)}; skipping upload`);
		return [];
	}
	const prefix = commitS3Prefix(commit);
	const wiped = await clearPrefix(prefix);
	const keys = await uploadTree(dir, prefix);
	console.log(
		`[capture] s3 sync ${commit.slice(0, 12)}: wiped ${wiped} prior objects, uploaded ${keys.length}`,
	);
	return keys.map((key) => ({ key, url: `s3://${s3Bucket}/${key}` }));
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
		plan: input.plan,
		twoPass: input.twoPass,
		maxExploreSteps: input.maxExploreSteps,
		exploreWallClockMs: input.exploreWallClockMs,
	});

	// Upload the whole commit tree (demo/, explore/, anything else the agent
	// writes under captures/<sha12>/). Wipes the prefix first so retries
	// cleanly replace prior runs instead of layering stale artifacts.
	const uploaded = await uploadCommitArtifacts(input.commit);

	return {
		commit: input.commit,
		captureDir: result.captureDir,
		stepCount: result.stepCount,
		uploaded,
		planPath: result.planPath,
	};
}

export function isS3Enabled(): boolean {
	return Boolean(s3 && s3Bucket);
}

export function s3BucketName(): string {
	return s3Bucket;
}
