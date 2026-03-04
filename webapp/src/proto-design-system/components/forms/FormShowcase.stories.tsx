import type { Meta, StoryObj } from "@storybook/react";
import { Eye, EyeOff, Link2, Mail } from "lucide-react";
import { useState } from "react";
import { Card, CardBody, CardFooter, CardHeader } from "../layout/Card";
import { Divider } from "../layout/Divider";
import { Grid } from "../layout/Grid";
import { Stack } from "../layout/Stack";
import { Avatar } from "../primitives/Avatar";
import { Badge } from "../primitives/Badge";
import { Button, Link } from "../primitives/Button";
import { Text } from "../primitives/Text";
import { Checkbox } from "./Checkbox";
import { FormHint } from "./FormHint";
import { Input } from "./Input";
import { Label } from "./Label";
import { Radio } from "./Radio";
import { Select } from "./Select";
import { Slider } from "./Slider";
import { Switch } from "./Switch";
import { TextArea } from "./TextArea";

const meta: Meta = {
	title: "Forms/Form Showcase",
	parameters: {
		layout: "centered",
	},
};

export default meta;
type Story = StoryObj;

/**
 * A comprehensive account settings form demonstrating thoughtful use of
 * form components, labels, hints, and validation states.
 */
export const AccountSettings: Story = {
	render: () => {
		const AccountSettingsForm = () => {
			const [showPassword, setShowPassword] = useState(false);
			const [emailNotifications, setEmailNotifications] = useState(true);
			const [marketingEmails, setMarketingEmails] = useState(false);
			const [visibility, setVisibility] = useState("public");
			const [fontSize, setFontSize] = useState(16);

			return (
				<div style={{ width: "100%", maxWidth: "640px" }}>
					<Stack gap="xl">
						{/* Account Information */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										Account Information
									</Text>
									<Text size="sm" color="muted">
										Manage your account details and login credentials
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="lg">
									{/* Email Field - Required with validation hint */}
									<Stack gap="sm">
										<Label htmlFor="email" required>
											Email address
										</Label>
										<Input
											id="email"
											type="email"
											placeholder="you@example.com"
											defaultValue="sarah@acme.com"
										/>
										<FormHint variant="success" showIcon>
											Email verified
										</FormHint>
									</Stack>

									{/* Username Field - With badge and availability check */}
									<Stack gap="sm">
										<Label
											htmlFor="username"
											required
											badge={
												<Badge size="sm" variant="primary">
													New
												</Badge>
											}
										>
											Username
										</Label>
										<Input
											id="username"
											placeholder="Choose a username"
											defaultValue="sarahchen"
										/>
										<FormHint showIcon>
											Your username will be visible to other users. Choose
											something memorable.
										</FormHint>
									</Stack>

									{/* Current Password - With action link */}
									<Stack gap="sm">
										<Label
											htmlFor="current-password"
											action={
												<Link href="#" size="sm">
													Forgot password?
												</Link>
											}
										>
											Current password
										</Label>
										<Input
											id="current-password"
											type={showPassword ? "text" : "password"}
											placeholder="Enter current password"
											rightElement={
												<button
													type="button"
													onClick={() => setShowPassword(!showPassword)}
													aria-label={
														showPassword ? "Hide password" : "Show password"
													}
													style={{
														background: "none",
														border: "none",
														cursor: "pointer",
														display: "flex",
														padding: 0,
													}}
												>
													{showPassword ? (
														<EyeOff size={18} />
													) : (
														<Eye size={18} />
													)}
												</button>
											}
										/>
									</Stack>

									{/* New Password - With requirements hint */}
									<Stack gap="sm">
										<Label htmlFor="new-password" subText="optional">
											New password
										</Label>
										<Input
											id="new-password"
											type="password"
											placeholder="Enter new password"
										/>
										<FormHint>
											Password must be at least 8 characters with one uppercase,
											one number, and one symbol.
										</FormHint>
									</Stack>
								</Stack>
							</CardBody>
						</Card>

						{/* Profile Information */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										Profile
									</Text>
									<Text size="sm" color="muted">
										Tell others about yourself
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="lg">
									{/* Full Name - Grid layout */}
									<Grid columns="2" gap="md">
										<Stack gap="sm">
											<Label htmlFor="first-name" required>
												First name
											</Label>
											<Input id="first-name" defaultValue="Sarah" />
										</Stack>
										<Stack gap="sm">
											<Label htmlFor="last-name" required>
												Last name
											</Label>
											<Input id="last-name" defaultValue="Chen" />
										</Stack>
									</Grid>

									{/* Display Name - Optional with hint */}
									<Stack gap="sm">
										<Label htmlFor="display-name" subText="optional">
											Display name
										</Label>
										<Input
											id="display-name"
											placeholder="How should we call you?"
										/>
										<FormHint>
											This will be shown instead of your full name throughout
											the app.
										</FormHint>
									</Stack>

									{/* Bio - TextArea */}
									<Stack gap="sm">
										<Label
											htmlFor="bio"
											subText="optional"
											action={
												<Text size="xs" color="muted">
													Max 280 characters
												</Text>
											}
										>
											Bio
										</Label>
										<TextArea
											id="bio"
											hideLabel
											placeholder="Write a short bio about yourself..."
											rows={3}
											fullWidth
										/>
									</Stack>

									{/* Website - With link icon */}
									<Stack gap="sm">
										<Label htmlFor="website" subText="optional">
											Website
										</Label>
										<Input
											id="website"
											type="url"
											placeholder="https://yoursite.com"
											leftElement={<Link2 size={16} />}
										/>
									</Stack>

									{/* Location & Timezone - Grid layout */}
									<Grid columns="2" gap="md">
										<Select
											label="Location"
											options={[
												{ value: "us", label: "United States" },
												{ value: "uk", label: "United Kingdom" },
												{ value: "ca", label: "Canada" },
												{ value: "au", label: "Australia" },
												{ value: "de", label: "Germany" },
												{ value: "fr", label: "France" },
											]}
											defaultValue="us"
											fullWidth
										/>
										<Select
											label="Timezone"
											options={[
												{ value: "pst", label: "Pacific Time (PT)" },
												{ value: "mst", label: "Mountain Time (MT)" },
												{ value: "cst", label: "Central Time (CT)" },
												{ value: "est", label: "Eastern Time (ET)" },
												{ value: "utc", label: "UTC" },
											]}
											defaultValue="pst"
											fullWidth
										/>
									</Grid>
								</Stack>
							</CardBody>
						</Card>

						{/* Notification Preferences */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										Notifications
									</Text>
									<Text size="sm" color="muted">
										Choose how and when you want to be notified
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="lg">
									{/* Email Notifications - Switch */}
									<Stack
										direction="row"
										justify="between"
										align="start"
										gap="md"
									>
										<Stack gap="xs">
											<Text weight="medium">Email notifications</Text>
											<FormHint>
												Receive email notifications for important updates and
												activity.
											</FormHint>
										</Stack>
										<Switch
											checked={emailNotifications}
											onChange={(e) => setEmailNotifications(e.target.checked)}
											aria-label="Email notifications"
										/>
									</Stack>

									{/* Marketing Emails - Switch */}
									<Stack
										direction="row"
										justify="between"
										align="start"
										gap="md"
									>
										<Stack gap="xs">
											<Text weight="medium">Marketing emails</Text>
											<FormHint>
												Receive tips, product updates, and occasional
												promotional content.
											</FormHint>
										</Stack>
										<Switch
											checked={marketingEmails}
											onChange={(e) => setMarketingEmails(e.target.checked)}
											aria-label="Marketing emails"
										/>
									</Stack>

									{/* Notification Types - Checkboxes */}
									<Stack gap="sm">
										<Label>Notify me about</Label>
										<Stack gap="sm">
											<Checkbox
												label="New messages"
												description="When someone sends you a message"
												defaultChecked
											/>
											<Checkbox
												label="Mentions"
												description="When someone mentions you in a comment"
												defaultChecked
											/>
											<Checkbox
												label="Task updates"
												description="When tasks you're assigned are updated"
											/>
											<Checkbox
												label="Weekly digest"
												description="A summary of your activity each week"
											/>
										</Stack>
									</Stack>
								</Stack>
							</CardBody>
						</Card>

						{/* Privacy & Visibility */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										Privacy
									</Text>
									<Text size="sm" color="muted">
										Control who can see your profile and activity
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="lg">
									{/* Profile Visibility - Radio Group */}
									<Stack gap="sm">
										<Label>Profile visibility</Label>
										<Stack gap="sm">
											<Radio
												name="visibility"
												value="public"
												label="Public"
												description="Anyone can view your profile"
												checked={visibility === "public"}
												onChange={(e) => setVisibility(e.target.value)}
											/>
											<Radio
												name="visibility"
												value="members"
												label="Members only"
												description="Only logged-in members can view your profile"
												checked={visibility === "members"}
												onChange={(e) => setVisibility(e.target.value)}
											/>
											<Radio
												name="visibility"
												value="private"
												label="Private"
												description="Only you can view your profile"
												checked={visibility === "private"}
												onChange={(e) => setVisibility(e.target.value)}
											/>
										</Stack>
									</Stack>

									{/* Activity Visibility */}
									<Stack gap="sm">
										<Label>Show my activity</Label>
										<Stack gap="sm">
											<Checkbox
												label="Show online status"
												description="Let others see when you're online"
												defaultChecked
											/>
											<Checkbox
												label="Show recent activity"
												description="Display your recent actions on your profile"
											/>
										</Stack>
									</Stack>
								</Stack>
							</CardBody>
						</Card>

						{/* Accessibility & Display */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										Accessibility
									</Text>
									<Text size="sm" color="muted">
										Customize your experience for better accessibility
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="lg">
									{/* Font Size - Slider */}
									<Stack gap="sm">
										<Label>Font size</Label>
										<Slider
											min={12}
											max={24}
											value={fontSize}
											onChange={(e) => setFontSize(Number(e.target.value))}
											showValue
											formatValue={(v) => `${v}px`}
											fullWidth
										/>
										<FormHint>
											Adjusts the base font size across the application.
										</FormHint>
									</Stack>

									{/* Other Accessibility Options */}
									<Stack gap="sm">
										<Checkbox
											label="Reduce motion"
											description="Minimize animations and transitions"
										/>
										<Checkbox
											label="High contrast mode"
											description="Increase color contrast for better visibility"
										/>
										<Checkbox
											label="Keyboard shortcuts"
											description="Enable keyboard navigation shortcuts"
											defaultChecked
										/>
									</Stack>
								</Stack>
							</CardBody>
							<CardFooter>
								<Stack direction="row" justify="end" gap="sm">
									<Button variant="ghost">Cancel</Button>
									<Button variant="primary">Save changes</Button>
								</Stack>
							</CardFooter>
						</Card>
					</Stack>
				</div>
			);
		};

		return <AccountSettingsForm />;
	},
};

/**
 * A signup form demonstrating validation states and progressive disclosure.
 */
export const SignupForm: Story = {
	render: () => {
		const SignupFormDemo = () => {
			const [acceptTerms, setAcceptTerms] = useState(false);
			const [emailError, setEmailError] = useState<string | null>(null);
			const [email, setEmail] = useState("");

			const validateEmail = (value: string) => {
				setEmail(value);
				if (!value) {
					setEmailError(null);
				} else if (!value.includes("@")) {
					setEmailError("Please enter a valid email address");
				} else if (value === "taken@example.com") {
					setEmailError("This email is already registered");
				} else {
					setEmailError(null);
				}
			};

			return (
				<Card variant="elevated" style={{ width: "100%", maxWidth: "420px" }}>
					<CardHeader>
						<Stack gap="sm" align="center">
							<Text as="h2" size="xl" weight="semibold" align="center">
								Create your account
							</Text>
							<Text color="muted" align="center">
								Get started with a free account
							</Text>
						</Stack>
					</CardHeader>
					<CardBody>
						<Stack gap="lg">
							{/* Email with validation */}
							<Stack gap="sm">
								<Label htmlFor="signup-email" required>
									Email address
								</Label>
								<Input
									id="signup-email"
									type="email"
									placeholder="you@company.com"
									value={email}
									onChange={(e) => validateEmail(e.target.value)}
									isError={!!emailError}
								/>
								{emailError ? (
									<FormHint variant="error" showIcon>
										{emailError}
									</FormHint>
								) : email && !emailError ? (
									<FormHint variant="success" showIcon>
										Email looks good!
									</FormHint>
								) : null}
							</Stack>

							{/* Password */}
							<Stack gap="sm">
								<Label htmlFor="signup-password" required>
									Password
								</Label>
								<Input
									id="signup-password"
									type="password"
									placeholder="Create a strong password"
								/>
								<FormHint showIcon>
									Use 8+ characters with a mix of letters, numbers & symbols
								</FormHint>
							</Stack>

							{/* Terms */}
							<Checkbox
								label="I agree to the Terms of Service and Privacy Policy"
								checked={acceptTerms}
								onChange={(e) => setAcceptTerms(e.target.checked)}
							/>

							{/* Submit */}
							<Button variant="primary" disabled={!acceptTerms} isFullWidth>
								Create account
							</Button>

							{/* Divider */}
							<Divider>or continue with</Divider>

							{/* Social Login */}
							<Grid columns="2" gap="sm">
								<Button variant="outline">Google</Button>
								<Button variant="outline">GitHub</Button>
							</Grid>
						</Stack>
					</CardBody>
					<CardFooter>
						<Text size="sm" color="muted" align="center">
							Already have an account? <Link href="#">Sign in</Link>
						</Text>
					</CardFooter>
				</Card>
			);
		};

		return <SignupFormDemo />;
	},
};

/**
 * A contact form with clear field states and validation.
 */
export const ContactForm: Story = {
	render: () => {
		const ContactFormDemo = () => {
			return (
				<Card variant="outlined" style={{ width: "100%", maxWidth: "500px" }}>
					<CardHeader>
						<Stack gap="xs">
							<Text as="h3" size="lg" weight="semibold">
								Get in touch
							</Text>
							<Text size="sm" color="muted">
								Have a question or feedback? We&apos;d love to hear from you.
							</Text>
						</Stack>
					</CardHeader>
					<CardBody>
						<Stack gap="lg">
							{/* Name Grid */}
							<Grid columns="2" gap="md">
								<Stack gap="sm">
									<Label htmlFor="contact-first" required>
										First name
									</Label>
									<Input id="contact-first" placeholder="John" />
								</Stack>
								<Stack gap="sm">
									<Label htmlFor="contact-last" required>
										Last name
									</Label>
									<Input id="contact-last" placeholder="Doe" />
								</Stack>
							</Grid>

							{/* Email */}
							<Stack gap="sm">
								<Label htmlFor="contact-email" required>
									Email
								</Label>
								<Input
									id="contact-email"
									type="email"
									placeholder="john@example.com"
								/>
							</Stack>

							{/* Subject */}
							<Select
								label="Subject"
								placeholder="Select a topic"
								options={[
									{ value: "general", label: "General inquiry" },
									{ value: "support", label: "Technical support" },
									{ value: "billing", label: "Billing question" },
									{ value: "partnership", label: "Partnership opportunity" },
									{ value: "feedback", label: "Product feedback" },
								]}
								fullWidth
							/>

							{/* Priority */}
							<Stack gap="sm">
								<Label>Priority</Label>
								<Stack direction="row" gap="md">
									<Radio name="priority" value="low" label="Low" />
									<Radio
										name="priority"
										value="normal"
										label="Normal"
										defaultChecked
									/>
									<Radio name="priority" value="high" label="High" />
								</Stack>
							</Stack>

							{/* Message */}
							<Stack gap="sm">
								<Label
									htmlFor="contact-message"
									required
									action={
										<Text size="xs" color="muted">
											Min 50 characters
										</Text>
									}
								>
									Message
								</Label>
								<TextArea
									id="contact-message"
									hideLabel
									placeholder="Tell us how we can help..."
									rows={5}
									fullWidth
								/>
							</Stack>

							{/* Attachment info */}
							<FormHint showIcon>
								You can attach files after submitting the initial message.
							</FormHint>
						</Stack>
					</CardBody>
					<CardFooter>
						<Stack
							direction="row"
							justify="between"
							align="center"
							style={{ width: "100%" }}
						>
							<Text size="sm" color="muted">
								We typically respond within 24 hours
							</Text>
							<Button variant="primary">Send message</Button>
						</Stack>
					</CardFooter>
				</Card>
			);
		};

		return <ContactFormDemo />;
	},
};

/**
 * A filter/search form for data tables or lists.
 */
export const FilterForm: Story = {
	render: () => {
		const FilterFormDemo = () => {
			const [priceRange, setPriceRange] = useState([0, 500]);

			return (
				<Card variant="outlined" style={{ width: "100%", maxWidth: "280px" }}>
					<CardHeader>
						<Stack direction="row" justify="between" align="center">
							<Text as="h4" size="md" weight="semibold">
								Filters
							</Text>
							<Button variant="ghost" size="sm">
								Clear all
							</Button>
						</Stack>
					</CardHeader>
					<CardBody>
						<Stack gap="lg">
							{/* Search */}
							<Stack gap="sm">
								<Label htmlFor="filter-search">Search</Label>
								<Input id="filter-search" placeholder="Search products..." />
							</Stack>

							{/* Category */}
							<Select
								label="Category"
								placeholder="All categories"
								options={[
									{ value: "all", label: "All categories" },
									{ value: "electronics", label: "Electronics" },
									{ value: "clothing", label: "Clothing" },
									{ value: "home", label: "Home & Garden" },
									{ value: "sports", label: "Sports" },
								]}
								fullWidth
							/>

							{/* Price Range */}
							<Stack gap="sm">
								<Label>Price range</Label>
								<Slider
									min={0}
									max={1000}
									value={priceRange[1]}
									onChange={(e) => setPriceRange([0, Number(e.target.value)])}
									showValue
									formatValue={(v) => `$0 - $${v}`}
									fullWidth
								/>
							</Stack>

							{/* Availability */}
							<Stack gap="sm">
								<Label>Availability</Label>
								<Stack gap="sm">
									<Checkbox label="In stock" defaultChecked />
									<Checkbox label="Pre-order" />
									<Checkbox label="Out of stock" />
								</Stack>
							</Stack>

							{/* Rating */}
							<Stack gap="sm">
								<Label>Minimum rating</Label>
								<Stack gap="xs">
									<Radio name="rating" value="4" label="4 stars & up" />
									<Radio
										name="rating"
										value="3"
										label="3 stars & up"
										defaultChecked
									/>
									<Radio name="rating" value="2" label="2 stars & up" />
									<Radio name="rating" value="1" label="Any rating" />
								</Stack>
							</Stack>

							{/* Shipping */}
							<Stack direction="row" justify="between" align="center">
								<Text size="sm" weight="medium">
									Free shipping only
								</Text>
								<Switch aria-label="Free shipping only" />
							</Stack>
						</Stack>
					</CardBody>
					<CardFooter>
						<Button variant="primary" isFullWidth>
							Apply filters
						</Button>
					</CardFooter>
				</Card>
			);
		};

		return <FilterFormDemo />;
	},
};

/**
 * A campaign settings form demonstrating complex configuration UI
 * with pro feature badges, email templates, and danger zone.
 */
export const CampaignSettings: Story = {
	render: () => {
		const CampaignSettingsForm = () => {
			const [emailVerification, setEmailVerification] = useState(true);
			const [duplicateHandling, setDuplicateHandling] = useState("block");

			// Email template component for reuse
			const EmailTemplateCard = ({
				title,
				badge,
				badgeVariant,
				description,
				subject,
			}: {
				title: string;
				badge: string;
				badgeVariant: "success" | "warning";
				description: string;
				subject: string;
			}) => (
				<Card variant="outlined">
					<CardBody>
						<Stack gap="sm">
							<Stack direction="row" gap="sm" align="start">
								<Avatar
									size="sm"
									variant="rounded"
									fallback={
										<Mail size={16} style={{ color: "var(--color-primary)" }} />
									}
									style={{ backgroundColor: "var(--color-primary-subtle)" }}
								/>
								<Stack gap="xs" style={{ flex: 1 }}>
									<Stack direction="row" gap="sm" align="center">
										<Text weight="semibold">{title}</Text>
										<Badge size="sm" variant={badgeVariant}>
											{badge}
										</Badge>
									</Stack>
									<Text size="sm" color="muted">
										{description}
									</Text>
								</Stack>
							</Stack>
							<div
								style={{
									padding: "var(--space-3)",
									backgroundColor: "var(--color-base-200)",
									borderRadius: "var(--radius-md)",
								}}
							>
								<Text size="sm">
									<Text as="span" color="muted">
										Subject:{" "}
									</Text>
									<Text
										as="span"
										style={{ fontFamily: "var(--font-family-mono)" }}
									>
										{subject}
									</Text>
								</Text>
							</div>
							<Stack direction="row" justify="end">
								<Button variant="ghost" size="sm">
									Customize
								</Button>
							</Stack>
						</Stack>
					</CardBody>
				</Card>
			);

			// Pro feature row component
			const ProFeatureRow = ({
				label,
				description,
				disabled = true,
			}: {
				label: string;
				description: string;
				disabled?: boolean;
			}) => (
				<Stack gap="xs">
					<Stack direction="row" gap="sm" align="center">
						<Checkbox label={label} disabled={disabled} />
						<Badge size="sm" variant="default">
							Pro
						</Badge>
					</Stack>
					<div style={{ paddingLeft: "var(--space-6)" }}>
						<FormHint>{description}</FormHint>
						<Link href="#" size="sm">
							Upgrade
						</Link>
					</div>
				</Stack>
			);

			return (
				<div style={{ width: "100%", maxWidth: "640px" }}>
					<Stack gap="lg">
						{/* General Settings */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										General
									</Text>
									<Text size="sm" color="muted">
										Basic information about your campaign
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="md">
									<Stack gap="sm">
										<Label htmlFor="campaign-name" required>
											Campaign Name
										</Label>
										<Input
											id="campaign-name"
											defaultValue="Product Launch 2026"
										/>
									</Stack>
									<Stack gap="sm">
										<Label htmlFor="campaign-description">Description</Label>
										<Input
											id="campaign-description"
											defaultValue="Launching camp.xyz"
										/>
									</Stack>
								</Stack>
							</CardBody>
						</Card>

						{/* Signup Options */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										Signup Options
									</Text>
									<Text size="sm" color="muted">
										Configure how users sign up for your waitlist
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="lg">
									{/* Email Verification */}
									<Stack gap="xs">
										<Stack direction="row" gap="sm" align="center">
											<Checkbox
												label="Require email verification"
												checked={emailVerification}
												onChange={(e) => setEmailVerification(e.target.checked)}
											/>
											<Badge size="sm" variant="default">
												Pro
											</Badge>
										</Stack>
										<div style={{ paddingLeft: "var(--space-6)" }}>
											<FormHint>
												Users must verify their email before being added to
												waitlist
											</FormHint>
											<Link href="#" size="sm">
												Upgrade
											</Link>
										</div>
									</Stack>

									{/* Duplicate Handling */}
									<Stack gap="sm">
										<Label htmlFor="duplicate-handling">
											Duplicate Email Handling
										</Label>
										<Select
											id="duplicate-handling"
											value={duplicateHandling}
											onChange={(e) => setDuplicateHandling(e.target.value)}
											options={[
												{
													value: "block",
													label: "Block - Reject duplicate signups",
												},
												{ value: "allow", label: "Allow - Accept all signups" },
												{
													value: "update",
													label: "Update - Update existing entry",
												},
											]}
											fullWidth
										/>
									</Stack>

									{/* CAPTCHA */}
									<ProFeatureRow
										label="Enable CAPTCHA"
										description="Protect your waitlist from bots and spam submissions"
									/>
								</Stack>
							</CardBody>
						</Card>

						{/* Email Settings */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										Email Settings
									</Text>
									<Text size="sm" color="muted">
										Configure the emails sent to users when they join your
										waitlist
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="md">
									<EmailTemplateCard
										title="Verification Email"
										badge="Custom"
										badgeVariant="success"
										description="Sent when users sign up to verify their email address"
										subject="Verify your email - You're #{{position}} on the {{campaign_name}} waitlist"
									/>
									<EmailTemplateCard
										title="Welcome Email"
										badge="Default"
										badgeVariant="warning"
										description="Sent after verification or immediately if verification is disabled"
										subject="Welcome to the {{campaign_name}} waitlist!"
									/>
								</Stack>
							</CardBody>
						</Card>

						{/* Growth Features */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										Growth Features
									</Text>
									<Text size="sm" color="muted">
										Enable viral growth and engagement features
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="md">
									<ProFeatureRow
										label="Enable referral system"
										description="Allow users to refer others and track viral growth"
									/>
									<ProFeatureRow
										label="Enable reward system"
										description="Reward users for reaching referral milestones"
									/>
								</Stack>
							</CardBody>
						</Card>

						{/* Conversion Tracking */}
						<Card variant="outlined">
							<CardHeader>
								<Stack gap="xs">
									<Text as="h3" size="lg" weight="semibold">
										Conversion Tracking
									</Text>
									<Text size="sm" color="muted">
										Add tracking pixels to fire when users complete signup
									</Text>
								</Stack>
							</CardHeader>
							<CardBody>
								<Stack gap="md">
									<Stack gap="sm">
										<Stack direction="row" gap="sm" align="center">
											<Label htmlFor="tracking-integration">
												Add Tracking Integration
											</Label>
											<Badge size="sm" variant="default">
												Pro
											</Badge>
											<Link href="#" size="sm">
												Upgrade
											</Link>
										</Stack>
										<Select
											id="tracking-integration"
											placeholder="Select a tracking platform..."
											options={[
												{ value: "ga4", label: "Google Analytics 4" },
												{ value: "fb", label: "Facebook Pixel" },
												{ value: "gtm", label: "Google Tag Manager" },
												{ value: "segment", label: "Segment" },
											]}
											disabled
											fullWidth
										/>
										<FormHint>
											No tracking integrations configured. Add one above to
											track conversions.
										</FormHint>
									</Stack>
								</Stack>
							</CardBody>
						</Card>

						{/* Action Buttons */}
						<Stack direction="row" justify="end" gap="sm">
							<Button variant="ghost">Cancel</Button>
							<Button variant="primary">Save Changes</Button>
						</Stack>

						{/* Danger Zone */}
						<Stack gap="sm">
							<Text as="h4" size="md" weight="semibold" color="error">
								Danger Zone
							</Text>
							<Card
								variant="outlined"
								style={{
									borderColor: "var(--color-error)",
									backgroundColor: "var(--color-error-subtle)",
								}}
							>
								<CardBody>
									<Stack
										direction="row"
										justify="between"
										align="center"
										gap="md"
									>
										<Stack gap="xs">
											<Text weight="semibold">End Campaign</Text>
											<Text size="sm" color="muted">
												Once ended, the campaign cannot be reactivated. All data
												will be preserved.
											</Text>
										</Stack>
										<Button variant="destructive" size="sm">
											End Campaign
										</Button>
									</Stack>
								</CardBody>
							</Card>
						</Stack>
					</Stack>
				</div>
			);
		};

		return <CampaignSettingsForm />;
	},
};
