import { useState } from "react";
import { getErrorMessage, hasProperty, isCodedError } from "@/utils";

interface ErrorResponse {
	code: string;
	message: string;
}

interface LoginData {
	token: string;
}

const isLoginData = (data: unknown): data is LoginData => {
	return hasProperty(data, "token") && typeof data.token === "string";
};

interface SubmitLoginOperation {
	submitLogin: (email: string, password: string) => Promise<void>;
	loading: boolean;
	error: ErrorResponse | null;
	data: LoginData | null;
}

export const useSubmitLogin = (): SubmitLoginOperation => {
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<ErrorResponse | null>(null);
	const [data, setData] = useState<LoginData | null>(null);

	const submitLogin = async (
		email: string,
		password: string,
	): Promise<void> => {
		setLoading(true);
		setError(null);

		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/api/auth/login/email`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ email, password }),
				},
			);

			if (!response.ok) {
				const errorData: unknown = await response.json();
				if (isCodedError(errorData)) {
					throw new Error(errorData.message || "Login failed");
				}
				throw new Error("Unknown response received");
			}

			const responseData: unknown = await response.json();
			if (isLoginData(responseData)) {
				setData(responseData);
			}
		} catch (error: unknown) {
			console.error("Login failed", error);
			setError({
				code: "unknown_error",
				message: getErrorMessage(error),
			});
		} finally {
			setLoading(false);
		}
	};

	return { submitLogin, loading, error, data };
};
