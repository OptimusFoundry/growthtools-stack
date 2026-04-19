import { useCallback, useEffect, useRef, useState } from "react";
import type { UploadedFile } from "@/proto-design-system/components/composite/FileUpload";
import type { MediaItem } from "@/types/media";
import { useUploadMedia } from "./useUploadMedia";

interface UseManagedMediaUploadOptions {
	onUploaded: (media: MediaItem) => void;
}

export interface ManagedMediaUpload {
	uploadingFiles: UploadedFile[];
	isUploading: boolean;
	onFilesChange: (files: UploadedFile[]) => void;
}

/**
 * Owns the drop→upload lifecycle for media. Each new file in `onFilesChange`
 * triggers an immediate POST to the media endpoint; on success the tile is
 * removed and the caller-supplied `onUploaded` receives the persisted
 * MediaItem. In-flight uploads are aborted when the consumer unmounts or the
 * user removes the tile.
 */
export function useManagedMediaUpload({
	onUploaded,
}: UseManagedMediaUploadOptions): ManagedMediaUpload {
	const [uploadingFiles, setUploadingFiles] = useState<UploadedFile[]>([]);
	const { uploadMedia } = useUploadMedia();
	const controllers = useRef(new Map<string, AbortController>());
	const onUploadedRef = useRef(onUploaded);
	onUploadedRef.current = onUploaded;

	useEffect(() => {
		const refSnapshot = controllers.current;
		return () => {
			for (const controller of refSnapshot.values()) {
				controller.abort();
			}
			refSnapshot.clear();
		};
	}, []);

	const onFilesChange = useCallback(
		(files: UploadedFile[]) => {
			const prevIds = new Set(uploadingFiles.map((f) => f.id));
			const newIds = new Set(files.map((f) => f.id));

			for (const id of prevIds) {
				if (!newIds.has(id)) {
					const controller = controllers.current.get(id);
					controller?.abort();
					controllers.current.delete(id);
				}
			}

			for (const file of files) {
				if (prevIds.has(file.id)) continue;
				if (file.error) continue;
				const controller = new AbortController();
				controllers.current.set(file.id, controller);

				uploadMedia(file.file, controller.signal)
					.then((media) => {
						controllers.current.delete(file.id);
						setUploadingFiles((curr) => curr.filter((f) => f.id !== file.id));
						onUploadedRef.current(media);
					})
					.catch((err: unknown) => {
						controllers.current.delete(file.id);
						if (err instanceof DOMException && err.name === "AbortError") {
							return;
						}
						const message =
							err instanceof Error ? err.message : "Upload failed";
						setUploadingFiles((curr) =>
							curr.map((f) =>
								f.id === file.id
									? { ...f, progress: undefined, error: message }
									: f,
							),
						);
					});
			}

			setUploadingFiles(
				files.map((f) => {
					if (prevIds.has(f.id) || f.error) return f;
					return { ...f, progress: 0 };
				}),
			);
		},
		[uploadMedia, uploadingFiles],
	);

	const isUploading = uploadingFiles.some(
		(f) => !f.error && f.progress !== undefined && f.progress < 100,
	);

	return { uploadingFiles, isUploading, onFilesChange };
}
