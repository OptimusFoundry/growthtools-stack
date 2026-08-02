// Feedback specimen — full variant matrices for the feedback components. Mirrors
// the structure of specimens/Primitives.tsx: the shared <Spec>/<SpecRow>/<SpecItem>
// framework, rows driven off each component's real variant/state props (read from
// the component's .tsx + .stories.tsx), uncontrolled demos except where a prop
// (like BannerCenter's hook) requires local state.

import { Bell } from "lucide-react";
import { Alert } from "../../components/feedback/Alert/Alert";
import { Banner } from "../../components/feedback/Banner/Banner";
import {
	BannerCenterProvider,
	useBannerCenter,
} from "../../components/feedback/BannerCenter/BannerCenter";
import { Progress } from "../../components/feedback/Progress/Progress";
import { Toast } from "../../components/feedback/Toast/Toast";
import { Stack } from "../../components/layout/Stack/Stack";
import { Button } from "../../components/primitives/Button/Button";
import { Spec, SpecItem, SpecRow } from "../Spec";

// BannerCenter is a provider + hook, not a renderable component on its own — the
// controls below call useBannerCenter().addBanner(...) from inside a
// BannerCenterProvider, and the provider renders the resulting stack in place.
function BannerCenterDemo() {
	const { addBanner, clearDismissible, clearAll } = useBannerCenter();

	return (
		<Stack gap="sm">
			<Stack direction="row" wrap gap="sm">
				<Button
					size="sm"
					onClick={() =>
						addBanner({
							type: "info",
							title: "New update available",
							description: "Version 2.0 is now ready to install.",
							action: (
								<Button size="sm" variant="ghost">
									Update now
								</Button>
							),
						})
					}
				>
					Add info
				</Button>
				<Button
					size="sm"
					onClick={() =>
						addBanner({
							type: "success",
							title: "Payment successful",
							description: "Your transaction has been completed.",
						})
					}
				>
					Add success
				</Button>
				<Button
					size="sm"
					onClick={() =>
						addBanner({
							type: "warning",
							title: "Storage almost full",
							description: "You have used 90% of your storage quota.",
						})
					}
				>
					Add warning
				</Button>
				<Button
					size="sm"
					onClick={() =>
						addBanner({
							type: "error",
							title: "Connection lost",
							description: "Unable to connect to the server.",
						})
					}
				>
					Add error
				</Button>
				<Button
					size="sm"
					onClick={() =>
						addBanner({
							type: "feature",
							title: "Try our new feature",
							description: "AI-powered suggestions are now available.",
						})
					}
				>
					Add feature
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={() =>
						addBanner({
							type: "warning",
							variant: "filled",
							title: "Maintenance scheduled",
							description: "System will be down for maintenance at 2:00 AM.",
							dismissible: false,
						})
					}
				>
					Add non-dismissible
				</Button>
			</Stack>
			<Stack direction="row" wrap gap="sm">
				<Button size="sm" variant="outline" onClick={clearDismissible}>
					Clear dismissible
				</Button>
				<Button size="sm" variant="destructive" onClick={clearAll}>
					Clear all
				</Button>
			</Stack>
		</Stack>
	);
}

export function FeedbackSpecimens() {
	return (
		<>
			<Spec
				name="Alert"
				description="Inline message for contextual page or form feedback. Four variants, with optional title, icon, and dismiss control."
			>
				<SpecRow label="Variants">
					<SpecItem label="info" grow>
						<Alert variant="info" title="Information">
							This is an informational message for the user.
						</Alert>
					</SpecItem>
					<SpecItem label="success" grow>
						<Alert variant="success" title="Success">
							Your changes have been saved successfully.
						</Alert>
					</SpecItem>
					<SpecItem label="warning" grow>
						<Alert variant="warning" title="Warning">
							Please review your input before proceeding.
						</Alert>
					</SpecItem>
					<SpecItem label="error" grow>
						<Alert variant="error" title="Error">
							There was a problem processing your request.
						</Alert>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="withoutTitle" grow>
						<Alert variant="info">This is an alert without a title.</Alert>
					</SpecItem>
					<SpecItem label="withoutIcon" grow>
						<Alert variant="success" title="No icon" icon={false}>
							This alert has no icon.
						</Alert>
					</SpecItem>
					<SpecItem label="customIcon" grow>
						<Alert variant="info" title="Notification" customIcon={<Bell />}>
							You have new notifications.
						</Alert>
					</SpecItem>
					<SpecItem label="dismissible" grow>
						<Alert variant="warning" title="Dismissible alert" dismissible>
							Click the X button to dismiss this alert.
						</Alert>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Banner"
				description="Full-width, page-level notification. Five types, four visual treatments, optional action and dismiss control."
			>
				<SpecRow label="Types" column>
					<SpecItem label="info">
						<Banner
							type="info"
							title="Info banner"
							description="This is an informational message"
						/>
					</SpecItem>
					<SpecItem label="success">
						<Banner
							type="success"
							title="Success!"
							description="Your changes have been saved"
						/>
					</SpecItem>
					<SpecItem label="warning">
						<Banner
							type="warning"
							title="Warning"
							description="This action cannot be undone"
						/>
					</SpecItem>
					<SpecItem label="error">
						<Banner
							type="error"
							title="Error"
							description="Something went wrong"
						/>
					</SpecItem>
					<SpecItem label="feature">
						<Banner
							type="feature"
							title="New feature"
							description="Check out our latest update"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Variants" column>
					<SpecItem label="filled">
						<Banner
							type="info"
							variant="filled"
							title="Filled variant"
							description="Solid background, inverted text"
						/>
					</SpecItem>
					<SpecItem label="light">
						<Banner
							type="info"
							variant="light"
							title="Light variant"
							description="Tinted background at 20% opacity"
						/>
					</SpecItem>
					<SpecItem label="lighter">
						<Banner
							type="info"
							variant="lighter"
							title="Lighter variant"
							description="Tinted background, token-driven"
						/>
					</SpecItem>
					<SpecItem label="stroke">
						<Banner
							type="info"
							variant="stroke"
							title="Stroke variant"
							description="Surface background with a bottom border"
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options" column>
					<SpecItem label="withAction">
						<Banner
							type="feature"
							variant="light"
							title="Upgrade to Pro"
							description="Get access to exclusive features"
							action={
								<Button size="sm" variant="ghost">
									Upgrade now
								</Button>
							}
						/>
					</SpecItem>
					<SpecItem label="titleOnly">
						<Banner
							type="success"
							title="Your profile has been updated successfully"
						/>
					</SpecItem>
					<SpecItem label="nonDismissible">
						<Banner
							type="warning"
							title="Maintenance scheduled"
							description="The system will be unavailable on Sunday from 2-4 AM"
							dismissible={false}
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="BannerCenter"
				description="Provider + hook for orchestrating stacked, dismissible page banners with non-dismissible system notices pinned beneath them."
			>
				<SpecRow label="Demo" column>
					<SpecItem label="useBannerCenter().addBanner(...)" grow>
						<BannerCenterProvider>
							<BannerCenterDemo />
						</BannerCenterProvider>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Progress"
				description="Linear progress indicator for determinate completion and indeterminate loading. Three sizes, four color variants."
			>
				<SpecRow label="Sizes" column>
					<SpecItem label="sm" grow>
						<Progress value={60} size="sm" />
					</SpecItem>
					<SpecItem label="md" grow>
						<Progress value={60} size="md" />
					</SpecItem>
					<SpecItem label="lg" grow>
						<Progress value={60} size="lg" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Variants" column>
					<SpecItem label="default" grow>
						<Progress value={25} variant="default" showLabel />
					</SpecItem>
					<SpecItem label="success" grow>
						<Progress value={100} variant="success" showLabel />
					</SpecItem>
					<SpecItem label="warning" grow>
						<Progress value={80} variant="warning" showLabel />
					</SpecItem>
					<SpecItem label="error" grow>
						<Progress value={25} variant="error" showLabel />
					</SpecItem>
				</SpecRow>
				<SpecRow label="States" column>
					<SpecItem label="empty" grow>
						<Progress value={0} showLabel />
					</SpecItem>
					<SpecItem label="complete" grow>
						<Progress value={100} showLabel />
					</SpecItem>
					<SpecItem label="indeterminate" grow>
						<Progress value={0} indeterminate aria-label="Uploading" />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Toast"
				description="Transient, self-contained notification card. Four variants, plus title, action, and close affordances."
			>
				<SpecRow label="Variants">
					<SpecItem label="default" grow>
						<Toast title="Notification">
							This is a default toast notification.
						</Toast>
					</SpecItem>
					<SpecItem label="success" grow>
						<Toast variant="success" title="Success">
							Your changes have been saved.
						</Toast>
					</SpecItem>
					<SpecItem label="warning" grow>
						<Toast variant="warning" title="Warning">
							Your session is about to expire.
						</Toast>
					</SpecItem>
					<SpecItem label="error" grow>
						<Toast variant="error" title="Error">
							Failed to save changes. Please try again.
						</Toast>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="withoutTitle" grow>
						<Toast>This is a toast without a title.</Toast>
					</SpecItem>
					<SpecItem label="notClosable" grow>
						<Toast title="Processing" closable={false}>
							Please wait while we process your request...
						</Toast>
					</SpecItem>
					<SpecItem label="withAction" grow>
						<Toast
							title="File deleted"
							action={
								<Button size="sm" variant="ghost">
									Undo
								</Button>
							}
						>
							The file has been moved to trash.
						</Toast>
					</SpecItem>
				</SpecRow>
			</Spec>
		</>
	);
}
