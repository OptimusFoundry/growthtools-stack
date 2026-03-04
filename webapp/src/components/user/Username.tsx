"use client";

import { useContext } from "react";
import { AuthContext } from "@/contexts/auth";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { useSidebarContext } from "@/proto-design-system/components/navigation/Sidebar";
import { Avatar } from "@/proto-design-system/components/primitives/Avatar";
import { Text } from "@/proto-design-system/components/primitives/Text";

export default function UserName() {
	const auth = useContext(AuthContext);
	const { collapsed } = useSidebarContext();

	if (!auth.user) {
		return null;
	}

	const initials =
		`${auth.user.firstName?.charAt(0) || ""}${auth.user.lastName?.charAt(0) || ""}`.toUpperCase();
	const fullName =
		`${auth.user.firstName || ""} ${auth.user.lastName || ""}`.trim();

	if (collapsed) {
		return <Avatar size="sm" fallback={initials} />;
	}

	return (
		<Stack direction="row" gap="sm" align="center">
			<Avatar size="sm" fallback={initials} />
			<Text size="sm" weight="medium">
				{fullName}
			</Text>
		</Stack>
	);
}
