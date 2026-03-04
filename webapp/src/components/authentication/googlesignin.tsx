import { LinkButton } from "@/proto-design-system/components/primitives/Button";

export default function GoogleSignIn() {
	//TODO: This is process env vars are undefined on client side.
	const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=${import.meta.env.VITE_GOOGLE_CLIENT_ID}&redirect_uri=${import.meta.env.VITE_GOOGLE_REDIRECT_URL}&scope=openid%20profile%20email`;

	return (
		<LinkButton
			variant="primary"
			leftIcon={
				<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
				</svg>
			}
			href={googleAuthUrl}
		>
			Sign in with Google
		</LinkButton>
	);
}
