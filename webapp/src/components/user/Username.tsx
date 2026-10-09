"use client";

import { Avatar, Stack, Text } from "@optimusfoundry/quiet";
import { useContext } from "react";
import { AuthContext } from "@/contexts/auth";

export default function UserName() {
	const auth = useContext(AuthContext);

	if (!auth.user) {
		return null;
	}

	const initials =
		`${auth.user.firstName?.charAt(0) || ""}${auth.user.lastName?.charAt(0) || ""}`.toUpperCase();
	const fullName =
		`${auth.user.firstName || ""} ${auth.user.lastName || ""}`.trim();

	return (
		<Stack direction="row" gap="xs" align="center">
			<Avatar size="sm" fallback={initials} />
			<Text size="sm" weight="medium" color="heading">
				{fullName}
			</Text>
		</Stack>
	);
}
