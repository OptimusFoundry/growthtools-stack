// Always-on HTTP server exposing the capture agent.
//
// Routes:
//   GET  /health        -> 200 "ok"
//   POST /capture       -> { commit, pagePath?, goal?, email?, password? }
//                          Runs runDemo() against the configured app, uploads
//                          outputs to S3 (if S3_BUCKET is set), returns keys.
//
// Env:
//   PORT (default 8080)
//   APP_URL, APP_EMAIL, APP_PASSWORD — defaults used when request body omits them
//   GEMINI_API_KEY (or GOOGLE_AI_API_KEY) — forwarded to the agent
//   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY — upload target
//   CAPTURE_WORKER_SHARED_SECRET — if set, required as X-Capture-Secret header

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDemo } from "./agent.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CaptureBody {
	commit?: string;
	pagePath?: string;
	goal?: string;
	appUrl?: string;
	email?: string;
	password?: string;
}

interface GuineaPig {
	appUrl?: string;
	credentials?: { email?: string; password?: string };
}

const config = JSON.parse(
	await fs.readFile(path.join(__dirname, "fixtures", "guinea-pig.json"), "utf8"),
) as GuineaPig;

const sharedSecret = process.env.CAPTURE_WORKER_SHARED_SECRET ?? "";
const port = Number.parseInt(process.env.PORT ?? "8080", 10);

const s3Bucket = process.env.S3_BUCKET ?? "";
const s3 = s3Bucket
	? new S3Client({
			region: process.env.S3_REGION ?? "us-east-1",
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

async function uploadDir(
	localDir: string,
	keyPrefix: string,
): Promise<string[]> {
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

async function readBody(req: http.IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk: Buffer) => {
			data += chunk.toString();
			if (data.length > 1_000_000) {
				reject(new Error("body too large"));
				req.destroy();
			}
		});
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}

function send(
	res: http.ServerResponse,
	status: number,
	body: object | string,
): void {
	const text = typeof body === "string" ? body : JSON.stringify(body);
	res.writeHead(status, { "Content-Type": "application/json" });
	res.end(text);
}

const server = http.createServer((req, res) => {
	void handle(req, res).catch((err: unknown) => {
		console.error(err);
		send(res, 500, { error: err instanceof Error ? err.message : String(err) });
	});
});

async function handle(
	req: http.IncomingMessage,
	res: http.ServerResponse,
): Promise<void> {
	if (req.method === "GET" && req.url === "/health") {
		send(res, 200, { status: "ok" });
		return;
	}
	if (req.method !== "POST" || req.url !== "/capture") {
		send(res, 404, { error: "not found" });
		return;
	}

	// Shared-secret auth (if configured). ALB listener rules can also enforce
	// this by matching the same header.
	if (sharedSecret) {
		const provided = req.headers["x-capture-secret"];
		if (provided !== sharedSecret) {
			send(res, 401, { error: "unauthorized" });
			return;
		}
	}

	const raw = await readBody(req);
	const body: CaptureBody = raw ? (JSON.parse(raw) as CaptureBody) : {};

	const appUrl = body.appUrl ?? process.env.APP_URL ?? config.appUrl;
	const email = body.email ?? process.env.APP_EMAIL ?? config.credentials?.email;
	const password =
		body.password ?? process.env.APP_PASSWORD ?? config.credentials?.password;
	const commit = body.commit;

	if (!appUrl || !email || !password || !commit) {
		send(res, 400, {
			error:
				"missing required: commit (body), and one of appUrl/email/password (body or env/config)",
		});
		return;
	}

	console.log(`[server] capture commit=${commit} page=${body.pagePath ?? "/"}`);
	const result = await runDemo({
		appUrl,
		email,
		password,
		commit,
		goal: body.goal,
	});

	const keyPrefix = `captures/${commit.slice(0, 12)}/demo`;
	const uploadedKeys = await uploadDir(result.captureDir, keyPrefix);

	send(res, 200, {
		commit,
		captureDir: result.captureDir,
		stepCount: result.stepCount,
		uploaded: uploadedKeys.map((k) => ({
			key: k,
			url: s3Bucket ? `s3://${s3Bucket}/${k}` : null,
		})),
	});
}

server.listen(port, () => {
	console.log(`[server] listening on :${port}`);
	console.log(
		`[server] S3 uploads: ${s3Bucket ? `enabled (${s3Bucket})` : "disabled"}`,
	);
	console.log(
		`[server] shared secret: ${sharedSecret ? "required" : "disabled"}`,
	);
});
