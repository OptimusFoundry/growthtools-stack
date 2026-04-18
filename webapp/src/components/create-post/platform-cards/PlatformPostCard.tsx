import type { MediaItem } from "@/types/media";
import { PLATFORM_CHAR_LIMITS, type PlatformType } from "@/types/platform";
import { BlueSkyPostCard } from "./BlueSkyPostCard";
import { GenericPostCard } from "./GenericPostCard";
import { ThreadsPostCard } from "./ThreadsPostCard";
import { XPostCard } from "./XPostCard";

interface PlatformPostCardProps {
	platform: PlatformType;
	content: string;
	onChange: (content: string) => void;
	media?: MediaItem[];
	readOnly?: boolean;
}

/**
 * Router component that switches to the correct platform-specific card
 * based on the platform prop.
 */
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
