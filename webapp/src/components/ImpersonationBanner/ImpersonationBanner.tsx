/**
 * ImpersonationBanner
 *
 * Intentional design system deviation: this banner must look like a system
 * warning, not editorial UI. Do not "fix" it to match editorial design tokens.
 * The amber/red palette and bold layout are the safety mechanism for admins
 * impersonating real user accounts. See design spec 2026-04-19-admin-impersonation-design.md.
 */

import { useCallback } from "react";
import { fetcher } from "@/api/client";
import { useAuth } from "@/contexts/auth";
import styles from "./ImpersonationBanner.module.scss";

/**
 * Renders a full-width sticky warning banner when an admin is impersonating
 * another user. Hidden entirely for normal (non-impersonated) sessions.
 */
export function ImpersonationBanner() {
	const { user } = useAuth();

	const handleStop = useCallback(async () => {
		try {
			await fetcher(
				`${import.meta.env.VITE_API_URL}/api/protected/admin/impersonate`,
				{
					method: "DELETE",
				},
			);
		} finally {
			// Always reload — cookie is cleared server-side regardless of fetch outcome.
			window.location.assign("/");
		}
	}, []);

	if (!user?.isImpersonated) {
		return null;
	}

	const targetName = `${user.firstName} ${user.lastName}`;
	const adminName = user.impersonatedBy?.name ?? "an admin";

	return (
		<div className={styles.banner} role="alert" aria-live="polite">
			<span className={styles.message}>
				<span className={styles.icon} aria-hidden="true">
					⚠
				</span>{" "}
				Impersonating <strong>{targetName}</strong> (logged in as {adminName}) —
				actions affect their account.
			</span>
			<button type="button" className={styles.stopButton} onClick={handleStop}>
				Stop impersonating
			</button>
		</div>
	);
}
