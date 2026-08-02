import { useCallback, useRef, useState } from "react";
import type { ApiBlogPost } from "@/api/types/blog";
import { extractJSONStringField } from "@/utils/streamingJson";

type BlogSSEPhase = "idle" | "generating";

interface SSEBlogGenerateState {
	phase: BlogSSEPhase;
	// Raw text of the model's in-progress JSON response, accumulated as
	// chunks arrive — never rendered directly. `streamingContent` (derived
	// from this) is what the UI shows.
	rawJSON: string;
	streamingContent: string;
	blogPost: ApiBlogPost | null;
	loading: boolean;
	error: string | null;
}

const initialState: SSEBlogGenerateState = {
	phase: "idle",
	rawJSON: "",
	streamingContent: "",
	blogPost: null,
	loading: false,
	error: null,
};

export function useSSEBlogGenerate() {
	const [state, setState] = useState<SSEBlogGenerateState>(initialState);
	const abortRef = useRef<AbortController | null>(null);

	const generate = useCallback(
		async (instruction: string, keywords: string[], mediaIDs?: string[]) => {
			abortRef.current?.abort();
			const controller = new AbortController();
			abortRef.current = controller;

			setState({ ...initialState, loading: true, phase: "generating" });

			try {
				const res = await fetch(
					`${import.meta.env.VITE_API_URL}/api/protected/blog/generate/stream`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "text/event-stream",
						},
						credentials: "include",
						body: JSON.stringify({
							instruction,
							keywords,
							media_ids: mediaIDs ?? [],
						}),
						signal: controller.signal,
					},
				);

				if (!res.ok) {
					setState((prev) => ({
						...prev,
						loading: false,
						phase: "idle",
						error: "Failed to start blog generation",
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
								const payload = JSON.parse(data) as { phase: string };
								if (payload.phase === "generating") {
									setState((prev) => ({ ...prev, phase: "generating" }));
								}
							} else if (currentEvent === "chunk") {
								const payload = JSON.parse(data) as { text: string };
								setState((prev) => {
									const rawJSON = prev.rawJSON + payload.text;
									return {
										...prev,
										rawJSON,
										streamingContent: extractJSONStringField(
											rawJSON,
											"content",
										),
									};
								});
							} else if (currentEvent === "done") {
								const post = JSON.parse(data) as ApiBlogPost;
								setState((prev) => ({
									...prev,
									loading: false,
									phase: "idle",
									blogPost: post,
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
					error: "Blog generation failed",
				}));
			}
		},
		[],
	);

	const reset = useCallback(() => {
		abortRef.current?.abort();
		setState(initialState);
	}, []);

	return { generate, reset, ...state };
}
