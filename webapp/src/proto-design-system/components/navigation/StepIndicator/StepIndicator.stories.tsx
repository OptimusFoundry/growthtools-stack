import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { StepIndicator } from "./StepIndicator";

const meta: Meta<typeof StepIndicator> = {
	title: "Navigation/StepIndicator",
	component: StepIndicator,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	argTypes: {
		orientation: {
			control: "radio",
			options: ["horizontal", "vertical"],
		},
		size: {
			control: "radio",
			options: ["sm", "md", "lg"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof StepIndicator>;

const basicSteps = [
	{ id: "1", label: "Account" },
	{ id: "2", label: "Profile" },
	{ id: "3", label: "Settings" },
	{ id: "4", label: "Complete" },
];

export const Default: Story = {
	args: {
		steps: basicSteps,
		currentStep: 1,
	},
};

export const FirstStep: Story = {
	args: {
		steps: basicSteps,
		currentStep: 0,
	},
};

export const MiddleStep: Story = {
	args: {
		steps: basicSteps,
		currentStep: 2,
	},
};

export const Completed: Story = {
	args: {
		steps: basicSteps,
		currentStep: 4,
	},
};

export const WithDescriptions: Story = {
	args: {
		steps: [
			{ id: "1", label: "Account", description: "Create your account" },
			{ id: "2", label: "Profile", description: "Add your information" },
			{ id: "3", label: "Settings", description: "Configure preferences" },
			{ id: "4", label: "Complete", description: "Finish setup" },
		],
		currentStep: 1,
	},
};

export const Vertical: Story = {
	args: {
		steps: [
			{
				id: "1",
				label: "Order Placed",
				description: "Your order has been received",
			},
			{
				id: "2",
				label: "Processing",
				description: "We are preparing your order",
			},
			{ id: "3", label: "Shipped", description: "Your order is on its way" },
			{
				id: "4",
				label: "Delivered",
				description: "Package delivered to your address",
			},
		],
		currentStep: 2,
		orientation: "vertical",
	},
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
			<div>
				<p style={{ marginBottom: "16px", fontWeight: 500 }}>Small</p>
				<StepIndicator steps={basicSteps} currentStep={1} size="sm" />
			</div>
			<div>
				<p style={{ marginBottom: "16px", fontWeight: 500 }}>Medium</p>
				<StepIndicator steps={basicSteps} currentStep={1} size="md" />
			</div>
			<div>
				<p style={{ marginBottom: "16px", fontWeight: 500 }}>Large</p>
				<StepIndicator steps={basicSteps} currentStep={1} size="lg" />
			</div>
		</div>
	),
};

export const WithError: Story = {
	args: {
		steps: [
			{ id: "1", label: "Account", status: "completed" },
			{ id: "2", label: "Profile", status: "completed" },
			{ id: "3", label: "Payment", status: "error" },
			{ id: "4", label: "Complete" },
		],
	},
};

export const Interactive: Story = {
	render: function InteractiveExample() {
		const [currentStep, setCurrentStep] = useState(0);

		return (
			<div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
				<StepIndicator
					steps={basicSteps}
					currentStep={currentStep}
					onStepClick={(index) => setCurrentStep(index)}
				/>
				<div style={{ display: "flex", gap: "8px" }}>
					<button
						type="button"
						onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
						disabled={currentStep === 0}
					>
						Previous
					</button>
					<button
						type="button"
						onClick={() =>
							setCurrentStep((prev) =>
								Math.min(basicSteps.length - 1, prev + 1),
							)
						}
						disabled={currentStep === basicSteps.length - 1}
					>
						Next
					</button>
				</div>
				<p>Current step: {currentStep + 1}</p>
			</div>
		);
	},
};

export const CheckoutFlow: Story = {
	args: {
		steps: [
			{ id: "cart", label: "Cart", description: "Review your items" },
			{ id: "shipping", label: "Shipping", description: "Delivery address" },
			{ id: "payment", label: "Payment", description: "Payment method" },
			{ id: "review", label: "Review", description: "Confirm order" },
		],
		currentStep: 2,
		size: "lg",
	},
};
