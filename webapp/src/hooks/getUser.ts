import { type ApiUser, fetcher, toUiUser } from "@/api";
import type { User } from "@/types/user";

export async function getUser(): Promise<User> {
	const response = await fetcher<ApiUser>(
		`${import.meta.env.VITE_API_URL}/api/protected/user`,
		{
			method: "GET",
		},
	);
	return toUiUser(response);
}
