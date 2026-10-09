import { Button, Text } from "@optimusfoundry/quiet";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import type React from "react";
import { AppIcon } from "@/components/AppIcon/AppIcon";
import styles from "./error.module.scss";

interface ErrorStateProps {
	message: string;
}

export const ErrorState: React.FC<ErrorStateProps> = (
	props: ErrorStateProps,
) => {
	return <Text>{props.message}</Text>;
};

export const ErrorBoundary: React.FC<ErrorComponentProps> = ({
	error,
	reset,
}) => {
	const isDev = import.meta.env.DEV;
	const errorMessage =
		error instanceof Error ? error.message : "An unexpected error occurred";
	const errorStack = error instanceof Error ? error.stack : undefined;

	// Full reload on purpose: it resets the failed tree.
	const handleGoHome = () => {
		window.location.href = "/";
	};

	return (
		<div className={styles.root}>
			<div className={styles.container}>
				<div className={styles.iconWrapper}>
					<AppIcon icon={AlertTriangle} size="2xl" color="error" />
				</div>

				<Text as="h1" heading={4}>
					Something went wrong
				</Text>

				<Text size="lg" color="muted">
					{errorMessage}
				</Text>

				{isDev && errorStack && (
					<details className={styles.details}>
						<summary className={styles.summary}>Stack trace</summary>
						<pre className={styles.stack}>{errorStack}</pre>
					</details>
				)}

				<div className={styles.actions}>
					{reset && (
						<Button
							variant="primary"
							onClick={reset}
							leftIcon={<AppIcon icon={RefreshCw} />}
						>
							Try again
						</Button>
					)}
					<Button
						variant="secondary"
						onClick={handleGoHome}
						leftIcon={<AppIcon icon={Home} />}
					>
						Go to home
					</Button>
				</div>
			</div>
		</div>
	);
};
