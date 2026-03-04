import React, { createContext, useContext, useMemo } from "react";
import { getUser } from "@/hooks/getUser";
import { User } from "@/types/user";

type AuthContextType = {
	isLoggedIn: boolean;
	user?: User;
};

const defaultAuthContext: AuthContextType = {
	isLoggedIn: false,
};
// Create AuthContext
export const AuthContext = createContext(defaultAuthContext);

export const useAuth = () => useContext(AuthContext);

// Determines if the current path is a public route (e.g., /signin, /oauth/*, /embed/*, /test-*)
function isPublicRoute(): boolean {
	if (typeof window === "undefined") return false;
	const path = window.location.pathname;
	return (
		path === "/signin" ||
		path.startsWith("/oauth") ||
		path.startsWith("/embed") ||
		path.startsWith("/test-")
	);
}

/**
 * Loads the authenticated user or redirects to /signin if not authenticated.
 * Allows unauthenticated access to public routes (e.g., /signin, /oauth/*, /embed/*).
 */
export async function loadAuth(): Promise<User | null> {
	// Skip auth check entirely for public routes
	if (isPublicRoute()) {
		return null;
	}

	try {
		const user = await getUser();
		return user;
	} catch {
		window.location.replace("/signin");
		return new Promise<never>(() => {
			/* Never resolves - app will pause until redirect */
		});
	}
}

export function AuthProvider({
	children,
	user,
}: {
	children: React.ReactNode;
	user: User | null;
}) {
	const value = useMemo<AuthContextType>(
		() => ({
			isLoggedIn: !!user,
			user: user ?? undefined,
		}),
		[user],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
