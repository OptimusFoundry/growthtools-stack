import { ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import React from "react";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Icon } from "@/proto-design-system/components/primitives/Icon";
import styles from "./error.module.scss";

interface ErrorStateProps {
	message: string;
}

export const ErrorState: React.FC<ErrorStateProps> = (
	props: ErrorStateProps,
) => {
	return (
		<div style={{ width: "100%" }}>
			<p>{props.message}</p>
		</div>
	);
};

/**
 * ErrorBoundary Component
 *
 * A full-height error boundary component for TanStack Router.
 * Displays error details and provides recovery actions.
 */
export const ErrorBoundary: React.FC<ErrorComponentProps> = ({
	error,
	reset,
}) => {
	const isDev = import.meta.env.DEV;
	const errorMessage =
		error instanceof Error ? error.message : "An unexpected error occurred";
	const errorStack = error instanceof Error ? error.stack : undefined;

	const handleGoHome = () => {
		window.location.href = "/";
	};

	return (
		<div className={styles.root}>
			<div className={styles.container}>
				<div className={styles.iconWrapper}>
					<Icon icon={AlertTriangle} size="2xl" className={styles.icon} />
				</div>

				<h1 className={styles.title}>Something went wrong</h1>

				<p className={styles.message}>{errorMessage}</p>

				{isDev && errorStack && (
					<details className={styles.details}>
						<summary className={styles.summary}>Stack trace</summary>
						<pre className={styles.stack}>{errorStack}</pre>
					</details>
				)}

				<div className={styles.actions}>
					{reset && (
						<Button onClick={reset} leftIcon={<RefreshCw size={16} />}>
							Try again
						</Button>
					)}
					<Button
						variant="secondary"
						onClick={handleGoHome}
						leftIcon={<Home size={16} />}
					>
						Go to home
					</Button>
				</div>
			</div>
		</div>
	);
};
