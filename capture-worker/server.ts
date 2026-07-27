// Always-on HTTP + Kafka service for the capture agent.
//
// Kafka (primary):
//   Consumes github.capture.requests, runs Playwright, uploads to S3,
//   publishes result on github.capture.results. See kafka.ts.
//
// HTTP (dev / manual):
//   GET  /health   -> 200 "ok" (used by the ECS task healthcheck)
//   POST /capture  -> same runCapture call the Kafka bridge uses, so a
//                     local invocation produces the same artefacts.
//
// Env:
//   PORT (default 8090)
//   APP_URL, APP_EMAIL, APP_PASSWORD — defaults used when request omits them
//   GEMINI_API_KEY (or GOOGLE_AI_API_KEY) — forwarded to the agent
//   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY — uploads
//   CAPTURE_WORKER_SHARED_SECRET — optional shared secret for /capture
//   KAFKA_BROKERS — comma-separated brokers, enables the Kafka bridge
//   KAFKA_CONSUMER_GROUP — defaults to "capture-worker"

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isS3Enabled, runCapture, s3BucketName } from "./capture.ts";
import { startKafkaBridge } from "./kafka.ts";
import type { ExplorationPlan } from "./types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CaptureBody {
	commit?: string;
	pagePath?: string;
	goal?: string;
	appUrl?: string;
	email?: string;
	password?: string;
	/** Enable two-pass mode for this request. */
	twoPass?: boolean;
	/** Supply a pre-computed plan (skips explore). Must be a valid ExplorationPlan JSON object. */
	plan?: unknown;
}

interface GuineaPig {
	appUrl?: string;
	credentials?: { email?: string; password?: string };
}

const config = JSON.parse(
	await fs.readFile(path.join(__dirname, "fixtures", "guinea-pig.json"), "utf8"),
) as GuineaPig;

const sharedSecret = process.env.CAPTURE_WORKER_SHARED_SECRET ?? "";
const port = Number.parseInt(process.env.PORT ?? "8090", 10);

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
	const output = await runCapture({
		commit,
		appUrl,
		email,
		password,
		goal: body.goal,
		twoPass: body.twoPass === true,
		plan: body.plan as ExplorationPlan | undefined,
	});
	send(res, 200, {
		commit: output.commit,
		captureDir: output.captureDir,
		stepCount: output.stepCount,
		uploaded: output.uploaded.map((u) => ({ key: u.key, url: u.url ?? null })),
		...(output.planPath ? { planPath: output.planPath } : {}),
	});
}

server.listen(port, () => {
	console.log(`[server] listening on :${port}`);
	console.log(
		`[server] S3 uploads: ${isS3Enabled() ? `enabled (${s3BucketName()})` : "disabled"}`,
	);
	console.log(
		`[server] shared secret: ${sharedSecret ? "required" : "disabled"}`,
	);
});

// Fire up the Kafka bridge alongside the HTTP server. If KAFKA_BROKERS is
// empty (local dev without Kafka) it just logs and exits; the HTTP endpoint
// still works.
void startKafkaBridge().catch((err: unknown) => {
	console.error("[kafka] bridge failed to start:", err);
});
