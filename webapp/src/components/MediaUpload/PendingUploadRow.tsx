import { Button, Progress } from "@optimusfoundry/quiet";
import { X } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { formatFileSize } from "@/types/media";
import type { PendingUpload } from "@/types/mediaUpload";
import styles from "./PendingUploadRow.module.scss";

interface PendingUploadRowProps {
	upload: PendingUpload;
	onRemove: (id: string) => void;
	disabled?: boolean;
}

export function PendingUploadRow({
	upload,
	onRemove,
	disabled,
}: PendingUploadRowProps) {
	const { id, file, progress, error } = upload;
	const determinate = progress !== undefined && progress > 0;

	return (
		<li className={styles.row}>
			<div className={styles.main}>
				<span className={styles.file}>
					<span className={styles.name}>{file.name}</span>
					<span className={styles.meta}>{formatFileSize(file.size)}</span>
				</span>
				<Button
					variant="ghost"
					size="sm"
					icon={<AppIcon icon={X} size="sm" />}
					aria-label={`Remove ${file.name}`}
					disabled={disabled}
					onClick={() => onRemove(id)}
				/>
			</div>
			<div aria-live="polite" className={styles.status}>
				{error ? (
					<span className={styles.error}>{error}</span>
				) : (
					<span className={styles.meta}>Uploading</span>
				)}
			</div>
			<Progress
				aria-label={`Uploading ${file.name}`}
				size="sm"
				variant={error ? "error" : "default"}
				value={error ? 100 : determinate ? progress : 0}
				indeterminate={!error && !determinate}
			/>
		</li>
	);
}
