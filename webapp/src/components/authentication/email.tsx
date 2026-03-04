import React, { useEffect, useReducer } from "react";
import { useSubmitLogin } from "@/hooks/useSubmitLogin";
import { useBannerCenter } from "@/proto-design-system/components/feedback/BannerCenter";
import { Input } from "@/proto-design-system/components/forms/Input";
import { Button } from "@/proto-design-system/components/primitives/Button";
import "./email.scss";

type EmailFormErrors = {
	email?: string;
	password?: string;
	[key: string]: string | undefined;
};
type EmailFormState = {
	email: string;
	password: string;
	errors: EmailFormErrors;
};
// Define the initial state for the form
const initialState: EmailFormState = {
	email: "",
	password: "",
	errors: {} as EmailFormErrors,
};

// Define enum for EmailFormAction
enum EmailFormAction {
	SET_FIELD = "SET_FIELD",
	SET_ERROR = "SET_ERROR",
	SUBMIT_FORM = "SUBMIT_FORM",
	RESET_FORM = "RESET_FORM",
}
// Define reducer actions using the enum
type Action =
	| { type: EmailFormAction.SET_FIELD; field: string; value: string }
	| { type: EmailFormAction.SET_ERROR; field: string; error: string }
	| { type: EmailFormAction.SUBMIT_FORM }
	| { type: EmailFormAction.RESET_FORM };

// Reducer function to manage form state
function formReducer(state: EmailFormState, action: Action) {
	switch (action.type) {
		case EmailFormAction.SET_FIELD:
			return {
				...state,
				[action.field]: action.value,
				errors: {
					...state.errors,
					[action.field]: "", // Clear error when the field changes
				},
			};
		case EmailFormAction.SET_ERROR:
			return {
				...state,
				errors: {
					...state.errors,
					[action.field]: action.error,
				},
			};
		case EmailFormAction.RESET_FORM:
			return initialState; // Reset form state
		default:
			return state;
	}
}

// Email/Password login form component using useReducer
export default function EmailSignIn() {
	const [state, dispatch] = useReducer(formReducer, initialState);
	const { submitLogin, data, error, loading } = useSubmitLogin();
	const { addBanner } = useBannerCenter();

	useEffect(() => {
		if (data) {
			// Save token to local storage
			localStorage.setItem("token", data.token);
			// Redirect to home page using nextjs router
			window.location.href = "/";
		}
	}, [data]);

	useEffect(() => {
		if (error) {
			addBanner({
				type: "error",
				title: "Login failed",
				description: error.message,
				dismissible: true,
			});
		}
	}, [error, addBanner]);

	// Handle form submission
	async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const email = state.email.trim();
		const password = state.password.trim();

		let valid = true;
		const errors: EmailFormErrors = {
			email: "",
			password: "",
		};

		if (!email) {
			errors.email = "Email is required.";
			valid = false;
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			(errors.email = "Invalid email format."), (valid = false);
		}

		if (!password) {
			(errors.password = "Password is required."), (valid = false);
		}

		// Set errors based on validation results
		Object.keys(errors).forEach((field) => {
			const error = errors[field] ?? "";
			if (error) {
				dispatch({
					type: EmailFormAction.SET_ERROR,
					field,
					error: error,
				});
			}
		});

		if (valid) {
			dispatch({ type: EmailFormAction.SUBMIT_FORM });
			console.log("Form submitted:", { email, password });
			try {
				await submitLogin(email, password);
			} catch (error) {
				console.error("Login failed", error);
				dispatch({ type: EmailFormAction.RESET_FORM });
			}
		}
	}

	return (
		<form className={"email-login-form"} onSubmit={handleLogin}>
			<div className={"form-item"}>
				<label htmlFor="email">Email</label>
				<Input
					id="email"
					name="email"
					type="text"
					onChange={(e) =>
						dispatch({
							type: EmailFormAction.SET_FIELD,
							field: "email",
							value: e.target.value,
						})
					}
					isError={!!state.errors.email}
					formNoValidate={true}
				/>
			</div>
			<div className={"form-item"}>
				<label htmlFor="password">Password</label>
				<Input
					id="password"
					name="password"
					type="password"
					onChange={(e) =>
						dispatch({
							type: EmailFormAction.SET_FIELD,
							field: "password",
							value: e.target.value,
						})
					}
					isError={!!state.errors.password}
				/>
			</div>
			<Button type="submit" disabled={loading}>
				{loading ? "Signing in..." : "Sign in"}
			</Button>
		</form>
	);
}
