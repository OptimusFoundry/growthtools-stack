/**
 * AnalyticsPage Component
 * Placeholder — will be rebuilt for social media analytics
 */

import { BarChart2 } from "lucide-react";
import { memo } from "react";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./component.module.scss";

export const AnalyticsPage = memo(function AnalyticsPage() {
	return (
		<Stack gap="lg" className={styles.page} animate>
			<Stack gap="xs">
				<Text as="h1" size="2xl" weight="semibold">
					Analytics
				</Text>
				<Text color="secondary">
					Track your social media performance across platforms
				</Text>
			</Stack>

			<EmptyState
				title="Coming Soon"
				description="Social media analytics will be available once you connect your platforms and start publishing."
				icon={<BarChart2 size={48} />}
			/>
		</Stack>
	);
});

AnalyticsPage.displayName = "AnalyticsPage";
