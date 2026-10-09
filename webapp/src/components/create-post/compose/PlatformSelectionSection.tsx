import { SectionHeader, Stack, Switch, Text } from "@optimusfoundry/quiet";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
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
			<SectionHeader size="sm" as="h2" title="Platforms" />
			{activeConnections.length > 0 ? (
				<Stack direction="row" wrap gap="sm">
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
				<Text size="sm" color="muted">
					No connected platforms. Connect platforms in Settings.
				</Text>
			)}
		</Stack>
	);
}
