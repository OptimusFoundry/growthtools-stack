import { Button, EmptyState } from "@optimusfoundry/quiet";
import { ImageIcon, Upload } from "lucide-react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import { trimTrailingPeriod } from "@/utils/trimTrailingPeriod";

export function MediaEmpty({ onUpload }: { onUpload: () => void }) {
	return (
		<EmptyState
			title={trimTrailingPeriod("No media yet")}
			description="Upload images and videos to use in your posts."
			icon={<AppIcon icon={ImageIcon} size="xl" />}
			actions={
				<Button
					variant="primary"
					leftIcon={<AppIcon icon={Upload} />}
					onClick={onUpload}
				>
					Upload Media
				</Button>
			}
		/>
	);
}
