import { useCallback, useRef, useState } from "react";
import type { WizardContentType } from "@/components/create-post/useCreatePostWizard";
import type { PlatformType } from "@/types/platform";

type Phase = "idle" | "generating";

interface SSEContentGenerateState {
	phase: Phase;
	platformContent: Partial<Record<PlatformType, string>>;
	threadContent: Partial<Record<PlatformType, string[]>>;
	loading: boolean;
	error: string | null;
}

const initialState: SSEContentGenerateState = {
	phase: "idle",
	platformContent: {},
	threadContent: {},
	loading: false,
	error: null,
};

export function useSSEContentGenerate() {
	const [state, setState] = useState<SSEContentGenerateState>(initialState);
	const abortRef = useRef<AbortController | null>(null);

	const generate = useCallback(
		async (
			prompt: string,
			platforms: PlatformType[],
			contentType: WizardContentType = "text",
		) => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setState({
				...initialState,
				loading: true,
				phase: "generating",
			});

			try {
				const res = await fetch(
					`${import.meta.env.VITE_API_URL}/api/protected/content/generate/stream`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "text/event-stream",
						},
						credentials: "include",
						body: JSON.stringify({
							prompt,
							platforms,
							content_type: contentType,
						}),
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
					// Keep the last potentially incomplete line in the buffer
					buffer = lines.pop() ?? "";

					let currentEvent = "";

					for (const line of lines) {
						if (line.startsWith("event: ")) {
							currentEvent = line.slice(7).trim();
							continue;
						}

						if (line.startsWith("data: ")) {
							const data = line.slice(6);

							if (currentEvent === "platform_done") {
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
									segments: string[];
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
