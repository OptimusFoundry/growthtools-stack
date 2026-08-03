/**
 * Showcase Post API Types
 *
 * API response types for showcase post jobs (snake_case, matches Go JSON tags)
 */

export interface ApiShowcaseJob {
	job_id: string;
	status: string;
}
