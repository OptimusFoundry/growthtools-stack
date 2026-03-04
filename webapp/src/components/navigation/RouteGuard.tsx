import { Navigate, useLocation } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import React from "react";
import { usePersona } from "@/contexts/persona";
import { Icon } from "@/proto-design-system/components/primitives/Icon";
import styles from "./routeguard.module.scss";

interface RouteGuardProps {
	children: React.ReactNode;
}

/**
 * RouteGuard component that checks if the user has access to the current route
 * based on their persona. Redirects to home if access is denied.
 */
export function RouteGuard({ children }: RouteGuardProps) {
	const { canAccessRoute, persona } = usePersona();
	const location = useLocation();

	const currentPath = location.pathname;

	// Check if user can access this route
	const hasAccess = canAccessRoute(currentPath);

	if (!hasAccess) {
		return (
			<div className={styles.accessDenied}>
				<div className={styles.accessDeniedContent}>
					<Icon icon={Lock} size="2xl" />
					<h2>Access Denied</h2>
					<p>
						Your account role ({persona}) does not have access to this page.
					</p>
					<p>Please contact your administrator if you need access.</p>
					<Navigate to="/" />
				</div>
			</div>
		);
	}

	return <>{children}</>;
}
