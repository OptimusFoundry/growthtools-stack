import { Film, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { Alert } from "@/proto-design-system/components/feedback/Alert/Alert";
import { Checkbox } from "@/proto-design-system/components/forms/Checkbox/Checkbox";
import { Stack } from "@/proto-design-system/components/layout/Stack/Stack";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
import { Text } from "@/proto-design-system/components/primitives/Text/Text";
import type { MediaItem } from "@/types/media";
import { isVideoType } from "@/types/media";
import styles from "./CaptureMediaPicker.module.scss";

// X and Bluesky both cap a post at 4 images, and X won't mix a video with
// images. Warn rather than block — the user may only publish to one platform.
const MAX_IMAGES = 4;

type CaptureGroup = "storybook" | "demo" | "explore" | "other";

const GROUP_LABELS: Record<CaptureGroup, string> = {
	storybook: "Storybook",
	demo: "Demo",
	explore: "Explore",
	other: "Other",
};
const GROUP_ORDER: CaptureGroup[] = ["storybook", "demo", "explore", "other"];

/** Capture keys look like captures/<sha>/<group>/<file>; the presigned URL keeps that path. */
function captureGroup(item: MediaItem): CaptureGroup {
	let path = item.url;
	try {
		path = new URL(item.url).pathname;
	} catch {
		// Not an absolute URL — fall back to matching the raw string.
	}
	for (const group of ["storybook", "demo", "explore"] as const) {
		if (path.includes(`/${group}/`)) return group;
	}
	return "other";
}

/** "Badge--primitives-badge--primary.png" -> "Badge · primary"; "step-03.png" -> "Step 3". */
export function captureLabel(item: MediaItem): string {
	const name = item.filename.replace(/\.[^.]+$/, "");
	const story = name.match(/^(.+?)--.*--(.+)$/);
	if (story) return `${story[1]} · ${story[2].replace(/-/g, " ")}`;
	const step = name.match(/^step-0*(\d+)$/);
	if (step) return `Step ${step[1]}`;
	if (isVideoType(item.contentType)) return "Recording";
	return name;
}

export function selectionWarning(selected: MediaItem[]): string | undefined {
	const videos = selected.filter((m) => isVideoType(m.contentType)).length;
	const images = selected.length - videos;
	if (videos > 0 && images > 0) {
		return "X can't post a video together with images. Pick either the video or up to 4 images.";
	}
	if (videos > 1) return "Most platforms allow only one video per post.";
	if (images > MAX_IMAGES) {
		return `X and Bluesky allow at most ${MAX_IMAGES} images per post.`;
	}
	return undefined;
}

interface CaptureMediaPickerProps {
	captureMedia: MediaItem[];
	selectedIds: string[];
	onToggle: (item: MediaItem, selected: boolean) => void;
	onRegenerate: () => void;
	regenerating: boolean;
	disabled?: boolean;
}

export function CaptureMediaPicker({
	captureMedia,
	selectedIds,
	onToggle,
	onRegenerate,
	regenerating,
	disabled = false,
}: CaptureMediaPickerProps) {
	const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

	const groups = useMemo(() => {
		const byGroup = new Map<CaptureGroup, MediaItem[]>();
		for (const item of captureMedia) {
			const g = captureGroup(item);
			byGroup.set(g, [...(byGroup.get(g) ?? []), item]);
		}
		return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
			group: g,
			items: byGroup.get(g) ?? [],
		}));
	}, [captureMedia]);

	const selected = captureMedia.filter((m) => selectedSet.has(m.id));
	const warning = selectionWarning(selected);

	return (
		<section className={styles.picker} aria-labelledby="capture-media-heading">
			<Stack gap="sm">
				<div className={styles.header}>
					<Stack gap="0">
						<Text size="md" weight="semibold" id="capture-media-heading">
							Captured media
						</Text>
						<Text size="sm" color="secondary">
							Ticked items publish with this post. Regenerate to rewrite the
							post around them.
						</Text>
					</Stack>
					<Button
						variant="secondary"
						size="sm"
						leftIcon={<RefreshCw size={14} aria-hidden="true" />}
						onClick={onRegenerate}
						isLoading={regenerating}
						disabled={disabled || regenerating || selected.length === 0}
					>
						Regenerate with {selected.length} selected
					</Button>
				</div>

				{warning && <Alert variant="warning">{warning}</Alert>}

				{groups.map(({ group, items }) => (
					<Stack gap="xs" key={group}>
						<Text size="sm" weight="medium" color="secondary">
							{GROUP_LABELS[group]} · {items.length}
						</Text>
						<ul className={styles.grid}>
							{items.map((item) => {
								const isSelected = selectedSet.has(item.id);
								const label = captureLabel(item);
								return (
									<li
										key={item.id}
										className={styles.tile}
										data-selected={isSelected || undefined}
									>
										<label className={styles.tileInner}>
											<span className={styles.thumb}>
												{isVideoType(item.contentType) ? (
													<>
														<video
															src={item.url}
															muted
															preload="metadata"
															className={styles.media}
														/>
														<Film
															size={16}
															className={styles.videoBadge}
															aria-hidden="true"
														/>
													</>
												) : (
													<img
														src={item.url}
														alt=""
														loading="lazy"
														className={styles.media}
													/>
												)}
												<span className={styles.check}>
													<Checkbox
														size="sm"
														checked={isSelected}
														disabled={disabled || regenerating}
														onChange={(e) => onToggle(item, e.target.checked)}
														aria-label={`Use ${label}`}
													/>
												</span>
											</span>
											<span className={styles.caption} title={label}>
												{label}
											</span>
										</label>
									</li>
								);
							})}
						</ul>
					</Stack>
				))}
			</Stack>
		</section>
	);
}
