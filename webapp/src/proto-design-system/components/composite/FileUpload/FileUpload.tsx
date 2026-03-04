import {
	AlertCircle,
	File,
	FileArchive,
	FileText,
	Image,
	Upload,
	X,
} from "lucide-react";
import {
	type ChangeEvent,
	type DragEvent,
	useCallback,
	useRef,
	useState,
} from "react";
import { cn } from "../../../utils/cn";
import styles from "./FileUpload.module.scss";

export type FileUploadVariant = "dropzone" | "button";

export interface UploadedFile {
	file: File;
	id: string;
	progress?: number;
	error?: string;
}

export interface FileUploadProps {
	/** Upload variant */
	variant?: FileUploadVariant;
	/** Accepted file types (e.g., "image/*,.pdf") */
	accept?: string;
	/** Allow multiple files */
	multiple?: boolean;
	/** Maximum file size in bytes */
	maxSize?: number;
	/** Maximum number of files */
	maxFiles?: number;
	/** Uploaded files */
	files?: UploadedFile[];
	/** File change handler */
	onFilesChange?: (files: UploadedFile[]) => void;
	/** Disabled state */
	disabled?: boolean;
	/** Dropzone label */
	label?: string;
	/** Dropzone description */
	description?: string;
	/** Show file list */
	showFileList?: boolean;
	/** Additional className */
	className?: string;
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(type: string) {
	if (type.startsWith("image/")) return Image;
	if (type.startsWith("text/") || type.includes("pdf")) return FileText;
	if (type.includes("zip") || type.includes("rar") || type.includes("tar"))
		return FileArchive;
	return File;
}

function generateId(): string {
	return Math.random().toString(36).substring(2, 11);
}

/**
 * FileUpload component for uploading files via drag & drop or file picker.
 *
 * @example
 * ```tsx
 * <FileUpload
 *   accept="image/*"
 *   multiple
 *   maxSize={5 * 1024 * 1024}
 *   files={files}
 *   onFilesChange={setFiles}
 * />
 * ```
 */
export function FileUpload({
	variant = "dropzone",
	accept,
	multiple = false,
	maxSize,
	maxFiles,
	files = [],
	onFilesChange,
	disabled = false,
	label = "Drag & drop files here",
	description = "or click to browse",
	showFileList = true,
	className,
}: FileUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const validateFile = useCallback(
		(file: File): string | null => {
			if (maxSize && file.size > maxSize) {
				return `File size exceeds ${formatFileSize(maxSize)}`;
			}
			return null;
		},
		[maxSize],
	);

	const handleFiles = useCallback(
		(fileList: FileList | null) => {
			if (!fileList || disabled) return;

			const newFiles: UploadedFile[] = [];
			const existingCount = files.length;
			const maxAllowed = maxFiles
				? maxFiles - existingCount
				: Number.POSITIVE_INFINITY;

			for (let i = 0; i < Math.min(fileList.length, maxAllowed); i++) {
				const file = fileList[i];
				if (!file) continue;
				const error = validateFile(file);
				newFiles.push({
					file,
					id: generateId(),
					progress: error ? undefined : 0,
					error: error || undefined,
				});
			}

			onFilesChange?.([...files, ...newFiles]);
		},
		[files, maxFiles, disabled, validateFile, onFilesChange],
	);

	const handleDragEnter = useCallback(
		(e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (!disabled) {
				setIsDragging(true);
			}
		},
		[disabled],
	);

	const handleDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDragOver = useCallback((e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);
			handleFiles(e.dataTransfer.files);
		},
		[handleFiles],
	);

	const handleInputChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			handleFiles(e.target.files);
			// Reset input value to allow re-selecting the same file
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		},
		[handleFiles],
	);

	const handleClick = useCallback(() => {
		if (!disabled) {
			inputRef.current?.click();
		}
	}, [disabled]);

	const handleRemoveFile = useCallback(
		(id: string) => {
			onFilesChange?.(files.filter((f) => f.id !== id));
		},
		[files, onFilesChange],
	);

	return (
		<div className={cn(styles.fileUpload, className)}>
			{variant === "dropzone" ? (
				<button
					type="button"
					className={cn(
						styles.dropzone,
						isDragging && styles.dragging,
						disabled && styles.disabled,
					)}
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}
					onClick={handleClick}
					disabled={disabled}
				>
					<Upload className={styles.uploadIcon} />
					<div className={styles.dropzoneText}>
						<span className={styles.label}>{label}</span>
						<span className={styles.description}>{description}</span>
					</div>
					{accept && (
						<span className={styles.acceptedTypes}>Accepted: {accept}</span>
					)}
				</button>
			) : (
				<button
					type="button"
					className={cn(styles.uploadButton, disabled && styles.disabled)}
					onClick={handleClick}
					disabled={disabled}
				>
					<Upload className={styles.buttonIcon} />
					Choose files
				</button>
			)}

			<input
				ref={inputRef}
				type="file"
				accept={accept}
				multiple={multiple}
				onChange={handleInputChange}
				className={styles.hiddenInput}
				disabled={disabled}
				aria-hidden="true"
				tabIndex={-1}
			/>

			{showFileList && files.length > 0 && (
				<ul className={styles.fileList}>
					{files.map((uploadedFile) => {
						const FileIcon = getFileIcon(uploadedFile.file.type);
						return (
							<li key={uploadedFile.id} className={styles.fileItem}>
								<FileIcon className={styles.fileIcon} />
								<div className={styles.fileInfo}>
									<span className={styles.fileName}>
										{uploadedFile.file.name}
									</span>
									<span className={styles.fileSize}>
										{formatFileSize(uploadedFile.file.size)}
									</span>
									{uploadedFile.error && (
										<span className={styles.fileError}>
											<AlertCircle className={styles.errorIcon} />
											{uploadedFile.error}
										</span>
									)}
									{uploadedFile.progress !== undefined &&
										!uploadedFile.error && (
											<div className={styles.progressBar}>
												<div
													className={styles.progressFill}
													style={{ width: `${uploadedFile.progress}%` }}
												/>
											</div>
										)}
								</div>
								<button
									type="button"
									className={styles.removeButton}
									onClick={() => handleRemoveFile(uploadedFile.id)}
									aria-label={`Remove ${uploadedFile.file.name}`}
								>
									<X />
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

FileUpload.displayName = "FileUpload";
