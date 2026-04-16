import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fetcher } from "@/api/client";
import { TextField } from "@/proto-design-system/components/forms/TextField/TextField";
import { Button } from "@/proto-design-system/components/primitives/Button/Button";
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
		<div className={styles.page}>
			<form
				className={styles.form}
				onSubmit={handleSubmit}
				aria-label="Test login"
			>
				<h1 className={styles.title}>Test Login</h1>
				<TextField
					label="Email"
					type="email"
					autoComplete="username"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					data-testid="test-login-email"
				/>
				<TextField
					label="Password"
					type="password"
					autoComplete="current-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					data-testid="test-login-password"
				/>
				{error && (
					<p className={styles.error} role="alert">
						{error}
					</p>
				)}
				<Button
					type="submit"
					variant="primary"
					disabled={submitting}
					data-testid="test-login-submit"
				>
					{submitting ? "Signing in…" : "Sign in"}
				</Button>
			</form>
		</div>
	);
}
