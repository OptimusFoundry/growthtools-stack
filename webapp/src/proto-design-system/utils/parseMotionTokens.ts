// Reads the live --duration-*/--ease-*/--spring-* custom properties off
// document.documentElement and parses them into the shapes motion/react
// actually consumes (seconds, not ms; cubic-bezier arrays, not CSS strings).
// This is what lets a theme's motion personality (set purely in CSS, per
// theme file) reach JS-driven animations, not just CSS transitions — see
// MotionProvider.tsx for how this gets re-read on theme change.

export type Easing = [number, number, number, number] | "linear";

export interface SpringTokens {
	stiffness: number;
	damping: number;
	mass: number;
}

export interface MotionTokens {
	duration: {
		fastest: number;
		faster: number;
		fast: number;
		normal: number;
		slow: number;
		slower: number;
		slowest: number;
		enter: number;
		exit: number;
		complex: number;
		page: number;
	};
	easeOut: Easing;
	easeInOut: Easing;
	easeBounce: Easing;
	easeElastic: Easing;
	spring: {
		bouncy: SpringTokens;
		gentle: SpringTokens;
		wobbly: SpringTokens;
		stiff: SpringTokens;
		slow: SpringTokens;
	};
}

// Static fallback — the house-default (light theme) values, used before the
// DOM is available (SSR) or if a custom property is missing/malformed. Kept
// in sync with tokens/_motion.scss's :root defaults by convention; if those
// ever drift this is only ever a fallback, never the live value in a browser.
export const FALLBACK_MOTION_TOKENS: MotionTokens = {
	duration: {
		fastest: 0.05,
		faster: 0.1,
		fast: 0.15,
		normal: 0.24,
		slow: 0.4,
		slower: 0.5,
		slowest: 0.7,
		enter: 0.28,
		exit: 0.22,
		complex: 0.6,
		page: 0.35,
	},
	easeOut: [0.22, 1, 0.36, 1],
	easeInOut: [0.4, 0, 0.2, 1],
	easeBounce: [0.34, 1.56, 0.64, 1],
	easeElastic: [0.68, -0.55, 0.265, 1.55],
	spring: {
		bouncy: { stiffness: 300, damping: 10, mass: 1 },
		gentle: { stiffness: 120, damping: 14, mass: 1 },
		wobbly: { stiffness: 180, damping: 12, mass: 1 },
		stiff: { stiffness: 400, damping: 30, mass: 1 },
		slow: { stiffness: 100, damping: 20, mass: 1 },
	},
};

function parseDurationSeconds(raw: string, fallback: number): number {
	const trimmed = raw.trim();
	if (trimmed.endsWith("ms")) {
		const n = Number.parseFloat(trimmed);
		return Number.isFinite(n) ? n / 1000 : fallback;
	}
	if (trimmed.endsWith("s")) {
		const n = Number.parseFloat(trimmed);
		return Number.isFinite(n) ? n : fallback;
	}
	return fallback;
}

function parseEasing(raw: string, fallback: Easing): Easing {
	const trimmed = raw.trim();
	if (trimmed === "linear") return "linear";
	const match = trimmed.match(
		/cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/,
	);
	if (!match) return fallback;
	const nums = match.slice(1).map(Number);
	if (nums.some((n) => !Number.isFinite(n))) return fallback;
	return nums as unknown as Easing;
}

function parseSpring(raw: string, fallback: SpringTokens): SpringTokens {
	const parts = raw
		.trim()
		.split(",")
		.map((p) => Number.parseFloat(p.trim()));
	if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
		return fallback;
	}
	const [stiffness, damping, mass] = parts;
	return { stiffness, damping, mass };
}

/** Reads the current (theme-scoped) motion tokens live off the DOM. Call
 * this again whenever the active theme changes — computed styles resolve
 * per data-theme, so the same custom property name yields different values
 * once a theme overrides it. */
export function readMotionTokensFromDOM(): MotionTokens {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return FALLBACK_MOTION_TOKENS;
	}

	const style = getComputedStyle(document.documentElement);
	const get = (name: string) => style.getPropertyValue(name);
	const f = FALLBACK_MOTION_TOKENS;

	return {
		duration: {
			fastest: parseDurationSeconds(
				get("--duration-fastest"),
				f.duration.fastest,
			),
			faster: parseDurationSeconds(get("--duration-faster"), f.duration.faster),
			fast: parseDurationSeconds(get("--duration-fast"), f.duration.fast),
			normal: parseDurationSeconds(get("--duration-normal"), f.duration.normal),
			slow: parseDurationSeconds(get("--duration-slow"), f.duration.slow),
			slower: parseDurationSeconds(get("--duration-slower"), f.duration.slower),
			slowest: parseDurationSeconds(
				get("--duration-slowest"),
				f.duration.slowest,
			),
			enter: parseDurationSeconds(get("--duration-enter"), f.duration.enter),
			exit: parseDurationSeconds(get("--duration-exit"), f.duration.exit),
			complex: parseDurationSeconds(
				get("--duration-complex"),
				f.duration.complex,
			),
			page: parseDurationSeconds(get("--duration-page"), f.duration.page),
		},
		easeOut: parseEasing(get("--ease-out"), f.easeOut),
		easeInOut: parseEasing(get("--ease-in-out"), f.easeInOut),
		easeBounce: parseEasing(get("--ease-bounce"), f.easeBounce),
		easeElastic: parseEasing(get("--ease-elastic"), f.easeElastic),
		spring: {
			bouncy: parseSpring(get("--spring-bouncy"), f.spring.bouncy),
			gentle: parseSpring(get("--spring-gentle"), f.spring.gentle),
			wobbly: parseSpring(get("--spring-wobbly"), f.spring.wobbly),
			stiff: parseSpring(get("--spring-stiff"), f.spring.stiff),
			slow: parseSpring(get("--spring-slow"), f.spring.slow),
		},
	};
}
