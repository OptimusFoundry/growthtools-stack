import { Card, Stack, Text } from "@optimusfoundry/quiet";
import {
	EmbeddedCheckout,
	EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import styles from "./checkout.module.scss";

// Load stripe outside of component to avoid recreating Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutFormProps {
	clientSecret: string;
}

const CustomCheckout = ({ clientSecret }: CheckoutFormProps) => {
	return (
		<div className={styles.wrapper}>
			<Card>
				<Stack gap="sm">
					<Text as="h1" size="xl" weight="semibold">
						Complete Your Payment
					</Text>
					<EmbeddedCheckoutProvider
						stripe={stripePromise}
						options={{ clientSecret }}
					>
						<EmbeddedCheckout />
					</EmbeddedCheckoutProvider>
				</Stack>
			</Card>
		</div>
	);
};

export default CustomCheckout;
