import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
	| "default"
	| "primary"
	| "secondary"
	| "ghost"
	| "outline"
	| "destructive";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	/**
	 * Visual style variant
	 * @default "default"
	 */
	variant?: ButtonVariant;

	/**
	 * Size of the button
	 * @default "md"
	 */
	size?: ButtonSize;

	/**
	 * Shows loading spinner and disables interaction
	 * @default false
	 */
	isLoading?: boolean;

	/**
	 * Makes button take full width of container
	 * @default false
	 */
	isFullWidth?: boolean;

	/**
	 * Renders button as icon-only (square aspect ratio)
	 * @default false
	 */
	isIconOnly?: boolean;

	/**
	 * Icon to display before button text
	 */
	leftIcon?: ReactNode;

	/**
	 * Icon to display after button text
	 */
	rightIcon?: ReactNode;

	/**
	 * Button content
	 */
	children?: ReactNode;
}
