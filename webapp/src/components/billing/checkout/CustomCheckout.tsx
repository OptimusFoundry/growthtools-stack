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
		<div className={styles["checkout-wrapper"]}>
			<div className={styles["checkout-container"]}>
				<h2>Complete Your Payment</h2>
				<EmbeddedCheckoutProvider
					stripe={stripePromise}
					options={{ clientSecret }}
				>
					<EmbeddedCheckout />
				</EmbeddedCheckoutProvider>
			</div>
		</div>
	);
};

export default CustomCheckout;
