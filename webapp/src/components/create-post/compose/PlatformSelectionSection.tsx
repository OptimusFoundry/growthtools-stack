import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { Switch } from "@/proto-design-system/components/forms/Switch";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";

interface PlatformSelectionSectionProps {
	selectedPlatforms: PlatformType[];
	onTogglePlatform: (platform: PlatformType) => void;
	readOnly?: boolean;
}

export function PlatformSelectionSection({
	selectedPlatforms,
	onTogglePlatform,
	readOnly,
}: PlatformSelectionSectionProps) {
	const { connections } = usePlatformConnections();
	const activeConnections = connections.filter((c) => c.status === "active");

	return (
		<Stack gap="sm">
			<Text size="md" weight="semibold">
				Platforms
			</Text>
			{activeConnections.length > 0 ? (
				<Stack direction="row" gap="md" wrap>
					{activeConnections.map((conn) => (
						<Switch
							key={conn.id}
							label={PLATFORM_DISPLAY_NAMES[conn.platform]}
							checked={selectedPlatforms.includes(conn.platform)}
							onChange={() => onTogglePlatform(conn.platform)}
							size="sm"
							disabled={readOnly}
						/>
					))}
				</Stack>
			) : (
				<Text size="sm" color="secondary">
					No connected platforms. Connect platforms in Settings.
				</Text>
			)}
		</Stack>
	);
}
