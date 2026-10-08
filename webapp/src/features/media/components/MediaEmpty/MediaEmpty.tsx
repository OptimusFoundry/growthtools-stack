import { ImageIcon, Upload } from "lucide-react";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState/EmptyState";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";

export function MediaEmpty({ onUpload }: { onUpload: () => void }) {
	return (
		<EmptyState
			title="No media yet"
			description="Upload images and videos to use in your posts."
			icon={<ImageIcon size={48} />}
			action={
				<Button variant="primary" onClick={onUpload}>
					<Upload size={16} /> Upload Media
				</Button>
			}
		/>
	);
}
