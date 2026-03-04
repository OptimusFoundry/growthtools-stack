import {
	EmbeddedCheckout,
	EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import "./checkout.scss";

// Load stripe outside of component to avoid recreating Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutFormProps {
	clientSecret: string;
}

const CustomCheckout = ({ clientSecret }: CheckoutFormProps) => {
	return (
		<div style={{ width: "100%", maxWidth: "800px" }}>
			<div className="checkout-container">
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
