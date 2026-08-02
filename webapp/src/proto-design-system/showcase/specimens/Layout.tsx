// Layout specimen — full variant matrices for the layout components. Mirrors
// Primitives.tsx: shared <Spec>/<SpecRow>/<SpecItem> framework, rows driven off
// real variant/size/option props (read each component's .tsx + .stories.tsx),
// wide/stacked demos use SpecRow's `column` prop, and filler content is always
// a real design-system component (Card, Text, Badge) — never a raw styled div.

import { Plus } from "lucide-react";
import { useState } from "react";
import { AspectRatio } from "../../components/layout/AspectRatio/AspectRatio";
import {
	Card,
	CardBody,
	CardFooter,
	CardHeader,
} from "../../components/layout/Card/Card";
import { Container } from "../../components/layout/Container/Container";
import { Divider } from "../../components/layout/Divider/Divider";
import { Grid } from "../../components/layout/Grid/Grid";
import { GridItem } from "../../components/layout/GridItem/GridItem";
import { PageHero } from "../../components/layout/PageHero/PageHero";
import { PageShell } from "../../components/layout/PageShell/PageShell";
import {
	PageTransition,
	type PageTransitionType,
} from "../../components/layout/PageTransition/PageTransition";
import { SectionHeader } from "../../components/layout/SectionHeader/SectionHeader";
import { Stack } from "../../components/layout/Stack/Stack";
import { Badge } from "../../components/primitives/Badge/Badge";
import { Button } from "../../components/primitives/Button/Button";
import { Text } from "../../components/primitives/Text/Text";
import { Spec, SpecItem, SpecRow } from "../Spec";

// Small interactive demo for PageTransition — pageKey must change to trigger
// the animation, so this needs local state (the prop is effectively controlled).
function PageTransitionDemo({ type }: { type: PageTransitionType }) {
	const [active, setActive] = useState<"home" | "about">("home");

	return (
		<Stack gap="sm">
			<Stack direction="row" gap="xs">
				<Button
					size="sm"
					variant={active === "home" ? "primary" : "outline"}
					onClick={() => setActive("home")}
				>
					Home
				</Button>
				<Button
					size="sm"
					variant={active === "about" ? "primary" : "outline"}
					onClick={() => setActive("about")}
				>
					About
				</Button>
			</Stack>
			<PageTransition pageKey={active} type={type}>
				<Card variant="outlined" padding="md">
					<Stack gap="xs">
						<Text weight="semibold">
							{active === "home" ? "Home" : "About"}
						</Text>
						<Text size="sm" color="muted">
							{active === "home"
								? "Welcome to the home page."
								: "Learn more about what we do."}
						</Text>
					</Stack>
				</Card>
			</PageTransition>
		</Stack>
	);
}

export function LayoutSpecimens() {
	return (
		<>
			<Spec
				name="AspectRatio"
				description="Maintains a fixed width-to-height ratio for media or placeholder content. Four presets plus arbitrary numeric ratios."
			>
				<SpecRow label="Presets">
					<SpecItem label="square — 1:1" grow>
						<AspectRatio ratio="square">
							<Card variant="filled" padding="md">
								<Text size="sm" weight="medium">
									1:1
								</Text>
							</Card>
						</AspectRatio>
					</SpecItem>
					<SpecItem label="video — 16:9" grow>
						<AspectRatio ratio="video">
							<Card variant="filled" padding="md">
								<Text size="sm" weight="medium">
									16:9
								</Text>
							</Card>
						</AspectRatio>
					</SpecItem>
					<SpecItem label="portrait — 3:4" grow>
						<AspectRatio ratio="portrait">
							<Card variant="filled" padding="md">
								<Text size="sm" weight="medium">
									3:4
								</Text>
							</Card>
						</AspectRatio>
					</SpecItem>
					<SpecItem label="wide — 21:9" grow>
						<AspectRatio ratio="wide">
							<Card variant="filled" padding="md">
								<Text size="sm" weight="medium">
									21:9
								</Text>
							</Card>
						</AspectRatio>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Custom ratio">
					<SpecItem label="ratio={4 / 3}" grow>
						<AspectRatio ratio={4 / 3}>
							<Card variant="filled" padding="md">
								<Text size="sm" weight="medium">
									4:3
								</Text>
							</Card>
						</AspectRatio>
					</SpecItem>
					<SpecItem label="ratio={2 / 1}" grow>
						<AspectRatio ratio={2 / 1}>
							<Card variant="filled" padding="md">
								<Text size="sm" weight="medium">
									2:1
								</Text>
							</Card>
						</AspectRatio>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Card"
				description="Surface container for grouping related content. Four visual variants, four padding scales, plus interactive affordance and header/body/footer composition."
			>
				<SpecRow label="Variants">
					<SpecItem label="elevated" grow>
						<Card variant="elevated" padding="md">
							<Text weight="semibold">Elevated</Text>
							<Text size="sm" color="muted">
								Shadow, lifts on hover.
							</Text>
						</Card>
					</SpecItem>
					<SpecItem label="outlined" grow>
						<Card variant="outlined" padding="md">
							<Text weight="semibold">Outlined</Text>
							<Text size="sm" color="muted">
								Bordered, no shadow.
							</Text>
						</Card>
					</SpecItem>
					<SpecItem label="filled" grow>
						<Card variant="filled" padding="md">
							<Text weight="semibold">Filled</Text>
							<Text size="sm" color="muted">
								Tinted background, no border.
							</Text>
						</Card>
					</SpecItem>
					<SpecItem label="spec" grow>
						<Card variant="spec" padding="none">
							<CardHeader
								name={
									<>
										Tabs <em>and more</em>
									</>
								}
								meta="line · pill · enclosed"
							/>
							<CardBody>
								<Text size="sm" color="muted">
									Editorial header for labelled component blocks.
								</Text>
							</CardBody>
						</Card>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Padding">
					<SpecItem label="none" grow>
						<Card variant="outlined" padding="none">
							<Text size="sm">No padding</Text>
						</Card>
					</SpecItem>
					<SpecItem label="sm" grow>
						<Card variant="outlined" padding="sm">
							<Text size="sm">Small padding</Text>
						</Card>
					</SpecItem>
					<SpecItem label="md" grow>
						<Card variant="outlined" padding="md">
							<Text size="sm">Medium padding</Text>
						</Card>
					</SpecItem>
					<SpecItem label="lg" grow>
						<Card variant="outlined" padding="lg">
							<Text size="sm">Large padding</Text>
						</Card>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="interactive" grow>
						<Card variant="outlined" interactive onClick={() => undefined}>
							<Text weight="medium">Interactive card</Text>
							<Text size="sm" color="muted">
								Hover or press for affordance.
							</Text>
						</Card>
					</SpecItem>
					<SpecItem label="header + body + footer" grow>
						<Card variant="outlined" padding="none">
							<CardHeader>
								<Text weight="semibold">Plan details</Text>
							</CardHeader>
							<CardBody>
								<Text size="sm" color="muted">
									Manage your subscription and billing.
								</Text>
							</CardBody>
							<CardFooter>
								<Button size="sm" variant="primary">
									Manage
								</Button>
							</CardFooter>
						</Card>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Container"
				description="Constrains content to a max-width column with optional centering and horizontal padding. Five preset sizes."
			>
				<SpecRow label="Sizes" column>
					<SpecItem label="sm — 640px">
						<Container size="sm">
							<Card variant="filled" padding="md">
								<Text size="sm">sm container</Text>
							</Card>
						</Container>
					</SpecItem>
					<SpecItem label="md — 768px">
						<Container size="md">
							<Card variant="filled" padding="md">
								<Text size="sm">md container</Text>
							</Card>
						</Container>
					</SpecItem>
					<SpecItem label="lg — 1024px (default)">
						<Container size="lg">
							<Card variant="filled" padding="md">
								<Text size="sm">lg container</Text>
							</Card>
						</Container>
					</SpecItem>
					<SpecItem label="xl — 1280px">
						<Container size="xl">
							<Card variant="filled" padding="md">
								<Text size="sm">xl container</Text>
							</Card>
						</Container>
					</SpecItem>
					<SpecItem label="full">
						<Container size="full">
							<Card variant="filled" padding="md">
								<Text size="sm">full container</Text>
							</Card>
						</Container>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options" column>
					<SpecItem label="centered={false}">
						<Container size="md" centered={false}>
							<Card variant="filled" padding="md">
								<Text size="sm">Not centered — flush left</Text>
							</Card>
						</Container>
					</SpecItem>
					<SpecItem label="padded={false}">
						<Container size="md" padded={false}>
							<Card variant="filled" padding="md">
								<Text size="sm">No horizontal padding</Text>
							</Card>
						</Container>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Divider"
				description="Separates content. Horizontal or vertical orientation, three line styles, optional inline label."
			>
				<SpecRow label="Variants">
					<SpecItem label="solid" grow>
						<Divider variant="solid" />
					</SpecItem>
					<SpecItem label="dashed" grow>
						<Divider variant="dashed" />
					</SpecItem>
					<SpecItem label="dotted" grow>
						<Divider variant="dotted" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Orientation">
					<SpecItem label="vertical, between text">
						<Stack direction="row" align="center" gap="sm">
							<Text size="sm">Left</Text>
							<Divider orientation="vertical" />
							<Text size="sm">Right</Text>
						</Stack>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Labels">
					<SpecItem label="short label" grow>
						<Divider>OR</Divider>
					</SpecItem>
					<SpecItem label="long label" grow>
						<Divider>Continue with email</Divider>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Grid"
				description="CSS grid layout primitive. Fixed or responsive column counts, independent row/column gaps, and an auto-fit mode."
			>
				<SpecRow label="Columns" column>
					<SpecItem label="columns=2">
						<Grid columns="2" gap="md">
							{["Item 1", "Item 2", "Item 3", "Item 4"].map((label) => (
								<Card key={label} variant="filled" padding="sm">
									<Text size="sm">{label}</Text>
								</Card>
							))}
						</Grid>
					</SpecItem>
					<SpecItem label="columns=3">
						<Grid columns="3" gap="md">
							{["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6"].map(
								(label) => (
									<Card key={label} variant="filled" padding="sm">
										<Text size="sm">{label}</Text>
									</Card>
								),
							)}
						</Grid>
					</SpecItem>
					<SpecItem label="columns=auto (auto-fit)">
						<Grid columns="auto" gap="md">
							{["Auto 1", "Auto 2", "Auto 3", "Auto 4", "Auto 5"].map(
								(label) => (
									<Card key={label} variant="filled" padding="sm">
										<Text size="sm">{label}</Text>
									</Card>
								),
							)}
						</Grid>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Gap" column>
					<SpecItem label="gap=sm">
						<Grid columns="3" gap="sm">
							{["1", "2", "3"].map((label) => (
								<Card key={label} variant="filled" padding="sm">
									<Text size="sm">Item {label}</Text>
								</Card>
							))}
						</Grid>
					</SpecItem>
					<SpecItem label="gap=xl">
						<Grid columns="3" gap="xl">
							{["1", "2", "3"].map((label) => (
								<Card key={label} variant="filled" padding="sm">
									<Text size="sm">Item {label}</Text>
								</Card>
							))}
						</Grid>
					</SpecItem>
					<SpecItem label="rowGap=xl, columnGap=sm">
						<Grid columns="3" rowGap="xl" columnGap="sm">
							{["1", "2", "3", "4", "5", "6"].map((label) => (
								<Card key={label} variant="filled" padding="sm">
									<Text size="sm">Item {label}</Text>
								</Card>
							))}
						</Grid>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="GridItem"
				description="Column-span container for use inside a 12-column Grid or PageShell. Supports responsive span and 1-indexed start offsets."
			>
				<SpecRow label="Span" column>
					<SpecItem label="span 6 + 6">
						<Grid columns="12" gap="md">
							<GridItem span={6}>
								<Card variant="filled" padding="sm">
									<Text size="sm">span 6</Text>
								</Card>
							</GridItem>
							<GridItem span={6}>
								<Card variant="filled" padding="sm">
									<Text size="sm">span 6</Text>
								</Card>
							</GridItem>
						</Grid>
					</SpecItem>
					<SpecItem label="span 4 + 4 + 4">
						<Grid columns="12" gap="md">
							{["A", "B", "C"].map((label) => (
								<GridItem key={label} span={4}>
									<Card variant="filled" padding="sm">
										<Text size="sm">span 4 ({label})</Text>
									</Card>
								</GridItem>
							))}
						</Grid>
					</SpecItem>
					<SpecItem label="span 'full'">
						<Grid columns="12" gap="md">
							<GridItem span="full">
								<Card variant="filled" padding="sm">
									<Text size="sm">span full (1 / -1)</Text>
								</Card>
							</GridItem>
						</Grid>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Start (offset)" column>
					<SpecItem label="span 6, start 4">
						<Grid columns="12" gap="md">
							<GridItem span={6} start={4}>
								<Card variant="filled" padding="sm">
									<Text size="sm">columns 4 → 9</Text>
								</Card>
							</GridItem>
						</Grid>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="PageHero"
				description="Page-level heading block — eyebrow, title, description, and a right-aligned action slot. Styled via --page-hero-* tokens."
			>
				<SpecRow label="Content" column>
					<SpecItem label="eyebrow + title + description + actions" grow>
						<PageHero
							eyebrow="Campaigns · 4 total"
							title="Campaigns"
							description="Manage your waitlist campaigns and track signup conversions across all your products."
							actions={<Button leftIcon={<Plus />}>New Campaign</Button>}
						/>
					</SpecItem>
					<SpecItem label="title with <em> accent" grow>
						<PageHero
							eyebrow="Launch · 12 leads"
							title={
								<>
									Early Access <em>Waitlist</em>
								</>
							}
							description="Collect and verify leads before your product goes live."
							actions={<Button variant="outline">Add Signup Form</Button>}
						/>
					</SpecItem>
					<SpecItem label="title only" grow>
						<PageHero title="Settings" />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="PageShell"
				description="Standard product-page container. 12-column Swiss grid with page-level padding tokens; direct children that aren't GridItem are auto-wrapped in <GridItem span={{ base: 12 }}>."
			>
				<SpecRow label="Variants" column>
					<SpecItem label="default — two columns" grow>
						<PageShell>
							<PageHero
								eyebrow="Campaigns · 4 total"
								title="Campaigns"
								actions={<Button size="sm">New Campaign</Button>}
							/>
							<GridItem span={{ base: 12, md: 6 }}>
								<Card variant="filled" padding="md">
									<Text weight="medium">Left column</Text>
									<Text size="sm" color="muted">
										span 12 → 6
									</Text>
								</Card>
							</GridItem>
							<GridItem span={{ base: 12, md: 6 }}>
								<Card variant="filled" padding="md">
									<Text weight="medium">Right column</Text>
									<Text size="sm" color="muted">
										span 12 → 6
									</Text>
								</Card>
							</GridItem>
						</PageShell>
					</SpecItem>
					<SpecItem label="narrow — 1024px max" grow>
						<PageShell variant="narrow">
							<SectionHeader
								eyebrow="ACCOUNT"
								title="Settings"
								description="Update your profile and preferences."
							/>
							<Card variant="outlined" padding="lg">
								<Text size="sm" color="muted">
									Narrow variant — for forms, settings, and auth-adjacent pages.
								</Text>
							</Card>
						</PageShell>
					</SpecItem>
					<SpecItem label="full — no max-width" grow>
						<PageShell variant="full">
							<Card variant="filled" padding="lg">
								<Text weight="medium">Full-bleed surface</Text>
								<Text size="sm" color="muted">
									No max-width — for full-bleed builder surfaces.
								</Text>
							</Card>
						</PageShell>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="PageTransition"
				description="Animates content swaps when `pageKey` changes. Four transition types, built on motion/react's AnimatePresence."
			>
				<SpecRow label="Types" column>
					<SpecItem label="fade" grow>
						<PageTransitionDemo type="fade" />
					</SpecItem>
					<SpecItem label="slide" grow>
						<PageTransitionDemo type="slide" />
					</SpecItem>
					<SpecItem label="slideUp" grow>
						<PageTransitionDemo type="slideUp" />
					</SpecItem>
					<SpecItem label="scale" grow>
						<PageTransitionDemo type="scale" />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="SectionHeader"
				description="Eyebrow + title + description + actions block for sub-page sections. Two size scales and an optional heading-level override."
			>
				<SpecRow label="Content" column>
					<SpecItem label="title only" grow>
						<SectionHeader title="Campaign Performance" />
					</SpecItem>
					<SpecItem label="with eyebrow" grow>
						<SectionHeader
							eyebrow="OVERVIEW · 4 TOTAL"
							title="Campaign Performance"
						/>
					</SpecItem>
					<SpecItem label="with description" grow>
						<SectionHeader
							eyebrow="ANALYTICS"
							title="Signups over time"
							description="Visualize how your campaign is growing day by day."
						/>
					</SpecItem>
					<SpecItem label="with actions" grow>
						<SectionHeader
							eyebrow="CAMPAIGNS · 4 ACTIVE"
							title="Your campaigns"
							actions={<Button size="sm">New campaign</Button>}
						/>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Sizes" column>
					<SpecItem label="md (default)" grow>
						<SectionHeader
							eyebrow="SECTION"
							title="Section header at md size"
							description="16px title — the default size for most sections."
						/>
					</SpecItem>
					<SpecItem label="sm" grow>
						<SectionHeader
							eyebrow="SECTION"
							title="Section header at sm size"
							description="15px title — use inside denser UI regions."
							size="sm"
						/>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Stack"
				description="Flexbox layout primitive with consistent, token-driven spacing. Responsive direction, alignment, gap, and wrap."
			>
				<SpecRow label="Direction">
					<SpecItem label="column (default)">
						<Stack gap="sm">
							<Badge variant="primary">Item 1</Badge>
							<Badge variant="primary">Item 2</Badge>
							<Badge variant="primary">Item 3</Badge>
						</Stack>
					</SpecItem>
					<SpecItem label="row">
						<Stack direction="row" gap="sm">
							<Badge variant="primary">Item 1</Badge>
							<Badge variant="primary">Item 2</Badge>
							<Badge variant="primary">Item 3</Badge>
						</Stack>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Alignment">
					<SpecItem label="align=center">
						<Stack direction="row" align="center" gap="sm">
							<Badge variant="secondary" size="sm">
								Short
							</Badge>
							<Badge variant="secondary" size="lg">
								Tall label
							</Badge>
							<Badge variant="secondary" size="md">
								Medium
							</Badge>
						</Stack>
					</SpecItem>
					<SpecItem label="justify=between" grow>
						<Stack direction="row" justify="between" gap="sm">
							<Badge variant="outline">Left</Badge>
							<Badge variant="outline">Right</Badge>
						</Stack>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Wrap">
					<SpecItem label="wrap, narrow row" grow>
						<Stack direction="row" wrap gap="sm">
							{["Tag 1", "Tag 2", "Tag 3", "Tag 4", "Tag 5", "Tag 6"].map(
								(label) => (
									<Badge key={label} variant="outline">
										{label}
									</Badge>
								),
							)}
						</Stack>
					</SpecItem>
				</SpecRow>
			</Spec>
		</>
	);
}
