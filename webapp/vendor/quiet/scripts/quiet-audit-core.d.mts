import type { Page } from "@playwright/test";

export type Rule = "spacing" | "type" | "radius" | "colour" | "derived" | "structure" | "overflow";
export interface Finding {
	rule: Rule;
	/** Nearest quiet BEM block (`q-card`), "<block> (inside)" for its children, or "page". */
	owner: string;
	value: string;
	example: string;
}
export interface AuditResult {
	findings: Finding[];
	/** Number of --q-* custom properties found in the page's stylesheets. */
	tokens: number;
}
export interface Group {
	owner: string;
	value: string;
	count: number;
	example: string;
}
export const RULES: Rule[];
export function auditInPage(opts?: { requireH1?: boolean }): AuditResult;
export function group(findings: Finding[]): Partial<Record<Rule, Group[]>>;
export function counts(findings: Finding[]): Record<Rule, number>;
export function auditUrl(
	page: Page,
	url: string,
	opts?: { width?: number; theme?: string; requireH1?: boolean },
): Promise<AuditResult>;
export function updatingBaseline(): boolean;
export function writeBaseline(path: string, data: unknown): Promise<void>;
