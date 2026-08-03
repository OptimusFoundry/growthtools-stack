import type { ShowcaseJob } from "@/types/showcasePost";
import type { ApiShowcaseJob } from "../types/showcasePost";

export function toShowcaseJob(api: ApiShowcaseJob): ShowcaseJob {
	return {
		jobId: api.job_id,
		// wire status is a free-form string; narrow to the literal the UI expects
		status: api.status as ShowcaseJob["status"],
	};
}
