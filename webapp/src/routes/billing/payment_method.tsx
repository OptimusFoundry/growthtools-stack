import { CardElement, Elements } from "@stripe/react-stripe-js";
import {
	loadStripe,
	StripeCardElementOptions,
	StripeElementsOptions,
} from "@stripe/stripe-js";
import { createFileRoute } from "@tanstack/react-router";
import { useCreatePaymentMethodUpdateIntent } from "@/hooks/useCreatePaymentMethodUpdateIntent";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";

// import "./page.scss"

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

const UpdatePaymentMethod = () => {
	const { handlePaymentUpdate, loading, error } =
		useCreatePaymentMethodUpdateIntent();

	if (loading) {
		return <Spinner />;
	}

	if (error) {
		return <div>{error}</div>;
	}

	const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
		style: {
			base: {
				fontFamily: '"Inter", Helvetica, sans-serif',
				fontSmoothing: "antialiased",
				fontSize: "16px",
				backgroundColor: "#f9fafb",
				padding: "20px",
				"::placeholder": {
					color: "#aab7c4",
				},
			},
			invalid: {
				color: "#fa755a",
				iconColor: "#fa755a",
			},
		},
	};

	return (
		<div>
			<div className={"update-payment-element"}>
				<h3>Update Payment Method</h3>
				<div className={"card-element"}>
					<CardElement options={CARD_ELEMENT_OPTIONS} />
				</div>
				{/*<AddressElement options={CARD_ELEMENT_OPTIONS}/>*/}
				<Button onClick={handlePaymentUpdate}>Update Card</Button>
			</div>
		</div>
	);
};

function Page() {
	const CARD_ELEMENT_OPTIONS: StripeElementsOptions = {
		appearance: {
			variables: {
				borderRadius: "4px",
				colorBackground: "red",
			},
		},
	};
	return (
		<Elements stripe={stripePromise} options={CARD_ELEMENT_OPTIONS}>
			<UpdatePaymentMethod />
		</Elements>
	);
}

export const Route = createFileRoute("/billing/payment_method")({
	component: RouteComponent,
});

function RouteComponent() {
	return <Page />;
}
