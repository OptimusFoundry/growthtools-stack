import React from "react";
import { fileKind, formatBytes, isImage } from "./chat-utils";
import "./Attachment.scss";

/**
 * A file in a conversation. `chip` sits in the composer and can be removed; `card` sits in a message
 * and can be opened. Images show a thumbnail (from `src`, or an object URL made from `file`).
 * Documents show their type ("PDF", "CSV") in a tile, with name and size.
 */
export interface AttachmentProps {
	/** The File itself; name, size, type and the image thumbnail are read from it */
	file?: File;
	name?: string;
	/** Bytes */
	size?: number;
	/** MIME type */
	type?: string;
	/** Thumbnail URL for images that aren't a local File */
	src?: string;
	variant?: "chip" | "card";
	status?: "done" | "uploading" | "error";
	/** Upload progress 0–1; omit while uploading for an indeterminate bar */
	progress?: number;
	/** Shown in place of the size when status is "error" */
	error?: React.ReactNode;
	/** Chip: shows the remove button */
	onRemove?: () => void;
	/** Card: makes it a button */
	onOpen?: () => void;
	/** Card: makes it a link (opens in a new tab) */
	href?: string;
	/** Ref to the remove button, for focus management */
	removeRef?: React.Ref<HTMLButtonElement>;
	className?: string;
	style?: React.CSSProperties;
}

// A file in a conversation. `chip` sits in the composer (removable); `card` sits in a message
// (openable). Images show a thumbnail — from `src`, or an object URL made from `file` and revoked
// on unmount; documents show their type ("PDF", "CSV") in a tile, with name and size.
export function Attachment({
	file,
	name,
	size,
	type,
	src,
	variant = "chip",
	status = "done",
	progress,
	error,
	onRemove,
	onOpen,
	href,
	removeRef,
	className,
	style,
}: AttachmentProps) {
	const fileName = name ?? file?.name ?? "Untitled";
	const fileSize = size ?? file?.size;
	const fileType = type ?? file?.type ?? "";
	const image = isImage(fileType, fileName);
	const [objectUrl, setObjectUrl] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (src || !image || !file || typeof URL === "undefined" || !URL.createObjectURL)
			return undefined;
		const url = URL.createObjectURL(file);
		setObjectUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file, src, image]);
	const thumb = src || objectUrl;
	const kind = fileKind(fileName, fileType);
	const uploading = status === "uploading";
	const failed = status === "error";
	const pct = progress == null ? null : Math.round(Math.max(0, Math.min(1, progress)) * 100);
	const meta = failed
		? error || "Upload failed"
		: uploading
			? pct == null
				? "Uploading…"
				: `Uploading ${pct}%`
			: [kind, formatBytes(fileSize)].filter(Boolean).join(" · ");
	const card = variant === "card";
	const openable = card && (onOpen || href);

	const cls = [
		"q-attachment",
		`q-attachment--${card ? "card" : "chip"}`,
		image && thumb && "q-attachment--image",
		failed && "q-attachment--error",
		uploading && "q-attachment--uploading",
		className,
	]
		.filter(Boolean)
		.join(" ");

	const preview =
		image && thumb ? (
			<img className="q-attachment__thumb" src={thumb} alt="" />
		) : (
			<span aria-hidden="true" className="q-attachment__tile">
				{kind}
			</span>
		);
	const body = (
		<>
			{preview}
			<span className="q-attachment__text">
				<span className="q-attachment__name">{fileName}</span>
				<span className="q-attachment__meta">
					{failed && <span aria-hidden="true" className="q-attachment__dot" />}
					{meta}
				</span>
			</span>
		</>
	);
	const label = `${fileName}, ${meta}`;

	return (
		<div className={cls} style={style} aria-busy={uploading || undefined}>
			{openable ? (
				href ? (
					<a
						className="q-attachment__main"
						href={href}
						target="_blank"
						rel="noreferrer"
						aria-label={`Open ${label}`}
					>
						{body}
					</a>
				) : (
					<button
						type="button"
						className="q-attachment__main"
						onClick={onOpen}
						aria-label={`Open ${label}`}
					>
						{body}
					</button>
				)
			) : (
				<span className="q-attachment__main" role="group" aria-label={label}>
					{body}
				</span>
			)}
			{uploading && (
				<span
					role="progressbar"
					aria-label={`Uploading ${fileName}`}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={pct ?? undefined}
					className="q-attachment__progress"
					data-indeterminate={pct == null || undefined}
					style={pct == null ? undefined : ({ "--_progress": pct / 100 } as React.CSSProperties)}
				/>
			)}
			{onRemove && (
				<button
					ref={removeRef}
					type="button"
					className="q-attachment__remove"
					aria-label={`Remove ${fileName}`}
					onClick={onRemove}
				>
					<span aria-hidden="true">{"×"}</span>
				</button>
			)}
		</div>
	);
}
