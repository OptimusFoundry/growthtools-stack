/**
 * Settings API handlers
 */
import { setupEndpoint } from "../helpers/endpoint";
import { voiceProfile } from "../mocks/data";

export const settingsEndpoints = {
	getVoice: setupEndpoint(
		"GET",
		"*/api/protected/settings/voice",
		voiceProfile,
	),
	updateVoice: setupEndpoint(
		"PUT",
		"*/api/protected/settings/voice",
		voiceProfile,
	),
};

export const settingsHandlers = Object.values(settingsEndpoints).map((e) =>
	e[200](),
);
