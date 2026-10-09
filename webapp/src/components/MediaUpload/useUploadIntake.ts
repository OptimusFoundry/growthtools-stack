import type { FileUploadProps } from "@optimusfoundry/quiet";
import { useRef, useState } from "react";
import type { PendingUpload } from "@/types/mediaUpload";

interface UseUploadIntakeArgs {
	pendingFiles: PendingUpload[];
	onFilesChange: (files: PendingUpload[]) => void;
	maxFiles?: number;
}

export function useUploadIntake({
	pendingFiles,
	onFilesChange,
	maxFiles,
}: UseUploadIntakeArgs) {
	const [limitNote, setLimitNote] = useState<string | null>(null);
	// quiet reports its whole row list on every change, and twice under StrictMode.
	const seen = useRef(new Set<number>());
	const latest = useRef({ pendingFiles, onFilesChange });
	latest.current = { pendingFiles, onFilesChange };

	const onIntake: NonNullable<FileUploadProps["onChange"]> = (rows) => {
		const fresh = rows.filter((row) => row.file && !seen.current.has(row.id));
		if (fresh.length === 0) return;
		for (const row of fresh) seen.current.add(row.id);

		// quiet calls onChange inside a state updater; parent state must not be set there.
		queueMicrotask(() => {
			const { pendingFiles: current, onFilesChange: emit } = latest.current;
			const room =
				maxFiles === undefined
					? fresh.length
					: Math.max(0, maxFiles - current.length);
			const accepted: PendingUpload[] = [];
			for (const row of fresh.slice(0, room)) {
				if (!row.file) continue;
				accepted.push({
					id: `upload-${row.id}`,
					file: row.file,
					error: row.error ?? undefined,
				});
			}
			setLimitNote(
				maxFiles !== undefined && fresh.length > room
					? `Limit is ${maxFiles} files.`
					: null,
			);
			if (accepted.length > 0) emit([...current, ...accepted]);
		});
	};

	return { onIntake, limitNote };
}
