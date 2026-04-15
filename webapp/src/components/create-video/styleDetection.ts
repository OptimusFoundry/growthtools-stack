const STYLE_KEYWORDS: Record<string, string[]> = {
	"minimalist-premium": [
		"apple",
		"premium",
		"minimal",
		"clean",
		"simple",
		"elegant",
		"modern",
	],
	"high-energy-athletic": [
		"athletic",
		"sport",
		"fitness",
		"gym",
		"workout",
		"energy",
		"power",
	],
	"warm-lifestyle": [
		"lifestyle",
		"home",
		"family",
		"cozy",
		"warm",
		"organic",
		"natural",
		"food",
	],
	"tech-saas": [
		"saas",
		"software",
		"api",
		"developer",
		"startup",
		"app",
		"platform",
		"dashboard",
		"ai",
		"tech",
	],
	"bold-sale": [
		"sale",
		"discount",
		"offer",
		"deal",
		"promo",
		"flash",
		"limited",
		"save",
		"clearance",
	],
	"cinematic-brand": [
		"cinematic",
		"film",
		"movie",
		"dramatic",
		"epic",
		"storytelling",
	],
	"retro-vintage": [
		"retro",
		"vintage",
		"80s",
		"90s",
		"70s",
		"throwback",
		"nostalgic",
	],
	"neon-cyberpunk": [
		"neon",
		"cyberpunk",
		"glitch",
		"futuristic",
		"cyber",
		"synthwave",
		"glow",
	],
	"pastel-soft": [
		"pastel",
		"soft",
		"wellness",
		"calm",
		"meditation",
		"yoga",
		"spa",
		"gentle",
	],
	"corporate-b2b": [
		"corporate",
		"b2b",
		"enterprise",
		"business",
		"professional",
		"consulting",
	],
	"playful-fun": [
		"playful",
		"fun",
		"kids",
		"party",
		"birthday",
		"celebration",
		"colorful",
	],
	"luxury-fashion": [
		"luxury",
		"fashion",
		"couture",
		"designer",
		"jewelry",
		"watch",
		"bespoke",
	],
	"editorial-magazine": [
		"editorial",
		"magazine",
		"press",
		"article",
		"news",
		"publication",
	],
	"ecommerce-product": [
		"product",
		"ecommerce",
		"shop",
		"buy",
		"store",
		"collection",
	],
	glassmorphism: [
		"glassmorphism",
		"glass",
		"frosted",
		"mesh gradient",
		"modern ui",
	],
	"announcement-launch": [
		"launch",
		"announce",
		"reveal",
		"introducing",
		"coming soon",
	],
};

export function detectStyleFromPrompt(prompt: string): string | null {
	if (!prompt || prompt.length < 5) return null;

	const lower = prompt.toLowerCase();
	let bestMatch: string | null = null;
	let bestCount = 0;

	for (const [slug, keywords] of Object.entries(STYLE_KEYWORDS)) {
		let count = 0;
		for (const kw of keywords) {
			if (lower.includes(kw)) count++;
		}
		if (count > bestCount) {
			bestCount = count;
			bestMatch = slug;
		}
	}

	return bestCount > 0 ? bestMatch : null;
}
