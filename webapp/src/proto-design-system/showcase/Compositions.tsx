// Showcase-only "in context" compositions: real components assembled into
// believable product surfaces, proving the kit composes — not just renders in
// isolation. Imported solely by UIKit.stories.tsx (tree-shaken from the app).

import {
	Activity,
	ArrowUpRight,
	KeyRound,
	Lock,
	Mail,
	TrendingUp,
	Users,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { StatCard } from "../components/data/StatCard/StatCard";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../components/data/Table/Table";
import { Progress } from "../components/feedback/Progress/Progress";
import { Toast } from "../components/feedback/Toast/Toast";
import { Checkbox } from "../components/forms/Checkbox/Checkbox";
import { Select } from "../components/forms/Select/Select";
import { Slider } from "../components/forms/Slider/Slider";
import { Switch } from "../components/forms/Switch/Switch";
import { TextField } from "../components/forms/TextField/TextField";
import { Card } from "../components/layout/Card/Card";
import { Divider } from "../components/layout/Divider/Divider";
import { Avatar } from "../components/primitives/Avatar/Avatar";
import { Badge } from "../components/primitives/Badge/Badge";
import { Button } from "../components/primitives/Button/Button";
import { Text } from "../components/primitives/Text/Text";
import styles from "./Compositions.module.scss";
import type { LabSize } from "./SizeToggle";

interface PanelProps {
	caption: string;
	children: ReactNode;
	wide?: boolean;
}

function Panel({ caption, children, wide }: PanelProps) {
	return (
		<figure className={styles.panel} data-wide={wide || undefined}>
			<figcaption className={styles.caption}>{caption}</figcaption>
			{children}
		</figure>
	);
}

function AnalyticsPanel({ size }: { size: LabSize }) {
	return (
		<Card variant="elevated" padding="lg">
			<div className={styles.cardHead}>
				<div>
					<Text size="lg" weight="semibold">
						Revenue overview
					</Text>
					<Text size="sm" color="muted">
						Last 30 days
					</Text>
				</div>
				<Badge size={size} variant="success" dot>
					Live
				</Badge>
			</div>

			<div className={styles.statRow}>
				<StatCard
					label="MRR"
					value="$48.2k"
					trend="up"
					trendValue="+12%"
					icon={<TrendingUp />}
				/>
				<StatCard
					label="Active users"
					value="2,350"
					trend="up"
					trendValue="+8%"
					icon={<Users />}
				/>
				<StatCard
					label="Churn"
					value="1.4%"
					trend="down"
					trendValue="-0.3%"
					icon={<Activity />}
				/>
			</div>

			<div className={styles.progressBlock}>
				<div className={styles.progressLabel}>
					<Text size="sm" color="muted">
						Quarterly goal
					</Text>
					<Text size="sm" weight="medium">
						72%
					</Text>
				</div>
				<Progress size={size} value={72} aria-label="Quarterly goal" />
			</div>

			<Table size={size}>
				<TableHeader>
					<TableRow>
						<TableHead>Customer</TableHead>
						<TableHead>Plan</TableHead>
						<TableHead>MRR</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<TableRow>
						<TableCell>Acme Inc.</TableCell>
						<TableCell>
							<Badge size={size} variant="primary">
								Scale
							</Badge>
						</TableCell>
						<TableCell>$1,200</TableCell>
					</TableRow>
					<TableRow>
						<TableCell>Globex</TableCell>
						<TableCell>
							<Badge size={size}>Growth</Badge>
						</TableCell>
						<TableCell>$540</TableCell>
					</TableRow>
					<TableRow>
						<TableCell>Soylent</TableCell>
						<TableCell>
							<Badge size={size} variant="outline">
								Starter
							</Badge>
						</TableCell>
						<TableCell>$120</TableCell>
					</TableRow>
				</TableBody>
			</Table>

			<div className={styles.upgrade}>
				<div className={styles.upgradeText}>
					<div className={styles.upgradeTitle}>
						<Badge size={size} variant="accent">
							Pro
						</Badge>
						<Text size="sm" weight="semibold">
							Unlock revenue forecasting
						</Text>
					</div>
					<Text size="sm" color="muted">
						Upgrade to Pro for predictive analytics and CSV exports.
					</Text>
				</div>
				<Button size={size} variant="accent" rightIcon={<ArrowUpRight />}>
					Upgrade
				</Button>
			</div>
		</Card>
	);
}

function AuthPanel({ size }: { size: LabSize }) {
	return (
		<Card variant="elevated" padding="lg">
			<div className={styles.authHead}>
				<Text as="h3" size="xl" weight="semibold">
					Welcome back
				</Text>
				<Text size="sm" color="muted">
					Sign in to your workspace to continue.
				</Text>
			</div>

			<div className={styles.fieldStack}>
				<TextField
					size={size}
					label="Email"
					type="email"
					placeholder="you@company.com"
					leftElement={<Mail />}
				/>
				<TextField
					size={size}
					label="Password"
					type="password"
					placeholder="••••••••"
					leftElement={<Lock />}
				/>
				<div className={styles.authRow}>
					<Checkbox size={size} label="Remember me" />
					<Button variant="ghost" size={size}>
						Forgot password?
					</Button>
				</div>
				<Button variant="primary" size={size} isFullWidth>
					Sign in
				</Button>
				<Divider>or</Divider>
				<Button
					variant="outline"
					size={size}
					isFullWidth
					leftIcon={<KeyRound />}
				>
					Continue with SSO
				</Button>
			</div>
		</Card>
	);
}

function SettingsPanel({ size }: { size: LabSize }) {
	const [volume, setVolume] = useState("60");
	return (
		<Card variant="elevated" padding="lg">
			<div className={styles.cardHead}>
				<div className={styles.teamHead}>
					<Avatar size={size} initials="JD" />
					<div>
						<Text size="md" weight="semibold">
							Jamie Doe
						</Text>
						<Text size="sm" color="muted">
							Workspace settings
						</Text>
					</div>
				</div>
				<Button variant="ghost" size={size} rightIcon={<ArrowUpRight />}>
					Profile
				</Button>
			</div>

			<div className={styles.fieldStack}>
				<Switch
					size={size}
					label="Email notifications"
					description="Product updates and weekly digests"
					defaultChecked
				/>
				<Switch
					size={size}
					label="Two-factor authentication"
					description="Require a code at every sign-in"
				/>
				<Select
					size={size}
					label="Digest frequency"
					defaultValue="weekly"
					options={[
						{ value: "daily", label: "Daily" },
						{ value: "weekly", label: "Weekly" },
						{ value: "monthly", label: "Monthly" },
					]}
				/>
				<Slider
					size={size}
					label="Notification volume"
					value={volume}
					onChange={(e) => setVolume(e.target.value)}
				/>
			</div>

			<Toast variant="success" title="Settings saved">
				Your preferences are up to date.
			</Toast>

			<div className={styles.actions}>
				<Button variant="ghost" size={size}>
					Cancel
				</Button>
				<Button variant="primary" size={size}>
					Save changes
				</Button>
			</div>
		</Card>
	);
}

export function Compositions({ size = "md" }: { size?: LabSize }) {
	return (
		<div className={styles.grid}>
			<Panel caption="Analytics dashboard" wide>
				<AnalyticsPanel size={size} />
			</Panel>
			<Panel caption="Authentication">
				<AuthPanel size={size} />
			</Panel>
			<Panel caption="Account settings">
				<SettingsPanel size={size} />
			</Panel>
		</div>
	);
}
