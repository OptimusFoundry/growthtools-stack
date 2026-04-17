import { ImageIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { isVideoType, type MediaItem } from "@/types/media";
import {
	PLATFORM_CHAR_LIMITS,
	PLATFORM_DISPLAY_NAMES,
	type PlatformType,
} from "@/types/platform";
import styles from "./PlatformPostCard.module.scss";

interface PlatformPostCardProps {
	platform: PlatformType;
	content: string;
	onChange: (content: string) => void;
	media?: MediaItem[];
	readOnly?: boolean;
}

// -- Editable content (shared across all variants)

function EditableContent({
	content,
	onChange,
	platform,
	className,
	readOnly,
}: {
	content: string;
	onChange: (content: string) => void;
	platform: PlatformType;
	className?: string;
	readOnly?: boolean;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (el && el.textContent !== content) {
			el.textContent = content;
		}
	}, [content]);

	const handleInput = useCallback(() => {
		const el = ref.current;
		if (el) {
			onChange(el.textContent ?? "");
		}
	}, [onChange]);

	const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
		e.preventDefault();
		const text = e.clipboardData.getData("text/plain");
		document.execCommand("insertText", false, text);
	}, []);

	return (
		<div
			ref={ref}
			className={className ?? styles.editableContent}
			contentEditable={!readOnly}
			suppressContentEditableWarning
			onInput={handleInput}
			onPaste={handlePaste}
			role="textbox"
			aria-label={`Edit ${PLATFORM_DISPLAY_NAMES[platform]} content`}
			data-placeholder="Write your post..."
		/>
	);
}

// -- Media grid (renders inside post card, between content and action bar)

function MediaGrid({ media }: { media: MediaItem[] }) {
	if (media.length === 0) return null;

	const gridClass =
		media.length === 1
			? styles.mediaGrid1
			: media.length === 2
				? styles.mediaGrid2
				: media.length === 3
					? styles.mediaGrid3
					: styles.mediaGrid4;

	return (
		<div className={`${styles.mediaGrid} ${gridClass}`}>
			{media.slice(0, 4).map((item, i) => (
				<div key={item.id} className={styles.mediaGridItem}>
					{item.url ? (
						isVideoType(item.contentType) ? (
							<video
								src={item.url}
								controls
								preload="metadata"
								className={styles.mediaGridImg}
								aria-label={item.altText ?? item.filename}
							>
								<track kind="captions" />
							</video>
						) : (
							<img
								src={item.url}
								alt={item.altText ?? item.filename}
								className={styles.mediaGridImg}
							/>
						)
					) : (
						<div className={styles.mediaGridPlaceholder}>
							<ImageIcon size={24} />
						</div>
					)}
					{media.length > 4 && i === 3 && (
						<div className={styles.mediaGridOverflow}>+{media.length - 4}</div>
					)}
				</div>
			))}
		</div>
	);
}

// -- Platform logos (shown in card header like embedded posts)

function XLogo({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width="20"
			height="20"
			aria-label="X"
			className={className}
		>
			<path
				fill="currentColor"
				d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
			/>
		</svg>
	);
}

function BlueSkyLogo({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 568 501"
			width="20"
			height="20"
			aria-label="BlueSky"
			className={className}
		>
			<path
				fill="#0085ff"
				d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 323.8 536.444 388.56 500.889 453.32 434.956 573.547 346.143 457.116 317.219 406.78c-5.085-8.85-7.461-12.988-33.22-12.988-25.758 0-28.134 4.138-33.219 12.988-28.924 50.336-117.737 166.767-183.67 46.54-35.555-64.76-6.333-129.52 108.542-149.07-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.659 0 75.293 0 57.947 0-28.906 76.135-1.612 123.121 33.664z"
			/>
		</svg>
	);
}

function ThreadsLogo({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 192 192"
			width="20"
			height="20"
			aria-label="Threads"
			className={className}
		>
			<path
				fill="currentColor"
				d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.111 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.14-23.82 1.371-39.134 15.24-38.356 34.735.393 9.851 5.063 18.325 13.154 23.848 6.831 4.666 15.633 6.981 24.785 6.52 12.083-.607 21.546-5.174 28.1-13.576 4.98-6.385 8.098-14.625 9.394-24.898 5.636 3.404 9.833 7.882 12.276 13.382 4.148 9.348 4.393 24.702-3.699 33.889-7.099 8.059-15.644 11.564-28.49 11.668-14.244-.115-25.016-4.69-32.025-13.6-6.559-8.339-9.933-20.19-10.025-35.21.092-15.02 3.466-26.872 10.025-35.21 7.009-8.91 17.781-13.486 32.025-13.6 14.394.117 25.39 4.752 32.67 13.779 3.563 4.42 6.273 10.093 8.133 16.848l15.198-4.145c-2.32-8.547-5.987-15.92-11.01-22.152-10.384-12.882-25.36-19.58-44.492-19.905h-.497c-19.014.316-33.902 6.986-44.332 19.838-9.118 11.245-13.837 26.347-14.025 44.908.189 18.56 4.907 33.663 14.025 44.908 10.43 12.851 25.318 19.521 44.332 19.838h.497c16.035-.132 28.344-5.136 38.726-15.744 13.548-13.837 13.042-30.625 7.879-42.262-3.704-8.341-10.509-15.147-19.634-19.833zm-44.063 42.03c-10.124.539-20.636-3.986-21.248-16.147-.452-9.028 6.362-19.101 24.108-20.122 2.112-.121 4.182-.182 6.21-.182 6.264 0 12.12.634 17.405 1.87-1.982 24.446-14.908 33.894-26.475 34.58z"
			/>
		</svg>
	);
}

// -- Other SVG icons

function VerifiedBadge({ color }: { color: string }) {
	return (
		<svg
			viewBox="0 0 22 22"
			width="14"
			height="14"
			aria-label="Verified"
			className={styles.verified}
		>
			<path
				fill={color}
				d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.607-.274 1.264-.144 1.897.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681.132-.637.075-1.299-.164-1.903.584-.274 1.083-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
			/>
		</svg>
	);
}

// Action bar icons
function IconReply() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="currentColor"
				d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"
			/>
		</svg>
	);
}

function IconRepost() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="currentColor"
				d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"
			/>
		</svg>
	);
}

function IconHeart() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="currentColor"
				d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"
			/>
		</svg>
	);
}

function IconBookmark() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="currentColor"
				d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"
			/>
		</svg>
	);
}

function IconShare() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="currentColor"
				d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"
			/>
		</svg>
	);
}

// BlueSky-specific icons
function IconBskyReply() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="currentColor"
				d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11H7v2h4v3l4-4-4-4v3z"
			/>
		</svg>
	);
}

function IconBskyRepost() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="currentColor"
				d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"
			/>
		</svg>
	);
}

function IconBskyHeart() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="currentColor"
				d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z"
			/>
		</svg>
	);
}

function IconBskyMore() {
	return (
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path
				fill="currentColor"
				d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM3 9c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm18 0c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
			/>
		</svg>
	);
}

// -- Platform-specific card renderers

function XPostCard({
	content,
	onChange,
	charLimit,
	media,
	readOnly,
}: {
	content: string;
	onChange: (content: string) => void;
	charLimit: number;
	media?: MediaItem[];
	readOnly?: boolean;
}) {
	const isOver = content.length > charLimit;

	return (
		<div className={styles.card} data-platform="x">
			<div className={styles.xPost}>
				<div className={styles.avatarCol}>
					<div className={styles.avatar}>
						<span className={styles.avatarInitial}>Y</span>
					</div>
				</div>
				<div className={styles.contentCol}>
					<div className={styles.xHeader}>
						<span className={styles.displayName}>You</span>
						<VerifiedBadge color="#1d9bf0" />
						<span className={styles.handleGray}>@you</span>
						<span className={styles.separator}>·</span>
						<span className={styles.timestamp}>now</span>
						<XLogo className={styles.platformLogo} />
					</div>
					<EditableContent
						content={content}
						onChange={onChange}
						platform="x"
						className={styles.editableContent}
						readOnly={readOnly}
					/>
					{media && media.length > 0 && <MediaGrid media={media} />}
					<div className={styles.xActions}>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconReply />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconRepost />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconHeart />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBookmark />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconShare />
						</button>
						<div className={styles.charBadge}>
							<Badge variant={isOver ? "error" : "default"} size="sm">
								{content.length} / {charLimit}
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function BlueSkyPostCard({
	content,
	onChange,
	charLimit,
	media,
	readOnly,
}: {
	content: string;
	onChange: (content: string) => void;
	charLimit: number;
	media?: MediaItem[];
	readOnly?: boolean;
}) {
	const isOver = content.length > charLimit;

	return (
		<div className={styles.card} data-platform="bluesky">
			<div className={styles.xPost}>
				<div className={styles.avatarCol}>
					<div className={styles.avatar}>
						<span className={styles.avatarInitial}>Y</span>
					</div>
				</div>
				<div className={styles.contentCol}>
					<div className={styles.xHeader}>
						<span className={styles.displayName}>You</span>
						<span className={styles.handleGray}>@you.bsky.social</span>
						<span className={styles.separator}>·</span>
						<span className={styles.timestamp}>now</span>
						<BlueSkyLogo className={styles.platformLogo} />
					</div>
					<EditableContent
						content={content}
						onChange={onChange}
						platform="bluesky"
						className={styles.editableContent}
						readOnly={readOnly}
					/>
					{media && media.length > 0 && <MediaGrid media={media} />}
					<div className={styles.xActions}>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBskyReply />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBskyRepost />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBskyHeart />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconBskyMore />
						</button>
						<div className={styles.charBadge}>
							<Badge variant={isOver ? "error" : "default"} size="sm">
								{content.length} / {charLimit}
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ThreadsPostCard({
	content,
	onChange,
	charLimit,
	media,
	readOnly,
}: {
	content: string;
	onChange: (content: string) => void;
	charLimit: number;
	media?: MediaItem[];
	readOnly?: boolean;
}) {
	const isOver = content.length > charLimit;

	return (
		<div className={styles.card} data-platform="threads">
			<div className={styles.xPost}>
				<div className={styles.avatarCol}>
					<div className={styles.avatar}>
						<span className={styles.avatarInitial}>Y</span>
					</div>
				</div>
				<div className={styles.contentCol}>
					<div className={styles.xHeader}>
						<span className={styles.displayName}>you</span>
						<VerifiedBadge color="#000" />
						<span className={styles.timestamp}>now</span>
						<ThreadsLogo className={styles.platformLogo} />
					</div>
					<EditableContent
						content={content}
						onChange={onChange}
						platform="threads"
						className={styles.editableContent}
						readOnly={readOnly}
					/>
					{media && media.length > 0 && <MediaGrid media={media} />}
					<div className={styles.threadsActions}>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconHeart />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconReply />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconRepost />
						</button>
						<button type="button" className={styles.actionBtn} tabIndex={-1}>
							<IconShare />
						</button>
						<div className={styles.charBadge}>
							<Badge variant={isOver ? "error" : "default"} size="sm">
								{content.length} / {charLimit}
							</Badge>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function GenericPostCard({
	platform,
	content,
	onChange,
	charLimit,
	media,
	readOnly,
}: {
	platform: PlatformType;
	content: string;
	onChange: (content: string) => void;
	charLimit: number;
	media?: MediaItem[];
	readOnly?: boolean;
}) {
	const displayName = PLATFORM_DISPLAY_NAMES[platform];
	const isOver = content.length > charLimit;

	return (
		<div className={styles.card} data-platform={platform}>
			<div className={styles.genericHeader}>
				<span className={styles.dot} />
				<span className={styles.genericHandle}>@you</span>
				<span className={styles.genericPlatformName}>{displayName}</span>
			</div>
			<div className={styles.genericBody}>
				<EditableContent
					content={content}
					onChange={onChange}
					platform={platform}
					className={styles.editableContent}
					readOnly={readOnly}
				/>
			</div>
			{media && media.length > 0 && <MediaGrid media={media} />}
			<div className={styles.genericFooter}>
				<Badge variant={isOver ? "error" : "default"} size="sm">
					{content.length} / {charLimit}
				</Badge>
			</div>
		</div>
	);
}

// -- Main export

export function PlatformPostCard({
	platform,
	content,
	onChange,
	media,
	readOnly,
}: PlatformPostCardProps) {
	const charLimit = PLATFORM_CHAR_LIMITS[platform];

	switch (platform) {
		case "x":
			return (
				<XPostCard
					content={content}
					onChange={onChange}
					charLimit={charLimit}
					media={media}
					readOnly={readOnly}
				/>
			);
		case "bluesky":
			return (
				<BlueSkyPostCard
					content={content}
					onChange={onChange}
					charLimit={charLimit}
					media={media}
					readOnly={readOnly}
				/>
			);
		case "threads":
			return (
				<ThreadsPostCard
					content={content}
					onChange={onChange}
					charLimit={charLimit}
					media={media}
					readOnly={readOnly}
				/>
			);
		default:
			return (
				<GenericPostCard
					platform={platform}
					content={content}
					onChange={onChange}
					charLimit={charLimit}
					media={media}
					readOnly={readOnly}
				/>
			);
	}
}
