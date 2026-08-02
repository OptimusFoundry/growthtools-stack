// Forms specimen — full variant matrices for every form component. Follows the
// same shape as specimens/Primitives.tsx: drive rows off each component's real
// props (read straight from its .tsx + .stories.tsx), prefer uncontrolled demos
// (defaultValue / defaultChecked), and only reach for local state where a prop
// is genuinely controlled (Stepper has no uncontrolled mode; Slider gets one
// controlled demo to mirror its story).

import { HelpCircle, Mail, Search, User } from "lucide-react";
import { useState } from "react";
import { Checkbox } from "../../components/forms/Checkbox/Checkbox";
import { FormField } from "../../components/forms/FormField/FormField";
import { FormHint } from "../../components/forms/FormHint/FormHint";
import { Input } from "../../components/forms/Input/Input";
import { Label } from "../../components/forms/Label/Label";
import { Radio } from "../../components/forms/Radio/Radio";
import { Select } from "../../components/forms/Select/Select";
import { Slider } from "../../components/forms/Slider/Slider";
import type { StepperSize } from "../../components/forms/Stepper/Stepper";
import { Stepper } from "../../components/forms/Stepper/Stepper";
import { Switch } from "../../components/forms/Switch/Switch";
import { TextArea } from "../../components/forms/TextArea/TextArea";
import { TextField } from "../../components/forms/TextField/TextField";
import { Badge } from "../../components/primitives/Badge/Badge";
import { Spec, SpecItem, SpecRow } from "../Spec";

const countries = [
	{ value: "us", label: "United States" },
	{ value: "uk", label: "United Kingdom" },
	{ value: "ca", label: "Canada" },
];

const countriesWithDisabled = [
	{ value: "us", label: "United States" },
	{ value: "uk", label: "United Kingdom", disabled: true },
	{ value: "ca", label: "Canada" },
];

// Stepper has no uncontrolled mode (value + onChange are required), so each
// demo cell owns a tiny piece of local state — mirrors Stepper.stories.tsx.
interface StepperDemoProps {
	initial: number;
	min?: number;
	max?: number;
	step?: number;
	size?: StepperSize;
	disabled?: boolean;
	ariaLabel: string;
}

function StepperDemo({
	initial,
	min,
	max,
	step,
	size,
	disabled,
	ariaLabel,
}: StepperDemoProps) {
	const [value, setValue] = useState(initial);
	return (
		<Stepper
			value={value}
			onChange={setValue}
			min={min}
			max={max}
			step={step}
			size={size}
			disabled={disabled}
			aria-label={ariaLabel}
		/>
	);
}

// One genuinely controlled Slider demo, matching the Controlled story.
function ControlledSliderDemo() {
	const [value, setValue] = useState(50);
	return (
		<Slider
			label="Controlled"
			value={value}
			onChange={(e) => setValue(Number(e.target.value))}
			showValue
		/>
	);
}

export function FormsSpecimens() {
	return (
		<>
			<Spec
				name="TextField"
				description="Labeled text input with helper text and error handling. Wraps Input with a Label and message slot."
			>
				<SpecRow label="Variants">
					<SpecItem label="default" grow>
						<TextField label="Email" placeholder="Enter your email" />
					</SpecItem>
					<SpecItem label="filled" grow>
						<TextField
							label="Email"
							placeholder="Enter your email"
							variant="filled"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Sizes">
					<SpecItem label="sm" grow>
						<TextField label="Small input" placeholder="Small" size="sm" />
					</SpecItem>
					<SpecItem label="md" grow>
						<TextField label="Medium input" placeholder="Medium" size="md" />
					</SpecItem>
					<SpecItem label="lg" grow>
						<TextField label="Large input" placeholder="Large" size="lg" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="required" grow>
						<TextField label="Full name" placeholder="John Doe" required />
					</SpecItem>
					<SpecItem label="helperText" grow>
						<TextField
							label="Username"
							placeholder="Enter username"
							helperText="Choose a unique username"
						/>
					</SpecItem>
					<SpecItem label="error" grow>
						<TextField
							label="Username"
							placeholder="Enter username"
							defaultValue="john"
							errorMessage="This username is already taken"
						/>
					</SpecItem>
					<SpecItem label="disabled" grow>
						<TextField
							label="Disabled field"
							placeholder="Cannot edit"
							disabled
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="leftElement" grow>
						<TextField
							label="Email"
							placeholder="Enter your email"
							leftElement={<Mail size={16} />}
						/>
					</SpecItem>
					<SpecItem label="rightElement" grow>
						<TextField
							label="Username"
							placeholder="Enter username"
							rightElement={<User size={16} />}
						/>
					</SpecItem>
					<SpecItem label="hideLabel" grow>
						<TextField
							label="Search"
							placeholder="Search..."
							hideLabel
							aria-label="Search"
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Input"
				description="The bare text input primitive — sizes, visual variants, icon slots, and validation states."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm" grow>
						<Input size="sm" placeholder="Small input" />
					</SpecItem>
					<SpecItem label="md" grow>
						<Input size="md" placeholder="Medium input" />
					</SpecItem>
					<SpecItem label="lg" grow>
						<Input size="lg" placeholder="Large input" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Variants">
					<SpecItem label="default" grow>
						<Input variant="default" placeholder="Default variant" />
					</SpecItem>
					<SpecItem label="filled" grow>
						<Input variant="filled" placeholder="Filled variant" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="error" grow>
						<Input isError placeholder="Invalid input" defaultValue="Invalid" />
					</SpecItem>
					<SpecItem label="disabled" grow>
						<Input
							disabled
							placeholder="Disabled input"
							defaultValue="Cannot edit"
						/>
					</SpecItem>
					<SpecItem label="fullWidth" grow>
						<Input isFullWidth placeholder="Full width input" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="leftElement" grow>
						<Input
							leftElement={<Search size="1em" />}
							placeholder="Search..."
						/>
					</SpecItem>
					<SpecItem label="rightElement" grow>
						<Input
							rightElement={<Mail size="1em" />}
							placeholder="Enter email"
							type="email"
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="TextArea"
				description="Multi-line text input with label, helper text, error state, and resize control."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm" grow>
						<TextArea label="Small" placeholder="Small textarea" size="sm" />
					</SpecItem>
					<SpecItem label="md" grow>
						<TextArea label="Medium" placeholder="Medium textarea" size="md" />
					</SpecItem>
					<SpecItem label="lg" grow>
						<TextArea label="Large" placeholder="Large textarea" size="lg" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Resize">
					<SpecItem label="none" grow>
						<TextArea
							label="No resize"
							placeholder="Cannot be resized"
							resize="none"
						/>
					</SpecItem>
					<SpecItem label="vertical" grow>
						<TextArea
							label="Vertical resize"
							placeholder="Can resize vertically"
							resize="vertical"
						/>
					</SpecItem>
					<SpecItem label="horizontal" grow>
						<TextArea
							label="Horizontal resize"
							placeholder="Can resize horizontally"
							resize="horizontal"
						/>
					</SpecItem>
					<SpecItem label="both" grow>
						<TextArea
							label="Both directions"
							placeholder="Can resize both ways"
							resize="both"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="required" grow>
						<TextArea
							label="Message"
							placeholder="Enter your message"
							required
						/>
					</SpecItem>
					<SpecItem label="helperText" grow>
						<TextArea
							label="Bio"
							placeholder="Tell us about yourself"
							helperText="Max 500 characters"
						/>
					</SpecItem>
					<SpecItem label="error" grow>
						<TextArea
							label="Description"
							defaultValue="Too short"
							errorMessage="Description must be at least 50 characters"
						/>
					</SpecItem>
					<SpecItem label="disabled" grow>
						<TextArea label="Disabled" placeholder="Cannot edit" disabled />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Select"
				description="Native select dropdown with label, helper text, error state, and per-option disabling."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm" grow>
						<Select
							label="Small"
							options={countries}
							placeholder="Select"
							size="sm"
						/>
					</SpecItem>
					<SpecItem label="md" grow>
						<Select
							label="Medium"
							options={countries}
							placeholder="Select"
							size="md"
						/>
					</SpecItem>
					<SpecItem label="lg" grow>
						<Select
							label="Large"
							options={countries}
							placeholder="Select"
							size="lg"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Variants">
					<SpecItem label="default" grow>
						<Select
							label="Default"
							options={countries}
							placeholder="Select"
							variant="default"
						/>
					</SpecItem>
					<SpecItem label="filled" grow>
						<Select
							label="Filled"
							options={countries}
							placeholder="Select"
							variant="filled"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="withValue" grow>
						<Select label="Country" options={countries} defaultValue="uk" />
					</SpecItem>
					<SpecItem label="helperText" grow>
						<Select
							label="Country"
							options={countries}
							placeholder="Select a country"
							helperText="Choose your country of residence"
						/>
					</SpecItem>
					<SpecItem label="error" grow>
						<Select
							label="Country"
							options={countries}
							placeholder="Select a country"
							errorMessage="Please select a country"
						/>
					</SpecItem>
					<SpecItem label="disabled" grow>
						<Select
							label="Country"
							options={countries}
							defaultValue="us"
							disabled
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="disabledOptions" grow>
						<Select
							label="Country"
							options={countriesWithDisabled}
							placeholder="Select a country"
						/>
					</SpecItem>
					<SpecItem label="fullWidth" grow>
						<Select
							label="Country"
							options={countries}
							placeholder="Select a country"
							fullWidth
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Checkbox"
				description="Boolean selection control with optional description text, three sizes, and validation states."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<Checkbox label="Small" size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<Checkbox label="Medium" size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<Checkbox label="Large" size="lg" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="default">
						<Checkbox label="Unchecked" />
					</SpecItem>
					<SpecItem label="checked">
						<Checkbox label="Checked" defaultChecked />
					</SpecItem>
					<SpecItem label="indeterminate">
						<Checkbox label="Select all" indeterminate />
					</SpecItem>
					<SpecItem label="error">
						<Checkbox label="Required field" isError />
					</SpecItem>
					<SpecItem label="disabled">
						<Checkbox label="Disabled" disabled />
					</SpecItem>
					<SpecItem label="disabledChecked">
						<Checkbox label="Disabled checked" disabled defaultChecked />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="withDescription" grow>
						<Checkbox
							label="Email notifications"
							description="Receive updates about your account via email"
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Radio"
				description="Single selection from a named group, in three sizes with description text and validation states."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<Radio name="size-sm" label="Small" size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<Radio name="size-md" label="Medium" size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<Radio name="size-lg" label="Large" size="lg" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="default">
						<Radio name="state-default" label="Option" />
					</SpecItem>
					<SpecItem label="checked">
						<Radio name="state-checked" label="Selected" defaultChecked />
					</SpecItem>
					<SpecItem label="error">
						<Radio name="state-error" label="Required field" isError />
					</SpecItem>
					<SpecItem label="disabled">
						<Radio name="state-disabled" label="Disabled" disabled />
					</SpecItem>
					<SpecItem label="disabledChecked">
						<Radio
							name="state-disabled-checked"
							label="Disabled selected"
							disabled
							defaultChecked
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options" column>
					<SpecItem label="group (withDescription)" grow>
						<Radio
							name="plan"
							value="free"
							label="Free"
							description="Basic features"
						/>
					</SpecItem>
					<SpecItem grow>
						<Radio
							name="plan"
							value="pro"
							label="Pro"
							description="$9/month"
							defaultChecked
						/>
					</SpecItem>
					<SpecItem grow>
						<Radio
							name="plan"
							value="enterprise"
							label="Enterprise"
							description="Custom pricing"
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Switch"
				description="On/off toggle control with optional description, label placement, and three sizes."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<Switch label="Small" size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<Switch label="Medium" size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<Switch label="Large" size="lg" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="default">
						<Switch label="Off" />
					</SpecItem>
					<SpecItem label="checked">
						<Switch label="On" defaultChecked />
					</SpecItem>
					<SpecItem label="disabled">
						<Switch label="Disabled" disabled />
					</SpecItem>
					<SpecItem label="disabledChecked">
						<Switch label="Disabled on" disabled defaultChecked />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="labelPosition=left">
						<Switch label="Dark mode" labelPosition="left" />
					</SpecItem>
					<SpecItem label="withDescription" grow>
						<Switch
							label="Notifications"
							description="Receive push notifications on your device"
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Slider"
				description="Range input with optional live value display, custom formatting, and three sizes."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm" grow>
						<Slider label="Small" size="sm" defaultValue={30} showValue />
					</SpecItem>
					<SpecItem label="md" grow>
						<Slider label="Medium" size="md" defaultValue={50} showValue />
					</SpecItem>
					<SpecItem label="lg" grow>
						<Slider label="Large" size="lg" defaultValue={70} showValue />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="default" grow>
						<Slider label="Volume" defaultValue={50} />
					</SpecItem>
					<SpecItem label="showValue" grow>
						<Slider label="Volume" defaultValue={75} showValue />
					</SpecItem>
					<SpecItem label="disabled" grow>
						<Slider label="Disabled" defaultValue={50} disabled />
					</SpecItem>
					<SpecItem label="controlled" grow>
						<ControlledSliderDemo />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="customRange + formatValue" grow>
						<Slider
							label="Temperature"
							min={-20}
							max={40}
							defaultValue={22}
							showValue
							formatValue={(v) => `${v}°C`}
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Stepper"
				description="Numeric [-] [value] [+] control clamped to a min/max range, in three sizes. Always controlled."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<StepperDemo initial={4} size="sm" ariaLabel="Small stepper" />
					</SpecItem>
					<SpecItem label="md">
						<StepperDemo initial={4} size="md" ariaLabel="Medium stepper" />
					</SpecItem>
					<SpecItem label="lg">
						<StepperDemo initial={4} size="lg" ariaLabel="Large stepper" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="default">
						<StepperDemo initial={0} ariaLabel="Quantity" />
					</SpecItem>
					<SpecItem label="withMinMax (1-10)">
						<StepperDemo
							initial={1}
							min={1}
							max={10}
							ariaLabel="Quantity (1-10)"
						/>
					</SpecItem>
					<SpecItem label="withStep (5)">
						<StepperDemo
							initial={0}
							step={5}
							min={0}
							max={100}
							ariaLabel="Progress (step 5)"
						/>
					</SpecItem>
					<SpecItem label="disabled">
						<StepperDemo initial={3} disabled ariaLabel="Disabled quantity" />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Label"
				description="Standalone form label with required marker, sub-text, badge, and trailing action slots."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<Label size="sm">Small label</Label>
					</SpecItem>
					<SpecItem label="md">
						<Label size="md">Medium label</Label>
					</SpecItem>
					<SpecItem label="lg">
						<Label size="lg">Large label</Label>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="required">
						<Label htmlFor="email" required>
							Email address
						</Label>
					</SpecItem>
					<SpecItem label="subText">
						<Label htmlFor="phone" subText="optional">
							Phone number
						</Label>
					</SpecItem>
					<SpecItem label="badge">
						<Label htmlFor="username" badge={<Badge size="sm">New</Badge>}>
							Username
						</Label>
					</SpecItem>
					<SpecItem label="action">
						<Label
							htmlFor="password"
							required
							action={<a href="#forgot">Forgot password?</a>}
						>
							Password
						</Label>
					</SpecItem>
					<SpecItem label="disabled">
						<Label disabled>Disabled label</Label>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="FormField"
				description="Layout wrapper that pairs a label, the field, and helper/error text — works with any form control."
			>
				<SpecRow label="Sizes">
					<SpecItem label="sm" grow>
						<FormField label="Small field" size="sm">
							<Input size="sm" placeholder="Small input" />
						</FormField>
					</SpecItem>
					<SpecItem label="md" grow>
						<FormField label="Medium field" size="md">
							<Input size="md" placeholder="Medium input" />
						</FormField>
					</SpecItem>
					<SpecItem label="lg" grow>
						<FormField label="Large field" size="lg">
							<Input size="lg" placeholder="Large input" />
						</FormField>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="required" grow>
						<FormField label="Full name" required>
							<Input placeholder="John Doe" />
						</FormField>
					</SpecItem>
					<SpecItem label="helperText" grow>
						<FormField
							label="Password"
							helperText="Must be at least 8 characters"
						>
							<Input type="password" placeholder="Enter password" />
						</FormField>
					</SpecItem>
					<SpecItem label="error" grow>
						<FormField
							label="Email"
							errorMessage="Please enter a valid email address"
						>
							<Input type="email" placeholder="you@tickuptoks.com" isError />
						</FormField>
					</SpecItem>
				</SpecRow>
				<SpecRow label="With inputs">
					<SpecItem label="withTextArea" grow>
						<FormField
							label="Description"
							helperText="Enter a brief description"
						>
							<TextArea placeholder="Enter description..." rows={4} />
						</FormField>
					</SpecItem>
					<SpecItem label="withSelect" grow>
						<FormField
							label="Country"
							helperText="Select your country of residence"
						>
							<Select options={countries} placeholder="Select a country" />
						</FormField>
					</SpecItem>
					<SpecItem label="withCheckbox" grow>
						<FormField>
							<Checkbox label="I agree to the terms and conditions" />
						</FormField>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="FormHint"
				description="Helper/error/success message line with an optional leading icon, used below form controls."
			>
				<SpecRow label="Variants">
					<SpecItem label="default" grow>
						<FormHint showIcon>
							Default hint text with helpful information.
						</FormHint>
					</SpecItem>
					<SpecItem label="error" grow>
						<FormHint variant="error" showIcon>
							Error message explaining what went wrong.
						</FormHint>
					</SpecItem>
					<SpecItem label="success" grow>
						<FormHint variant="success" showIcon>
							Success message confirming the action.
						</FormHint>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="noIcon" grow>
						<FormHint>Enter your email address to receive updates.</FormHint>
					</SpecItem>
					<SpecItem label="customIcon" grow>
						<FormHint icon={<HelpCircle size={14} />}>
							Need help? Contact support.
						</FormHint>
					</SpecItem>
				</SpecRow>
			</Spec>
		</>
	);
}
