import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../../utils/cn";
import styles from "./EmptyState.module.scss";

export type EmptyStateSize = "sm" | "md" | "lg";

export interface EmptyStateProps {
	/** Icon to display */
	icon?: ReactNode;
	/** Title text */
	title: string;
	/** Description text */
	description?: string;
	/** Action buttons/links */
	action?: ReactNode;
	/** Secondary action */
	secondaryAction?: ReactNode;
	/** Size variant */
	size?: EmptyStateSize;
	/** Additional className */
	className?: string;
}

/**
 * EmptyState component for displaying when there's no data.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<Inbox />}
 *   title="No messages"
 *   description="You don't have any messages yet."
 *   action={<Button>Compose</Button>}
 * />
 * ```
 */
export function EmptyState({
	icon = <Inbox />,
	title,
	description,
	action,
	secondaryAction,
	size = "md",
	className,
}: EmptyStateProps) {
	return (
		<div className={cn(styles.emptyState, styles[`size-${size}`], className)}>
			{icon && <div className={styles.icon}>{icon}</div>}
			<div className={styles.content}>
				<h3 className={styles.title}>{title}</h3>
				{description && <p className={styles.description}>{description}</p>}
			</div>
			{(action || secondaryAction) && (
				<div className={styles.actions}>
					{action}
					{secondaryAction}
				</div>
			)}
		</div>
	);
}

EmptyState.displayName = "EmptyState";
