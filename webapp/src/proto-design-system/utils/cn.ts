import { type ClassValue, clsx } from "clsx";

/**
 * Utility for constructing className strings conditionally.
 * Combines clsx for conditional classes.
 *
 * @example
 * cn("base-class", isActive && "active", { "conditional": condition })
 */
export function cn(...inputs: ClassValue[]): string {
	return clsx(inputs);
}
