import { useCallback, useRef, useState } from "react";
import type { WizardContentType } from "@/components/create-post/useCreatePostWizard";
import type { PlatformType } from "@/types/platform";

type Phase = "idle" | "describing" | "generating" | "adapting";

export interface ImagePayload {
	mime_type: string;
	data: string;
}

export interface ThreadSegment {
	content: string;
	image_index?: number;
}

interface SSEContentGenerateState {
	phase: Phase;
	baseContent: string;
	streamingText: Partial<Record<PlatformType, string>>;
	platformContent: Partial<Record<PlatformType, string>>;
	threadContent: Partial<Record<PlatformType, ThreadSegment[]>>;
	loading: boolean;
	error: string | null;
}

const initialState: SSEContentGenerateState = {
	phase: "idle",
	baseContent: "",
	streamingText: {},
	platformContent: {},
	threadContent: {},
	loading: false,
	error: null,
};

export async function filesToBase64(files: File[]): Promise<ImagePayload[]> {
	return Promise.all(
		files.map(
			(file) =>
				new Promise<ImagePayload>((resolve, reject) => {
					const reader = new FileReader();
					reader.onload = () => {
						const result = reader.result as string;
						// Strip "data:image/jpeg;base64," prefix
						const base64 = result.split(",")[1];
						resolve({ mime_type: file.type, data: base64 });
					};
					reader.onerror = reject;
					reader.readAsDataURL(file);
				}),
		),
	);
}

export function useSSEContentGenerate() {
	const [state, setState] = useState<SSEContentGenerateState>(initialState);
	const abortRef = useRef<AbortController | null>(null);

	const generate = useCallback(
		async (
			prompt: string,
			platforms: PlatformType[],
			contentType: WizardContentType = "text",
			images?: ImagePayload[],
			maxThreadParts?: number,
		) => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setState({
				...initialState,
				loading: true,
				phase: images && images.length > 0 ? "describing" : "generating",
			});

			try {
				const body: Record<string, unknown> = {
					prompt,
					platforms,
					content_type: contentType,
				};
				if (images && images.length > 0) {
					body.images = images;
				}
				if (maxThreadParts && maxThreadParts > 0) {
					body.max_thread_parts = maxThreadParts;
				}

				const res = await fetch(
					`${import.meta.env.VITE_API_URL}/api/protected/content/generate/stream`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "text/event-stream",
						},
						credentials: "include",
						body: JSON.stringify(body),
						signal: controller.signal,
					},
				);

				if (!res.ok) {
					setState((prev) => ({
						...prev,
						loading: false,
						phase: "idle",
						error: "Failed to start content generation",
					}));
					return;
				}

				const reader = res.body?.getReader();
				if (!reader) {
					throw new Error("Failed to get reader from response body");
				}

				const decoder = new TextDecoder("utf-8");
				let buffer = "";

				while (true) {
					const { value, done } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() ?? "";

					let currentEvent = "";

					for (const line of lines) {
						if (line.startsWith("event: ")) {
							currentEvent = line.slice(7).trim();
							continue;
						}

						if (line.startsWith("data: ")) {
							const data = line.slice(6);

							if (currentEvent === "phase") {
								const payload = JSON.parse(data) as {
									phase: string;
									platform: string;
								};
								if (payload.phase === "describing") {
									setState((prev) => ({
										...prev,
										phase: "describing",
									}));
								} else if (payload.phase === "generating") {
									setState((prev) => ({
										...prev,
										phase: "generating",
									}));
								} else if (
									payload.phase === "adapting" ||
									payload.phase === "threading"
								) {
									setState((prev) => ({
										...prev,
										phase: "adapting",
									}));
								}
							} else if (currentEvent === "chunk") {
								const payload = JSON.parse(data) as {
									platform: string;
									text: string;
								};
								if (!payload.platform) {
									// Base content chunk
									setState((prev) => ({
										...prev,
										baseContent: prev.baseContent + payload.text,
									}));
								} else {
									// Per-platform streaming chunk
									setState((prev) => ({
										...prev,
										streamingText: {
											...prev.streamingText,
											[payload.platform]:
												(prev.streamingText[payload.platform as PlatformType] ??
													"") + payload.text,
										},
									}));
								}
							} else if (currentEvent === "base_done") {
								const payload = JSON.parse(data) as {
									content: string;
								};
								setState((prev) => ({
									...prev,
									baseContent: payload.content,
								}));
							} else if (currentEvent === "platform_done") {
								const payload = JSON.parse(data) as {
									platform: string;
									content: string;
								};
								setState((prev) => ({
									...prev,
									platformContent: {
										...prev.platformContent,
										[payload.platform]: payload.content,
									},
								}));
							} else if (currentEvent === "thread_done") {
								const payload = JSON.parse(data) as {
									platform: string;
									segments: ThreadSegment[];
								};
								setState((prev) => ({
									...prev,
									threadContent: {
										...prev.threadContent,
										[payload.platform]: payload.segments,
									},
								}));
							} else if (currentEvent === "done") {
								setState((prev) => ({
									...prev,
									loading: false,
									phase: "idle",
								}));
							} else if (currentEvent === "error") {
								setState((prev) => ({
									...prev,
									loading: false,
									phase: "idle",
									error: data,
								}));
							}

							currentEvent = "";
						}
					}
				}
			} catch (err: unknown) {
				if (err instanceof DOMException && err.name === "AbortError") {
					return;
				}
				setState((prev) => ({
					...prev,
					loading: false,
					phase: "idle",
					error: "Content generation failed",
				}));
			}
		},
		[],
	);

	const reset = useCallback(() => {
		abortRef.current?.abort();
		setState(initialState);
	}, []);

	return {
		generate,
		reset,
		...state,
	};
}
