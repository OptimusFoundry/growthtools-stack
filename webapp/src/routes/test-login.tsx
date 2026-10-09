import {
	Alert,
	Button,
	PageShell,
	Stack,
	Text,
	TextField,
} from "@optimusfoundry/quiet";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetcher } from "@/api/client";
import styles from "./test-login.module.scss";

export const Route = createFileRoute("/test-login")({
	component: TestLoginPage,
});

function TestLoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await fetcher<void>(
				`${import.meta.env.VITE_API_URL}/api/auth/test/login`,
				{
					method: "POST",
					body: JSON.stringify({ email, password }),
				},
			);
			window.location.replace("/");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
			setSubmitting(false);
		}
	};

	return (
		<PageShell narrow as="main">
			<div className={styles.container}>
				<form onSubmit={handleSubmit} aria-label="Test login">
					<Stack gap="lg">
						<Text as="h1" heading={4}>
							Test login
						</Text>
						<TextField
							size="sm"
							label="Email"
							type="email"
							autoComplete="username"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							data-testid="test-login-email"
						/>
						<TextField
							size="sm"
							label="Password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							data-testid="test-login-password"
						/>
						{error && <Alert variant="error">{error}</Alert>}
						<Button
							type="submit"
							variant="primary"
							size="sm"
							disabled={submitting}
							data-testid="test-login-submit"
						>
							{submitting ? "Signing in…" : "Sign in"}
						</Button>
					</Stack>
				</form>
			</div>
		</PageShell>
	);
}
