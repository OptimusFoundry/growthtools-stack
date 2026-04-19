// Kafka bridge for the capture-worker.
//
// Consumes github.capture.requests (written by base-server's webhook path),
// runs the Playwright capture + S3 upload, and publishes a matching message
// on github.capture.results for base-server's CaptureResultWorker to persist.
//
// The HTTP /capture endpoint in server.ts stays around for manual local
// testing; in production the Kafka path is the one that actually runs.
//
// Env:
//   KAFKA_BROKERS       — comma-separated list (required to enable the bridge)
//   KAFKA_CONSUMER_GROUP — defaults to "capture-worker"
//   APP_URL, APP_EMAIL, APP_PASSWORD — fallback values when the request
//                                       payload omits them

import { Admin, Consumer, Kafka, Producer } from "kafkajs";
import { runCapture, uploadCommitArtifacts } from "./capture.ts";

const TOPIC_REQUESTS = "github.capture.requests";
const TOPIC_RESULTS = "github.capture.results";

interface CaptureRequestMessage {
	commit_id: string;
	sha: string;
	owner: string;
	repo: string;
	message: string;
	/** Unified diff fetched server-side via the GitHub API. May be empty. */
	diff?: string;
	app_url?: string;
	/** If true, the worker runs the explore pass before recording. */
	two_pass?: boolean;
}

interface CaptureResultMessage {
	commit_id: string;
	sha: string;
	success: boolean;
	step_count?: number;
	capture_dir?: string;
	uploaded?: { key: string; url?: string }[];
	error?: string;
}

export interface KafkaBridge {
	stop: () => Promise<void>;
}

export async function startKafkaBridge(): Promise<KafkaBridge | null> {
	const brokers = (process.env.KAFKA_BROKERS ?? "")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
	if (brokers.length === 0) {
		console.log("[kafka] KAFKA_BROKERS empty — bridge disabled");
		return null;
	}

	const groupId = process.env.KAFKA_CONSUMER_GROUP ?? "capture-worker";
	const defaultAppUrl = process.env.APP_URL ?? "";
	const defaultEmail = process.env.APP_EMAIL ?? "";
	const defaultPassword = process.env.APP_PASSWORD ?? "";

	const kafka = new Kafka({
		clientId: "capture-worker",
		brokers,
	});

	// Make sure both topics exist before we subscribe. kafkajs' consumer
	// aborts startup with UNKNOWN_TOPIC_OR_PARTITION if the request topic
	// isn't there yet; segmentio/kafka-go (base-server) is more forgiving,
	// so without this the first capture after a clean deploy is silently
	// lost because capture-worker bails before base-server ever writes.
	const admin: Admin = kafka.admin();
	await admin.connect();
	await admin.createTopics({
		topics: [{ topic: TOPIC_REQUESTS }, { topic: TOPIC_RESULTS }],
		waitForLeaders: true,
	});
	await admin.disconnect();

	const producer: Producer = kafka.producer();
	// fromBeginning: true is safe — kafkajs resumes from committed offsets
	// on subsequent joins regardless of this flag; it only matters for the
	// first join of a consumer group. Using `true` protects us from the
	// race where a message lands before the very first subscribe lands.
	//
	// Session/rebalance timeouts are bumped well past the capture duration.
	// A full Playwright run can take 60–90s; the kafkajs defaults are
	// sessionTimeout=30s / rebalanceTimeout=60s, which means the broker
	// evicts the consumer mid-capture, never commits the offset, and
	// redelivers the same request as soon as it rejoins. The explicit
	// heartbeat loop below keeps the session alive even on the slowest
	// captures — the timeouts are a belt-and-braces ceiling.
	const consumer: Consumer = kafka.consumer({
		groupId,
		sessionTimeout: 300_000, // 5 min — at broker-side group.max.session.timeout.ms default
		rebalanceTimeout: 300_000,
		heartbeatInterval: 10_000,
	});

	await producer.connect();
	await consumer.connect();
	await consumer.subscribe({ topic: TOPIC_REQUESTS, fromBeginning: true });

	console.log(`[kafka] bridge up — group=${groupId} brokers=${brokers.join(",")}`);

	await consumer.run({
		// One capture at a time per partition; Playwright is heavyweight
		// and the host is memory-constrained.
		eachMessage: async ({ message, heartbeat }) => {
			const raw = message.value?.toString();
			if (!raw) return;

			let request: CaptureRequestMessage;
			try {
				request = JSON.parse(raw) as CaptureRequestMessage;
			} catch (err) {
				console.error("[kafka] failed to parse capture request", err);
				return;
			}

			const commitLog = `${request.owner}/${request.repo}@${request.sha.slice(0, 7)}`;
			const diffSize = request.diff?.length ?? 0;
			console.log(
				`[kafka] capture start ${commitLog} commit_id=${request.commit_id} diff_chars=${diffSize} two_pass=${request.two_pass === true} app_url=${request.app_url ?? "(default)"}`,
			);

			// Keep the consumer-group session alive while the long-running
			// capture executes. kafkajs does NOT heartbeat in the
			// background during eachMessage — the runner loop is blocked
			// until we return — so we fire our own interval. Firing every
			// 10s is well under the 300s sessionTimeout.
			const heartbeatTimer = setInterval(() => {
				heartbeat().catch((err) => {
					console.error("[kafka] heartbeat failed during capture", err);
				});
			}, 10_000);

			const result: CaptureResultMessage = {
				commit_id: request.commit_id,
				sha: request.sha,
				success: false,
			};

			try {
				const appUrl = request.app_url || defaultAppUrl;
				if (!appUrl || !defaultEmail || !defaultPassword) {
					throw new Error(
						"missing app_url / demo credentials — set APP_URL, APP_EMAIL, APP_PASSWORD or pass app_url in the request",
					);
				}
				const output = await runCapture({
					commit: request.sha,
					appUrl,
					email: defaultEmail,
					password: defaultPassword,
					goal: request.message,
					summary: request.message,
					diff: request.diff ?? "",
					twoPass: request.two_pass === true,
				});
				result.success = true;
				result.step_count = output.stepCount;
				result.capture_dir = output.captureDir;
				result.uploaded = output.uploaded;
				console.log(
					`[kafka] capture ok ${commitLog} steps=${output.stepCount} uploads=${output.uploaded.length}`,
				);
			} catch (err) {
				result.error = err instanceof Error ? err.message : String(err);
				console.error(`[kafka] capture failed ${commitLog}:`, result.error);
				// Best-effort upload of whatever the agent wrote before the
				// throw — plan.json, partial transcripts, explore screenshots.
				// Without this, failed runs leave no artifacts behind because
				// the success path (runCapture) never reaches its upload step.
				try {
					const salvaged = await uploadCommitArtifacts(request.sha);
					if (salvaged.length > 0) {
						result.uploaded = salvaged;
						console.log(
							`[kafka] salvaged ${salvaged.length} artifact(s) from failed run ${commitLog}`,
						);
					}
				} catch (uploadErr) {
					console.error(
						`[kafka] failed to salvage artifacts for ${commitLog}:`,
						uploadErr,
					);
				}
			} finally {
				clearInterval(heartbeatTimer);
			}

			try {
				await producer.send({
					topic: TOPIC_RESULTS,
					messages: [
						{ key: request.commit_id, value: JSON.stringify(result) },
					],
				});
			} catch (err) {
				console.error("[kafka] failed to publish capture result", err);
			}
		},
	});

	return {
		stop: async () => {
			await consumer.disconnect();
			await producer.disconnect();
		},
	};
}
