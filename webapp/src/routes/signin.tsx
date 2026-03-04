// /signin page at root for TanStack Router
import { createFileRoute } from "@tanstack/react-router";
import Login from "@/components/authentication/login";
import "./signin.scss";

function SignInPage() {
	return (
		<div className="login-page">
			<div className="centered-container">
				<h6>Welcome</h6>
				<Login />
			</div>
		</div>
	);
}

export const Route = createFileRoute("/signin")({
	component: SignInPage,
});
