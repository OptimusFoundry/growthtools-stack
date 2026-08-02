// Primitives specimen — full variant matrices for the primitive components.
// This file is the REFERENCE PATTERN for the other category specimens: use the
// shared <Spec>/<SpecRow>/<SpecItem> framework, drive rows off the component's
// real variant/size/state props (read the component's .types.ts), and prefer
// uncontrolled demos; reach for local useState only when a prop is controlled.

import { Bell, Check, Plus, Star } from "lucide-react";
import { Avatar } from "../../components/primitives/Avatar/Avatar";
import { Badge } from "../../components/primitives/Badge/Badge";
import { Button } from "../../components/primitives/Button/Button";
import { Icon } from "../../components/primitives/Icon/Icon";
import { Skeleton } from "../../components/primitives/Skeleton/Skeleton";
import { Spinner } from "../../components/primitives/Spinner/Spinner";
import { Tag } from "../../components/primitives/Tag/Tag";
import { Text } from "../../components/primitives/Text/Text";
import { Spec, SpecItem, SpecRow } from "../Spec";

export function PrimitivesSpecimens() {
	return (
		<>
			<Spec
				name="Button"
				description="The primary action trigger. Seven variants, three sizes, plus loading, disabled, and icon affordances."
			>
				<SpecRow label="Variants">
					<SpecItem label="default">
						<Button>Default</Button>
					</SpecItem>
					<SpecItem label="primary">
						<Button variant="primary">Primary</Button>
					</SpecItem>
					<SpecItem label="secondary">
						<Button variant="secondary">Secondary</Button>
					</SpecItem>
					<SpecItem label="accent">
						<Button variant="accent">Accent</Button>
					</SpecItem>
					<SpecItem label="ghost">
						<Button variant="ghost">Ghost</Button>
					</SpecItem>
					<SpecItem label="outline">
						<Button variant="outline">Outline</Button>
					</SpecItem>
					<SpecItem label="destructive">
						<Button variant="destructive">Destructive</Button>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<Button variant="primary" size="sm">
							Small
						</Button>
					</SpecItem>
					<SpecItem label="md">
						<Button variant="primary" size="md">
							Medium
						</Button>
					</SpecItem>
					<SpecItem label="lg">
						<Button variant="primary" size="lg">
							Large
						</Button>
					</SpecItem>
				</SpecRow>
				<SpecRow label="States">
					<SpecItem label="leftIcon">
						<Button variant="primary" leftIcon={<Plus />}>
							New
						</Button>
					</SpecItem>
					<SpecItem label="loading">
						<Button variant="primary" isLoading>
							Saving
						</Button>
					</SpecItem>
					<SpecItem label="disabled">
						<Button variant="primary" disabled>
							Disabled
						</Button>
					</SpecItem>
					<SpecItem label="iconOnly">
						<Button variant="outline" isIconOnly aria-label="Notifications">
							<Bell />
						</Button>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Badge"
				description="Compact status and count labels in eight variants and three sizes."
			>
				<SpecRow label="Variants">
					<SpecItem label="default">
						<Badge>Default</Badge>
					</SpecItem>
					<SpecItem label="primary">
						<Badge variant="primary">Primary</Badge>
					</SpecItem>
					<SpecItem label="secondary">
						<Badge variant="secondary">Secondary</Badge>
					</SpecItem>
					<SpecItem label="accent">
						<Badge variant="accent">Accent</Badge>
					</SpecItem>
					<SpecItem label="success">
						<Badge variant="success">Success</Badge>
					</SpecItem>
					<SpecItem label="warning">
						<Badge variant="warning">Warning</Badge>
					</SpecItem>
					<SpecItem label="error">
						<Badge variant="error">Error</Badge>
					</SpecItem>
					<SpecItem label="outline">
						<Badge variant="outline">Outline</Badge>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Sizes">
					<SpecItem label="sm">
						<Badge variant="primary" size="sm">
							Small
						</Badge>
					</SpecItem>
					<SpecItem label="md">
						<Badge variant="primary" size="md">
							Medium
						</Badge>
					</SpecItem>
					<SpecItem label="lg">
						<Badge variant="primary" size="lg">
							Large
						</Badge>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="dot">
						<Badge variant="success" dot>
							Online
						</Badge>
					</SpecItem>
					<SpecItem label="leftIcon">
						<Badge variant="primary" leftIcon={<Check />}>
							Verified
						</Badge>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Tag"
				description="Removable, selectable labels for filters and metadata. Seven variants, three sizes."
			>
				<SpecRow label="Variants">
					<SpecItem label="default">
						<Tag>Default</Tag>
					</SpecItem>
					<SpecItem label="primary">
						<Tag variant="primary">Primary</Tag>
					</SpecItem>
					<SpecItem label="secondary">
						<Tag variant="secondary">Secondary</Tag>
					</SpecItem>
					<SpecItem label="success">
						<Tag variant="success">Success</Tag>
					</SpecItem>
					<SpecItem label="warning">
						<Tag variant="warning">Warning</Tag>
					</SpecItem>
					<SpecItem label="error">
						<Tag variant="error">Error</Tag>
					</SpecItem>
					<SpecItem label="info">
						<Tag variant="info">Info</Tag>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Options">
					<SpecItem label="leftIcon">
						<Tag variant="primary" leftIcon={<Star />}>
							Starred
						</Tag>
					</SpecItem>
					<SpecItem label="removable">
						<Tag variant="primary" removable>
							Dismissible
						</Tag>
					</SpecItem>
					<SpecItem label="selectable">
						<Tag selectable defaultSelected>
							Selected
						</Tag>
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Avatar"
				description="User imagery or initials across six sizes and three shapes."
			>
				<SpecRow label="Sizes">
					<SpecItem label="xs">
						<Avatar initials="JD" size="xs" />
					</SpecItem>
					<SpecItem label="sm">
						<Avatar initials="JD" size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<Avatar initials="JD" size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<Avatar initials="JD" size="lg" />
					</SpecItem>
					<SpecItem label="xl">
						<Avatar initials="JD" size="xl" />
					</SpecItem>
					<SpecItem label="2xl">
						<Avatar initials="JD" size="2xl" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Shapes">
					<SpecItem label="circle">
						<Avatar initials="AB" size="lg" variant="circle" />
					</SpecItem>
					<SpecItem label="rounded">
						<Avatar initials="AB" size="lg" variant="rounded" />
					</SpecItem>
					<SpecItem label="square">
						<Avatar initials="AB" size="lg" variant="square" />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Icon"
				description="Lucide icons normalized to the token size and color scale."
			>
				<SpecRow label="Sizes">
					<SpecItem label="xs">
						<Icon icon={Star} size="xs" />
					</SpecItem>
					<SpecItem label="sm">
						<Icon icon={Star} size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<Icon icon={Star} size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<Icon icon={Star} size="lg" />
					</SpecItem>
					<SpecItem label="xl">
						<Icon icon={Star} size="xl" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Colors">
					<SpecItem label="default">
						<Icon icon={Bell} size="lg" color="default" />
					</SpecItem>
					<SpecItem label="muted">
						<Icon icon={Bell} size="lg" color="muted" />
					</SpecItem>
					<SpecItem label="primary">
						<Icon icon={Bell} size="lg" color="primary" />
					</SpecItem>
					<SpecItem label="success">
						<Icon icon={Bell} size="lg" color="success" />
					</SpecItem>
					<SpecItem label="error">
						<Icon icon={Bell} size="lg" color="error" />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Spinner"
				description="Indeterminate loading indicator in five sizes and color variants."
			>
				<SpecRow label="Sizes">
					<SpecItem label="xs">
						<Spinner size="xs" />
					</SpecItem>
					<SpecItem label="sm">
						<Spinner size="sm" />
					</SpecItem>
					<SpecItem label="md">
						<Spinner size="md" />
					</SpecItem>
					<SpecItem label="lg">
						<Spinner size="lg" />
					</SpecItem>
					<SpecItem label="xl">
						<Spinner size="xl" />
					</SpecItem>
				</SpecRow>
				<SpecRow label="Variants">
					<SpecItem label="default">
						<Spinner size="lg" variant="default" />
					</SpecItem>
					<SpecItem label="primary">
						<Spinner size="lg" variant="primary" />
					</SpecItem>
					<SpecItem label="secondary">
						<Spinner size="lg" variant="secondary" />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Skeleton"
				description="Content-shaped placeholders for loading states."
			>
				<SpecRow label="Variants">
					<SpecItem label="text">
						<Skeleton variant="text" width={160} />
					</SpecItem>
					<SpecItem label="circular">
						<Skeleton variant="circular" width={44} height={44} />
					</SpecItem>
					<SpecItem label="rounded">
						<Skeleton variant="rounded" width={160} height={44} />
					</SpecItem>
					<SpecItem label="rectangular">
						<Skeleton variant="rectangular" width={160} height={44} />
					</SpecItem>
				</SpecRow>
			</Spec>

			<Spec
				name="Text"
				description="Typographic primitive with size, weight, and semantic color props."
			>
				<SpecRow label="Sizes" column>
					<Text size="3xl">Display 3xl</Text>
					<Text size="xl">Heading xl</Text>
					<Text size="md">
						Body md — the quick brown fox jumps over the lazy dog.
					</Text>
					<Text size="sm">Small sm — secondary supporting copy.</Text>
				</SpecRow>
				<SpecRow label="Weights">
					<SpecItem label="normal">
						<Text weight="normal">Regular</Text>
					</SpecItem>
					<SpecItem label="medium">
						<Text weight="medium">Medium</Text>
					</SpecItem>
					<SpecItem label="semibold">
						<Text weight="semibold">Semibold</Text>
					</SpecItem>
					<SpecItem label="bold">
						<Text weight="bold">Bold</Text>
					</SpecItem>
				</SpecRow>
				<SpecRow label="Colors">
					<SpecItem label="default">
						<Text color="default">Default</Text>
					</SpecItem>
					<SpecItem label="muted">
						<Text color="muted">Muted</Text>
					</SpecItem>
					<SpecItem label="primary">
						<Text color="primary">Primary</Text>
					</SpecItem>
					<SpecItem label="success">
						<Text color="success">Success</Text>
					</SpecItem>
					<SpecItem label="error">
						<Text color="error">Error</Text>
					</SpecItem>
				</SpecRow>
			</Spec>
		</>
	);
}
